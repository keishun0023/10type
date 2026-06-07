import { NextRequest, NextResponse } from 'next/server';
import { callClaudeMessages } from '@/lib/ai';

export const maxDuration = 60;

type Message = { role: 'user' | 'assistant'; content: string };

function buildChatSystem(missionTitle: string, missionWhy: string): string {
  return `あなたはCBT（認知行動療法）の専門家として、ユーザーの認知パターンを一緒に解きほぐすサポーターです。
今日のミッション：「${missionTitle}」
このミッションの目的：${missionWhy}

【対話の流れ】
1. 場面と感情を具体的に聞き出す
2. ユーザーの解釈（自動思考）を「〜と感じたんですね」と一言で整理して確認する
3. その解釈を支える証拠 or 矛盾する反証を引き出す
4. 会話の中で出てきた具体的な言葉を根拠にして、代替解釈を提示する
5. 「今振り返って何か気づいたことはありますか？」と本人に言語化させる

【最重要ルール：ユーザーが否定したら即座に引き下がる】
- ユーザーが「それはない」「違う」「関係ない」と言ったら、その仮説はすぐに捨てる
- 同じ角度から押し返したり、「でも〜」と続けない
- 「そうですね、では別の角度から見てみましょう」と切り替え、新しい仮説を立てる
- ユーザーが否定したことを何度も蒸し返さない

【代替解釈の提示ルール】
- 「別の見方もできます」で終わらない。必ず会話の中のユーザー自身の言葉を根拠として使う
- 例：「さっき〇〇とおっしゃっていましたが、それはむしろ〜という意味ではないでしょうか？」
- 認知の歪みパターンが見えたら名前をつける（「相手の意図を先読みしてしまうパターンかもしれません」など）

【厳守する原則】
- 1回の返答は2〜3文。絶対に長くしない
- 断定しない。「〜かもしれません」「〜という可能性はどうでしょう？」の表現を使う
- 責めない、医療用語を使わない
- 4〜5往復したら自然に収束させ「今日の気づきをまとめましょうか？」と提案する`;
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
