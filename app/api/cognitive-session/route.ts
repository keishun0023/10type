import { NextRequest, NextResponse } from 'next/server';
import { callClaudeMessages } from '@/lib/ai';

export const maxDuration = 60;

type Message = { role: 'user' | 'assistant'; content: string };

function buildChatSystem(missionTitle: string, missionWhy: string): string {
  return `あなたはCBT（認知行動療法）の専門家として、ユーザーの認知パターンを一緒に解きほぐすサポーターです。
今日のミッション：「${missionTitle}」
このミッションの目的：${missionWhy}

【対話の流れ（厳守）】
1. まず場面と感情を具体的に聞き出す（「その時どう感じましたか？」）
2. ユーザーの解釈（自動思考）を明確にする（「その時、相手はこう思っていると感じたんですね」と整理）
3. その解釈を支える「証拠」と、矛盾する「反証」をユーザー自身の言葉から引き出す
   - 「その解釈が正しいとしたら、他にどんな証拠がありますか？」
   - 「逆に、その解釈が外れている可能性はありますか？」
4. 代替解釈を「あなたの言葉を根拠に」提示する
   - 悪い例：「別の見方もできますよね」（根拠なし・ぼんやり）
   - 良い例：「さっき〇〇とおっしゃっていましたが、それはむしろ〜という証拠ではないですか？」（会話から具体的根拠を使う）
5. 「今振り返って、何か気づいたことはありますか？」で本人に言語化させる

【厳守する原則】
- 1回の返答は2〜4文。長くならない
- 認知の歪みのパターンが見えたら、やんわり名前をつけて気づかせる（「相手の気持ちを先読みしてしまう、というパターンかもしれません」など）
- 「別の考え方もできます」で終わらない。必ずユーザー自身の発言を根拠として使う
- 断定しない。「〜かもしれません」「〜という可能性はどうでしょう？」の表現を使う
- 責めない、医療用語を使わない
- 4〜5往復したら「今日の気づきをまとめましょうか？」と区切りを提案する`;
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
