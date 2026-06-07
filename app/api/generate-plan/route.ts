import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { buildProgramConfig, distressStringToNumber } from '@/lib/blending';
import { buildSchedule, scheduleSkeleton } from '@/lib/schedule';
import { buildPlanPrompt } from '@/lib/prompt';
import { callClaude, parseJSONFromText, isAIConfigured } from '@/lib/ai';
import { ChangeOrientation, GeneratedPlan, GeneratedMission, ScheduledDay } from '@/data/program';
import { FearAxis } from '@/data/questions';

export const maxDuration = 300; // AI生成に時間がかかるため（Vercel Pro想定。Hobbyは60秒上限にクランプされる）

type AIResult = {
  report: { currentState: string; drainScene: string; strengthReframe: string; direction: string };
  welcomeSteps: { title: string; body: string }[];
  missions: { day: number; title: string; why: string }[];
};

export async function POST(req: NextRequest) {
  try {
    const { diagSession, typeId, onboarding } = await req.json();
    if (!diagSession) return NextResponse.json({ error: 'diagSession required' }, { status: 400 });

    const sb = getSupabaseServer();
    if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

    // 既に生成済みなら返す（diagSessionキャッシュ）
    const { data: existing } = await sb
      .from('diagnostics')
      .select('generated_plan, fear_scores')
      .eq('session_id', diagSession)
      .single();

    if (existing?.generated_plan) {
      return NextResponse.json({ plan: existing.generated_plan, cached: true });
    }

    const fearScores = existing?.fear_scores as Record<FearAxis, number> | undefined;
    if (!fearScores) return NextResponse.json({ error: 'diagnostics not found' }, { status: 404 });

    // 配合エンジン（決定論）
    const orientation: ChangeOrientation =
      onboarding?.changeOrientation === 'change' || onboarding?.changeOrientation === 'accept'
        ? onboarding.changeOrientation
        : 'unknown';
    const config = buildProgramConfig({
      userId: '',
      fearScores,
      changeOrientation: orientation,
      distressLevel: distressStringToNumber(onboarding?.distressLevel ?? ''),
    });

    // 30日の地図（決定論）
    const schedule: ScheduledDay[] = buildSchedule(config, onboarding?.dailyTime ?? '');
    const skeleton = scheduleSkeleton(schedule);

    // AIで文面を個別化
    let plan: GeneratedPlan;
    if (isAIConfigured()) {
      const { system, user } = buildPlanPrompt({
        typeId: typeId || 'distancer',
        fearScores,
        config,
        onboarding: onboarding ?? {},
        schedule: skeleton,
      });
      const raw = await callClaude({ system, user, maxTokens: 8000, temperature: 0.7 });
      const ai = parseJSONFromText<AIResult>(raw);

      const aiByDay = new Map(ai.missions.map(m => [m.day, m]));
      const missions: GeneratedMission[] = schedule.map(d => {
        const m = aiByDay.get(d.day);
        const sk = skeleton.find(s => s.day === d.day)!;
        return {
          ...d,
          title: m?.title || sk.skeletonTitle,
          why: m?.why || sk.skeletonWhy,
        };
      });

      plan = {
        report: ai.report,
        welcomeSteps: ai.welcomeSteps,
        missions,
        config,
        generatedAt: new Date().toISOString(),
      };
    } else {
      // AI未設定時は骨格そのままでフォールバック
      const missions: GeneratedMission[] = skeleton.map(d => ({
        day: d.day,
        componentId: d.componentId as GeneratedMission['componentId'],
        kind: d.kind as GeneratedMission['kind'],
        lv: d.lv as GeneratedMission['lv'],
        heavy: d.heavy,
        title: d.skeletonTitle,
        why: d.skeletonWhy,
      }));
      plan = {
        report: { currentState: '', drainScene: '', strengthReframe: '', direction: '' },
        welcomeSteps: [],
        missions,
        config,
        generatedAt: new Date().toISOString(),
      };
    }

    // diagnosticsに保存（課金後にusersへコピー）
    await sb
      .from('diagnostics')
      .update({ generated_plan: plan, onboarding })
      .eq('session_id', diagSession);

    return NextResponse.json({ plan, cached: false });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
