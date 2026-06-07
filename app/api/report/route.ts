import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

  const { data, error } = await sb
    .from('diagnostics')
    .select('first_type_name, second_type_name, fear_scores, defense_scores, distress_total, reaction_fit, reaction_want')
    .eq('report_token', token)
    .single();

  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

  const { reaction_fit, reaction_want } = await req.json();

  const { error } = await sb
    .from('diagnostics')
    .update({ reaction_fit, reaction_want })
    .eq('report_token', token);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
