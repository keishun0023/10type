import { NextRequest, NextResponse } from 'next/server';
import { callClaudeMessages } from '@/lib/ai';

export const maxDuration = 60;

type Message = { role: 'user' | 'assistant'; content: string };

// 事前対話：行動実験の前に「今日の具体宣言→予測される不安」を引き出す
function buildChatSystem(missionTitle: string, missionWhy: string): string {
  return `あなたはCBT（認知行動療法）の行動実験をサポートする伴走者です。ユーザーがこれから取り組む行動について、「今日、具体的に何をやるか」と「それに対して何を予測し、何が不安か」を一緒に明確にします。

今日のミッション：「${missionTitle}」
このミッションの目的：${missionWhy}

【対話の進め方（2ビート）】
ビート1：今日やることを"具体的に"宣言してもらう。
- 一般論（「いつも」「どんな場面が多い」）は聞かない。「今日、具体的にどの場面で／誰に／何を やってみますか？」と、これから起こす一手を特定させる。
- 対人の題なら「誰に」、状況の題なら「いつ・どの場面で」、成果の題なら「何を」と、題に合わせて聞く。

ビート2：その具体的な一手について、予測と不安を引き出す。
- 「それをやると、どうなりそうだと思いますか？　何が一番こわいですか？」と、予測される最悪の展開を言葉にしてもらう。
- 必要なら「前に似たことがあったとき、どうでしたか？」と過去に紐づけ、不安の重さをリアルに思い出してもらう（補助的に）。

【厳守する原則】
- 1回の返答は2〜3文。長くしない。質問は一度に一つ。
- 予測として聞く。「悪いことが起きたか」と問い詰めない。煽らない。
- 断定しない・責めない・医療用語を使わない。
- ビート1とビート2が一通り出たら、「では、この内容で挑む準備をまとめましょうか？」と提案する（まとめは別で行う）。`;
}

// 宣言と不安を1〜2文に要約（事後に見返して予測と現実を照らすための文）
function buildSummarizeSystem(): string {
  return `あなたはCBTの行動実験をサポートする伴走者です。会話を読んで、ユーザーが「今日やること」と「予測している不安」を1〜2文に要約してください。
- 形式：「今日は〈具体的にやること〉をやってみて、〈予測される不安・最悪の展開〉になるのが怖い、ということですね。」のように、本人に語りかける形。
- 後で本人が見返して「実際どうだったか」と照らせる、具体的な内容にする。
- 要約だけを出力し、前置き・後書きは不要。`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, missionTitle = '', missionWhy = '', messages = [] } = body as {
      action: string;
      missionTitle?: string;
      missionWhy?: string;
      messages?: Message[];
    };

    if (action === 'chat') {
      const system = buildChatSystem(missionTitle, missionWhy);
      const reply = await callClaudeMessages({ system, messages, maxTokens: 512 });
      return NextResponse.json({ message: reply });
    }

    if (action === 'summarize') {
      const system = buildSummarizeSystem();
      const summaryMessages: Message[] = [
        {
          role: 'user',
          content: `以下はミッション「${missionTitle}」に挑む前の会話です。\n\n${messages.map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`).join('\n')}\n\n「今日やること」と「予測している不安」を1〜2文で要約してください。`,
        },
      ];
      const summary = await callClaudeMessages({ system, messages: summaryMessages, maxTokens: 256 });
      return NextResponse.json({ summary });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
