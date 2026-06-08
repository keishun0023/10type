import type { SupabaseClient } from '@supabase/supabase-js';
import { buildProgramConfig, distressStringToNumber } from '@/lib/blending';
import { buildSchedule, scheduleSkeleton } from '@/lib/schedule';
import { buildPreviewPrompt, buildComponentMissionsPrompt } from '@/lib/prompt';
import { callClaude, parseJSONFromText, isAIConfigured } from '@/lib/ai';
import { ChangeOrientation, ComponentId, GeneratedPlan, GeneratedMission, ScheduledDay } from '@/data/program';
import { FearAxis, DefenseAxis } from '@/data/questions';

// プレビュー（課金前）で先に作るミッション数。残りは課金後のフルで作る。
const PREVIEW_MISSION_DAYS = 8;

type PreviewAI = {
  userInsight: string;
  report: { currentState: string; drainScene: string; strengthReframe: string; direction: string };
  welcomeSteps: { title: string; body: string }[];
  previewMissions: { day: number; title: string; why: string }[];
};
type FullAI = {
  missions: { day: number; title: string; why: string }[];
};

export type GeneratePlanOpts = {
  sb: SupabaseClient;
  diagSession: string;
  typeId: string;
  onboarding?: Record<string, string>;
  phase: 'preview' | 'full';
};

export async function generatePlan(opts: GeneratePlanOpts): Promise<GeneratedPlan> {
  const { sb, diagSession, typeId, phase } = opts;

  const { data: existing } = await sb
    .from('diagnostics')
    .select('generated_plan, fear_scores, defense_scores, onboarding')
    .eq('session_id', diagSession)
    .single();

  const existingPlan = existing?.generated_plan as GeneratedPlan | undefined;
  const onboarding = opts.onboarding ?? (existing?.onboarding as Record<string, string>) ?? {};

  // onboardingが渡されたら常に diagnostics に保存（キャッシュヒット時も）
  if (opts.onboarding && Object.keys(opts.onboarding).length > 0) {
    await sb.from('diagnostics').update({ onboarding }).eq('session_id', diagSession);
  }

  // キャッシュ：AI未設定 or レポートに中身があるプランのみ返す。空reportは再生成する。
  if (phase === 'preview' && existingPlan) {
    if (!isAIConfigured() || existingPlan.report?.currentState) return existingPlan;
  }
  if (phase === 'full' && existingPlan?.phase === 'full') return existingPlan;

  const fearScores = existing?.fear_scores as Record<FearAxis, number> | undefined;
  const defenseScores = (existing?.defense_scores as Record<DefenseAxis, number> | undefined) ?? null;

  // プレビュー生成にはfearScores必須。フルはexistingPlanのconfigを再利用できる。
  if (!fearScores && phase === 'preview') throw new Error('diagnostics not found');

  // 配合エンジン（決定論）。フルはexistingPlanにconfigが入っていればそれを再利用。
  const ORIENTATION_MAP: Record<string, ChangeOrientation> = {
    'change': 'change',
    'accept': 'accept',
    '変わりたい・できるようになりたい': 'change',
    '今の自分を受け入れて、楽になりたい': 'accept',
  };
  const orientation: ChangeOrientation = ORIENTATION_MAP[onboarding?.changeOrientation ?? ''] ?? 'unknown';
  const config = existingPlan?.config ?? (fearScores ? buildProgramConfig({
    userId: '',
    fearScores,
    changeOrientation: orientation,
    distressLevel: distressStringToNumber(onboarding?.distressLevel ?? ''),
  }) : null);
  if (!config) throw new Error('diagnostics not found');
  const safeConfig = config;

  // 30日の地図（決定論）
  const schedule: ScheduledDay[] = buildSchedule(safeConfig, onboarding?.dailyTime ?? '');
  const skeleton = scheduleSkeleton(schedule);

  // AI文面（とフォールバックの骨格）を day番号でマージ。優先：AIフル > ベース(プレビュー) > 骨格
  function mergeMissions(
    aiByDay: Map<number, { title: string; why: string }>,
    base?: GeneratedMission[],
  ): GeneratedMission[] {
    const baseByDay = new Map((base ?? []).map(m => [m.day, m]));
    return schedule.map(d => {
      const sk = skeleton.find(s => s.day === d.day)!;
      const ai = aiByDay.get(d.day);
      const b = baseByDay.get(d.day);
      return {
        ...d,
        title: ai?.title || b?.title || sk.skeletonTitle,
        why: ai?.why || b?.why || sk.skeletonWhy,
      };
    });
  }

  async function persist(plan: GeneratedPlan): Promise<GeneratedPlan> {
    await sb.from('diagnostics').update({ generated_plan: plan, onboarding }).eq('session_id', diagSession);
    return plan;
  }

  // ── プレビュー生成 ──
  async function runPreview(): Promise<GeneratedPlan> {
    if (!isAIConfigured()) {
      return persist({
        userInsight: '',
        report: { currentState: '', drainScene: '', strengthReframe: '', direction: '' },
        welcomeSteps: [],
        missions: mergeMissions(new Map()),
        config: safeConfig,
        generatedAt: new Date().toISOString(),
        phase: 'preview',
      });
    }
    const { system, user } = buildPreviewPrompt({
      typeId: typeId || 'distancer',
      fearScores: fearScores!,
      defenseScores,
      config: safeConfig,
      onboarding,
      schedule: skeleton.slice(0, PREVIEW_MISSION_DAYS),
    });
    const raw = await callClaude({ system, user, maxTokens: 3000, temperature: 0.7 });
    const ai = parseJSONFromText<PreviewAI>(raw);
    const aiByDay = new Map((ai.previewMissions ?? []).map(m => [m.day, m]));
    return persist({
      userInsight: ai.userInsight ?? '',
      report: ai.report,
      welcomeSteps: ai.welcomeSteps ?? [],
      missions: mergeMissions(aiByDay),
      config: safeConfig,
      generatedAt: new Date().toISOString(),
      phase: 'preview',
    });
  }

  // ── フル生成（部品＝恐れ×kind ごとに、その部品が担当する全日をまとめて生成）──
  // 30日を日付順に通しで作るのではなく、部品単位（単一kind）でまとめて作ることで、
  // 認知の日に行動文が混ざる・隣の日のコピーが起きる、という生成ブレを構造的に防ぐ。
  // プレビューの仮ミッションも含め、全30日を作り直す。
  async function runFull(base: GeneratedPlan): Promise<GeneratedPlan> {
    if (!isAIConfigured()) {
      return persist({
        ...base,
        missions: mergeMissions(new Map(), base.missions),
        config: safeConfig,
        generatedAt: new Date().toISOString(),
        phase: 'full',
      });
    }

    // 30日の地図を部品ごとにまとめる
    const byComponent = new Map<ComponentId, typeof skeleton>();
    for (const s of skeleton) {
      const arr = byComponent.get(s.componentId) ?? [];
      arr.push(s);
      byComponent.set(s.componentId, arr);
    }

    // 部品ごとに並列でAI生成（各バッチは単一kind）
    const results = await Promise.all(
      [...byComponent.entries()].map(async ([componentId, days]) => {
        const { system, user } = buildComponentMissionsPrompt({
          typeId: typeId || 'distancer',
          fearScores: fearScores!,
          defenseScores,
          config: safeConfig,
          onboarding,
          schedule: days,
          userInsight: base.userInsight ?? '',
          report: base.report,
          componentId,
        });
        const raw = await callClaude({ system, user, maxTokens: 4000, temperature: 0.7 });
        const ai = parseJSONFromText<FullAI>(raw);
        return ai.missions ?? [];
      })
    );

    const aiByDay = new Map<number, { day: number; title: string; why: string }>();
    for (const arr of results) for (const m of arr) aiByDay.set(m.day, m);

    return persist({
      userInsight: base.userInsight ?? '',
      report: base.report,
      welcomeSteps: base.welcomeSteps ?? [],
      missions: mergeMissions(aiByDay, base.missions),
      config: safeConfig,
      generatedAt: new Date().toISOString(),
      phase: 'full',
    });
  }

  if (phase === 'preview') return runPreview();

  // full：土台（プレビュー）が無い／レポート未生成なら先にプレビューを作る
  let base = existingPlan;
  if (!base || (isAIConfigured() && !base.report?.currentState)) {
    base = await runPreview();
  }
  return runFull(base);
}
