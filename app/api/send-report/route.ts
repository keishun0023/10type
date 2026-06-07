import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseServer } from '@/lib/supabase-server';


const TYPE_MESSAGE: Record<string, string> = {
  'いい子・承認型': 'ずっと応え続けてきたあなたへ。その頑張りは、本物です。',
  '顔色うかがい型': '場の空気を読み続けてきたあなたへ。その気遣いは、本物です。',
  '気を遣いすぎ型': '我慢を重ねてきたあなたへ。その優しさは、本物です。',
  '完璧主義型': '妥協できずにいたあなたへ。その誠実さは、本物です。',
  '抱え込み型': '全部背負ってきたあなたへ。その責任感は、本物です。',
  '見捨てられ不安型': '関係を大切にしてきたあなたへ。その深さは、本物です。',
  '距離を置きたい型': '傷つかないよう守ってきたあなたへ。その知恵は、本物です。',
  '心配性・先回り型': '先回りして備えてきたあなたへ。その慎重さは、本物です。',
};

export async function POST(req: NextRequest) {
  // 簡易的な管理者チェック
  const authHeader = req.headers.get('authorization');
  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'ADMIN_SECRET not set' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized', received: authHeader?.slice(0, 20) }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const sb = getSupabaseServer();
  if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  // leadsからsession_idを取得（最新1件）
  const { data: lead } = await sb
    .from('leads')
    .select('session_id')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!lead) return NextResponse.json({ error: 'email not found' }, { status: 404 });

  // diagnosticsからtokenとタイプを取得
  const { data: diag } = await sb
    .from('diagnostics')
    .select('report_token, first_type_name')
    .eq('session_id', lead.session_id)
    .single();

  if (!diag?.report_token) return NextResponse.json({ error: 'diagnostic not found' }, { status: 404 });

  const typeName = diag.first_type_name;
  const message = TYPE_MESSAGE[typeName] || 'あなたのことを、少しでも軽くしたいと思っています。';
  const reportUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/report?token=${diag.report_token}`;

  const { error: sendError } = await resend.emails.send({
    from: 'ココリフト <noreply@kokorift.com>',
    to: email,
    subject: `【ココリフト】あなたの診断結果と30日プログラムができました`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #292524;">
        <div style="text-align: center; margin-bottom: 28px; display: flex; align-items: center; justify-content: center; gap: 10px;">
          <img src="${process.env.NEXT_PUBLIC_BASE_URL}/intro-service-icon.png" alt="" width="36" height="36" style="display: inline-block; vertical-align: middle;" />
          <img src="${process.env.NEXT_PUBLIC_BASE_URL}/intro-logo.png" alt="ココリフト" height="28" style="display: inline-block; vertical-align: middle;" />
        </div>
        <p style="font-size: 15px; line-height: 1.8;">先日は「ココリフト」の診断を受けていただき、ありがとうございました。</p>
        <p style="font-size: 15px; line-height: 1.8;">あなたの結果は <strong>「${typeName}」</strong>。</p>
        <p style="font-size: 15px; line-height: 1.8;">この結果をもとに、あなた専用の <strong>詳細レポート</strong> と <strong>30日プログラム</strong> をご用意しました。</p>
        <p style="font-size: 14px; line-height: 1.8; color: #78716c;">あなたの「恐れ」と「防衛スタイル」の可視化、消耗しやすい場面、そして今日から試せる小さなプログラムまで、まとめてご覧いただけます。</p>
        <div style="margin: 32px 0;">
          <a href="${reportUrl}" style="display: inline-block; background: linear-gradient(135deg, #a78bfa, #7c3aed); color: white; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: bold; font-size: 15px;">
            あなたのレポートを見る →
          </a>
        </div>
        <p style="font-size: 13px; line-height: 1.8; color: #a8a29e;">
          ※お届けまでお時間をいただいてしまい、失礼しました。リンクはいつでもご覧いただけます。<br /><br />
          ${email} 宛に送信しています。<br />
          ※ CBTの考え方をベースにした自己改善ツールです。医療診断ではありません。
        </p>
        <p style="font-size: 13px; color: #a8a29e; margin-top: 24px;">ココリフト</p>
      </div>
    `,
  });

  if (sendError) return NextResponse.json({ error: sendError.message }, { status: 500 });
  return NextResponse.json({ ok: true, email, reportUrl });
}
