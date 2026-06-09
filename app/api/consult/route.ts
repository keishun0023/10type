import { NextRequest, NextResponse } from 'next/server';
import { callClaudeMessages, isAIConfigured } from '@/lib/ai';

export const maxDuration = 60;

const SYSTEM = `あなたは、CBT（認知行動療法）とACT（アクセプタンス＆コミットメント・セラピー）の考え方をベースにした、ユーザー専属の相談相手です。ユーザーの診断結果・これまでのミッション・記録を知った上で、いつでも気軽に相談できる伴走者として寄り添います。

【役割】
- ユーザーの「生きづらさ」や日々の悩みに、対話を通じて一緒に向き合う。
- 診断や記録の文脈を踏まえ、「あなたのことを分かっている」温度感で応答する。
- 必要なら、これまでのミッションやテーマと関連づけて、小さな次の一歩を一緒に考える。

【厳守する原則】
- 煽らない・断定しない・責めない。「〜かもしれません」と余地を残す。
- 医療表現（治療・診断・症状・患者）は使わず、「整理・練習・気づき」などの言葉を使う。
- 自己否定を前提にした励まし方をしない。
- 一方的に長く話さず、相手のペースに合わせて、問いかけも交えながら対話する。
- 危機的な内容（自傷・他害など）が出たら、専門の相談窓口に繋がることをやさしく勧める。

【応答スタイル】
- 1〜3文程度を基本に、温かく簡潔に。長くなりすぎない。`;

type ConsultContext = {
  typeName?: string;
  fearSummary?: string;
  userInsight?: string;
  currentFocus?: string;
  recentLogs?: { title: string; memo: string }[];
};

export async function POST(req: NextRequest) {
  try {
    const { messages, context } = await req.json() as {
      messages: { role: 'user' | 'assistant'; content: string }[];
      context?: ConsultContext;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }
    if (!isAIConfigured()) {
      return NextResponse.json({ message: '今はAIに接続できませんでした。少し時間をおいて、もう一度試してみてください。' });
    }

    const c = context ?? {};
    const recent = (c.recentLogs ?? [])
      .slice(0, 5)
      .map((l, i) => `${i + 1}. ${l.title}${l.memo ? `（メモ: ${l.memo}）` : ''}`)
      .join('\n');

    const contextBlock = `# このユーザーについて（背景情報。直接引用せず、理解の土台にする）
- 診断タイプ: ${c.typeName || '不明'}
- 恐れの傾向: ${c.fearSummary || '不明'}
- 最近向き合っているテーマ: ${c.currentFocus || '不明'}
- 困りごとの要約: ${c.userInsight || '（なし）'}
- 最近取り組んだこと:
${recent || '（まだ記録なし）'}`;

    // 背景情報を最初のユーザーメッセージの前に system 追記として渡す
    const systemWithContext = `${SYSTEM}\n\n${contextBlock}`;

    const message = await callClaudeMessages({
      system: systemWithContext,
      messages,
      maxTokens: 1024,
      temperature: 0.8,
    });

    return NextResponse.json({ message });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
