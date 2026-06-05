import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, email, username, typeId, lifestyle, dailyTime, bestTiming, distressLevel, changeScene, plan, diagSession } = body;

    const sb = getSupabaseServer();
    if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

    // 診断スコアを取得
    let fearScores = null;
    let defenseScores = null;
    if (diagSession) {
      const { data } = await sb.from('diagnostics').select('fear_scores, defense_scores').eq('session_id', diagSession).single();
      if (data) { fearScores = data.fear_scores; defenseScores = data.defense_scores; }
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
      paid_plan: plan,
      paid_at: new Date().toISOString(),
      fear_scores: fearScores,
      defense_scores: defenseScores,
    }, { onConflict: 'email' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
