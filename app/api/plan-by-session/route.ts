import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

// 課金後のプラン生成完了をポーリングするための軽量エンドポイント。
// 生成はトリガーしない（読み取りのみ）。
export async function POST(req: NextRequest) {
  try {
    const { diagSession } = await req.json();
    if (!diagSession) return NextResponse.json({ error: 'diagSession required' }, { status: 400 });

    const sb = getSupabaseServer();
    if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

    const { data } = await sb
      .from('diagnostics')
      .select('generated_plan')
      .eq('session_id', diagSession)
      .single();

    return NextResponse.json({ plan: data?.generated_plan ?? null });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
