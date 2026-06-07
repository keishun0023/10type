import { NextRequest, NextResponse } from 'next/server';
import { callClaudeMessages } from '@/lib/ai';

export const maxDuration = 60;

type Message = { role: 'user' | 'assistant'; content: string };

function buildChatSystem(missionTitle: string, missionWhy: string): string {
  return `あなたはCBT/ACTをベースとした認知リフレーミングのサポーターです。
今日のミッション：「${missionTitle}」
このミッションの目的：${missionWhy}

以下の原則を守ってください。
- 1回の返答は2〜4文で短くまとめる
- 流れ：①共感・受け取る → ②掘り下げ質問（具体的な状況・感情）→ ③別の解釈を一緒に探す → ④気づきをまとめる
- 3〜5往復で自然に収束させ、「今日の気づきをまとめましょうか？」と区切りを提案する
- 断定しない、責めない、医療用語を使わない
- ユーザーの言葉を大切にし、押しつけず、優しく気づきを促す
- ミッションの目的に沿って対話を導く`;
}

function buildSummarizeSystem(): string {
  return `あなたはCBT/ACTをベースとした認知リフレーミングのサポーターです。
会話全体を読んで、ユーザーが今日得た「気づき」を2〜3文で簡潔にまとめてください。
- 一人称（「あなたは〜」ではなく「〜に気づきました」「〜と感じていたことが明らかになりました」など）で書く
- 断定せず、ユーザーの言葉を尊重した表現にする
- まとめだけを出力し、前置き・後書きは不要`;
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
          content: `以下はミッション「${missionTitle}」に関する会話です。\n\n${messages.map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`).join('\n')}\n\n今日の気づきを2〜3文でまとめてください。`,
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
