import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const session = req.nextUrl.searchParams.get('session');
  if (!session) return NextResponse.json({ error: 'session required' }, { status: 400 });

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

  const { data, error } = await sb
    .from('diagnostics')
    .select('fear_scores, defense_scores')
    .eq('session_id', session)
    .single();

  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json(data);
}
