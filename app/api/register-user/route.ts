import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { buildProgramConfig, distressStringToNumber } from '@/lib/blending';
import { ChangeOrientation } from '@/data/program';
import { FearAxis } from '@/data/questions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id, email, username, typeId,
      lifestyle, dailyTime, bestTiming, distressLevel, changeScene,
      difficultScene, changeOrientation,
      plan, diagSession,
    } = body;

    const sb = getSupabaseServer();
    if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

    // 診断スコアを取得
    let fearScores: Record<FearAxis, number> | null = null;
    let defenseScores = null;
    if (diagSession) {
      const { data } = await sb
        .from('diagnostics')
        .select('fear_scores, defense_scores')
        .eq('session_id', diagSession)
        .single();
      if (data) {
        fearScores = data.fear_scores;
        defenseScores = data.defense_scores;
      }
    }

    // 配合エンジンで ProgramConfig を生成
    let programConfig = null;
    if (fearScores && id) {
      const orientation: ChangeOrientation =
        changeOrientation === 'change' || changeOrientation === 'accept'
          ? changeOrientation
          : 'unknown';
      programConfig = buildProgramConfig({
        userId: id,
        fearScores,
        changeOrientation: orientation,
        distressLevel: distressStringToNumber(distressLevel ?? ''),
      });
    }

    const { error } = await sb.from('users').upsert({
      id,
      email,
      username,
      type_id: typeId,
      lifestyle,
      daily_time: dailyTime,
      best_timing: bestTiming,
      distress_level: distressLevel,
      change_scene: changeScene,
      difficult_scene: difficultScene ?? null,
      change_orientation: changeOrientation ?? null,
      paid_plan: plan,
      paid_at: new Date().toISOString(),
      fear_scores: fearScores,
      defense_scores: defenseScores,
      program_config: programConfig,
    }, { onConflict: 'email' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
