import { NextRequest, NextResponse } from 'next/server';
import { callClaude, parseJSONFromText, isAIConfigured } from '@/lib/ai';

export const maxDuration = 60;

const SYSTEM = `あなたはCBT（認知行動療法）／ACTの考え方をベースにした自己改善プログラムのサポーターです。
ユーザーが「今日の一歩」（頭の中を整理する内省ミッション）に取り組むとき、書き出す前に頭が真っ白にならず、「あ、それなら書けそう」と感じられる【考えるヒント（とっかかり）】を作ります。

【ヒントの作り方（最重要）】
ミッションは何らかの「問い」を投げています。ユーザーがそれに答えられるかは、その問いをどれだけ具体的に・いろんな角度から捉え直せるかで決まります。そこで次の2種類を混ぜて提供してください：
1. 問いの言葉そのものを、具体例でほぐす（例：「自然体」とは → ずっと一緒にいても疲れない／冗談が言える／我慢しなくていい、など）
2. 思い出す・考える入口を、別々の角度で複数渡す（例：よく遊ぶ人は？／昔からの付き合いは？／連絡頻度が高い人は？）

【厳守】
- 「質問→回答させる」形ではなく、あくまで「考えるとっかかり・ヒント」として、やわらかく差し出す口調にする。
- ユーザーを問い詰めない。正解を求めない。
- 各ヒントは1〜2文、短く。
- 3〜4個。
- 必ず有効なJSONのみを出力する。コードフェンスや説明文は付けない。`;

export async function POST(req: NextRequest) {
  try {
    const { title, why, kind } = await req.json();
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

    // AI未設定時は空配列（UIはヒント無しで普通に動く）
    if (!isAIConfigured()) return NextResponse.json({ hints: [] });

    const user = `# 今日のミッション
${title}

## なぜこれに取り組むのか
${why || '（なし）'}

## 種別
${kind === 'action' ? '行動（実際にやってみる）' : '認知（頭の中の整理・書き出し）'}

# あなたのタスク
このミッションに取り組む前の「考えるヒント（とっかかり）」を3〜4個作ってください。
問いの言葉を具体例でほぐすものと、思い出す/考える入口を別々の角度で渡すものを混ぜてください。

以下のJSON形式で**JSONのみ**を出力してください：
{ "hints": ["ヒント1", "ヒント2", "ヒント3"] }`;

    const raw = await callClaude({ system: SYSTEM, user, maxTokens: 600, temperature: 0.7 });
    const parsed = parseJSONFromText<{ hints: string[] }>(raw);
    const hints = Array.isArray(parsed.hints) ? parsed.hints.filter(h => typeof h === 'string') : [];
    return NextResponse.json({ hints });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
