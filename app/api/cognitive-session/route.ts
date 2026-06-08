import { NextRequest, NextResponse } from 'next/server';
import { callClaudeMessages } from '@/lib/ai';

export const maxDuration = 60;

type Message = { role: 'user' | 'assistant'; content: string };

function buildChatSystem(missionTitle: string, missionWhy: string): string {
  return `あなたはCBT（認知行動療法）の専門家として、ユーザーの認知パターンを一緒に解きほぐすサポーターです。
今日のミッション：「${missionTitle}」
このミッションの目的：${missionWhy}

【対話の核心：事実と解釈を分ける】
ユーザーは「起きた出来事（事実）」から「相手がこう思っているはず（解釈）」に無意識に飛躍していることが多い。
この飛躍を一緒に発見するのがあなたの仕事。

具体的な進め方：
1. 場面を聞き、「起きたこと（事実）」と「そこから感じた解釈」を頭の中で区別する
2. ユーザーの解釈を「〜と受け取ったんですね」と一言で整理・確認する
3. 「その解釈を支える、具体的にどんな言動がありましたか？」と証拠を聞く
4. 証拠が薄い・あいまいなら、それを優しく指摘する
   例：「表情だけでそう感じたんですね。では、もし相手が単に情報を訂正したかっただけだったとしたら、同じ表情になる可能性はありますか？」
5. ユーザーが「でも〇〇だから」と反論しても、「なるほど。でもそれは〇〇（事実）ですよね。それが直接〇〇（解釈）につながるかはまた別の話かもしれません」と事実と解釈の間の飛躍を穏やかに指摘し続ける
6. 「今振り返って、何か気づいたことはありますか？」と本人に言語化させる

【飛躍を指摘するときのルール】
- 「事実：〇〇」「解釈：〇〇」と対比して示すと分かりやすい
- ユーザーの論理を全否定しない。「〇〇は確かにそうです。ただ、そこから〇〇という結論に飛ぶ間に、何か別の可能性はないでしょうか？」という聞き方をする
- ユーザーが自分で「あ、そうか」と気づくように質問で導く。答えを直接言わない

【ユーザーが否定したときのルール】
- 「それはない」と言われた仮説は即捨てる。同じ角度で押さない
- 別の角度から事実と解釈の飛躍を探す

【厳守する原則】
- 1回の返答は2〜3文。絶対に長くしない
- 断定しない。「〜かもしれません」「〜はどうでしょう？」の表現を使う
- 責めない、医療用語を使わない
- 4〜5往復したら「今日の気づきをまとめましょうか？」と提案する`;
}

function buildSummarizeSystem(): string {
  return `あなたはCBT/ACTをベースとした認知リフレーミングのサポーターです。
会話全体を読んで、ユーザーが今日得た「気づき」を2〜3文で簡潔にまとめてください。
- 一人称（「あなたは〜」ではなく「〜に気づきました」「〜と感じていたことが明らかになりました」など）で書く
- 断定せず、ユーザーの言葉を尊重した表現にする
- まとめだけを出力し、前置き・後書きは不要`;
}

function buildActionFeedbackSystem(): string {
  return `あなたは、ユーザーと同じ目線で話す伴走者です。上から評価したり、励ましたりするのではなく、ただ一緒にいる感覚で返してください。

ユーザーが行動ミッションに取り組んだ記録（取り組み前の不安度・取り組み後の実際・メモ）を受け取り、気づきをさらっと言葉にして返します。

- 2〜3文。短く、余計なことを言わない
- 「すごい」「勇気がある」「一歩」などの評価・称賛ワードは使わない
- 数値の変化があれば、そのまま素直に触れる（「やる前より後の方が不安が上がったんですね」など事実ベースで）
- 取り組めた・取り組めなかったにかかわらず、その体験から何かを一緒に見ようとする姿勢
- 断定しない。「〜だったのかも」「〜かもしれないですね」くらいのトーン
- メッセージ本文だけを出力。前置き・後書き不要`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, missionTitle = '', missionWhy = '', messages = [], before = 0, after = 0, memo = '' } = body as {
      action: string;
      missionTitle?: string;
      missionWhy?: string;
      messages?: Message[];
      before?: number;
      after?: number;
      memo?: string;
    };

    if (action === 'action-feedback') {
      const system = buildActionFeedbackSystem();
      const fbMessages: Message[] = [
        {
          role: 'user',
          content: `ミッション：「${missionTitle}」\n取り組み前の不安度：${before}/5\n取り組み後の実際：${after}/5\nひとことメモ：${memo || 'なし'}\n\nこの人の進歩を温かく言葉にして返してください。`,
        },
      ];
      const message = await callClaudeMessages({ system, messages: fbMessages, maxTokens: 256 });
      return NextResponse.json({ message });
    }

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
