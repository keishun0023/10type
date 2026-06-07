import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { generatePlan } from '@/lib/generatePlan';

export const maxDuration = 300; // AI生成に時間がかかるため（Vercel Pro想定。Hobbyは60秒上限にクランプされる）

export async function POST(req: NextRequest) {
  try {
    const { diagSession, typeId, onboarding, phase } = await req.json();
    if (!diagSession) return NextResponse.json({ error: 'diagSession required' }, { status: 400 });

    const sb = getSupabaseServer();
    if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

    const plan = await generatePlan({
      sb,
      diagSession,
      typeId: typeId || 'distancer',
      onboarding,
      phase: phase === 'full' ? 'full' : 'preview',
    });

    return NextResponse.json({ plan });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
