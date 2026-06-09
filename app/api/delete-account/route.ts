import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

// アカウント削除：認証ユーザーと関連データ（users / daily_logs / footprint_cache）を削除する。
// service_role でしか auth ユーザーは消せないため、サーバー側で実行する。
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const sb = getSupabaseServer();
    if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

    // 関連データを先に削除（FKのcascade設定に依存しないよう明示的に消す）
    await sb.from('daily_logs').delete().eq('user_id', userId);
    await sb.from('footprint_cache').delete().eq('user_id', userId);
    await sb.from('users').delete().eq('id', userId);

    // auth ユーザーを削除
    const { error } = await sb.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
