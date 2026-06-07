import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { GeneratedPlan } from '@/data/program';
import { FearAxis } from '@/data/questions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, email, username, typeId, plan, diagSession } = body;

    const sb = getSupabaseServer();
    if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

    // diagnosticsから スコア・オンボ・生成済みプラン を取得
    let fearScores: Record<FearAxis, number> | null = null;
    let defenseScores = null;
    let generatedPlan: GeneratedPlan | null = null;
    let onboarding: Record<string, string> = {};
    if (diagSession) {
      const { data } = await sb
        .from('diagnostics')
        .select('fear_scores, defense_scores, generated_plan, onboarding')
        .eq('session_id', diagSession)
        .single();
      if (data) {
        fearScores = data.fear_scores;
        defenseScores = data.defense_scores;
        generatedPlan = data.generated_plan;
        onboarding = data.onboarding ?? {};
      }
      // フル生成はダッシュボード初回起動時にバックグラウンドで実行するため、ここでは行わない
    }

    // 生成済みプランに userId を埋める
    if (generatedPlan?.config && id) {
      generatedPlan.config.userId = id;
    }

    const { error } = await sb.from('users').upsert({
      id,
      email,
      username,
      type_id: typeId,
      lifestyle: onboarding.lifestyle ?? null,
      daily_time: onboarding.dailyTime ?? null,
      best_timing: onboarding.bestTiming ?? null,
      distress_level: onboarding.distressLevel ?? null,
      difficult_scene: onboarding.difficultScene ?? null,
      difficult_detail: onboarding.difficultDetail ?? null,
      difficult_free_text: onboarding.difficultFreeText ?? null,
      change_orientation: onboarding.changeOrientation ?? null,
      diag_session: diagSession ?? null,
      paid_plan: plan,
      paid_at: new Date().toISOString(),
      fear_scores: fearScores,
      defense_scores: defenseScores,
      program_config: generatedPlan?.config ?? null,
      generated_plan: generatedPlan,
    }, { onConflict: 'email' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
