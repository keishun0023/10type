import { NextRequest, NextResponse } from 'next/server';
import { callClaudeMessages } from '@/lib/ai';

export const maxDuration = 60;

type LogEntry = {
  day: number;
  date: string;
  title: string;
  kind: string | null;
  memo: string;
};

type RequestBody = {
  focusLabel: string;       // 例: 制御できない不安
  cogCount: number;
  actionCount: number;
  dayCount: number;         // 取り組んだ日数
  logs: LogEntry[];
};

const SYSTEM = `あなたは、ユーザーの30日間の取り組み記録を読んで、変化を言葉にする存在です。
評価や励ましではなく、「気づいていないかもしれない変化」を静かに言語化してください。
上から目線にならず、ユーザーと同じ目線で、ただそこにある変化を見つける感じで書いてください。`;

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { focusLabel, cogCount, actionCount, dayCount, logs } = body;

    const logSummary = logs.map(l =>
      `Day${l.day}（${l.kind === 'action' ? '行動' : '認知'}）: ${l.title}${l.memo ? `　メモ：${l.memo}` : ''}`
    ).join('\n');

    // ① これまでのあなた（ヒーロー文）
    const heroMessages = [{
      role: 'user' as const,
      content: `ユーザーの取り組み記録です。

向き合ってきたテーマ：${focusLabel}
書き出した（認知）：${cogCount}回
試してみた（行動）：${actionCount}回
取り組んだ日数：${dayCount}日

ミッション記録：
${logSummary || 'まだ記録がありません'}

「これまでのあなた」という見出しのもとに、この人の変化を2〜3文で言葉にしてください。
- 「〜が少しずつ増えてきています」「〜できる日が出てきました」などの変化感を大切に
- 数字の羅列にならず、変化の質を言葉にする
- 記録が少ない場合は「始まったばかりです」などスタート感を出す
- 文だけを出力。見出しや前置き不要`,
    }];

    // ② Before/Now 比較
    const beforeNowMessages = [{
      role: 'user' as const,
      content: `ユーザーの取り組み記録です。

向き合ってきたテーマ：${focusLabel}
書き出した（認知）：${cogCount}回
試してみた（行動）：${actionCount}回

ミッション記録：
${logSummary || 'まだ記録がありません'}

「はじめの頃」と「今のあなた」を箇条書きで対比してください。

フォーマット（このまま出力）：
はじめの頃
・〇〇
・〇〇
・〇〇

今のあなた
・〇〇
・〇〇
・〇〇

- 各3点ずつ
- 記録が少ない場合は「まだはじめたばかり」感を出す
- 数値ではなく、行動や気持ちの質の変化で書く`,
    }];

    // ③ タイムライン（各日のラベル）
    const timelineMessages = [{
      role: 'user' as const,
      content: `以下のミッション記録から、「ここまでの道のり」としてユーザーに見せるタイムラインを作ります。

${logSummary || 'まだ記録がありません'}

各DayについてJSON配列で出力してください（最大5件）。

フォーマット：
[
  {"day": 1, "label": "はじめて不安を書き出した"},
  {"day": 3, "label": "相手の反応を気にしていたことに気づいた"}
]

- ミッションタイトルをそのまま使わず、「その日に何が起きたか」を一言で
- 変化や気づきがあった日を優先して選ぶ
- JSON配列だけを出力。前後のテキスト不要`,
    }];

    // ④ 次の一歩
    const nextMessages = [{
      role: 'user' as const,
      content: `ユーザーが向き合ってきたテーマ：${focusLabel}
取り組んできた日数：${dayCount}日

「次の一歩につながる一言」を1文で書いてください。
- 「少しずつ〜できるようになってきています」「次は〜を試してみましょう」などの自然な流れで
- 1文だけ出力。前後のテキスト不要`,
    }];

    const [hero, beforeNow, timelineRaw, next] = await Promise.all([
      callClaudeMessages({ system: SYSTEM, messages: heroMessages, maxTokens: 128 }),
      callClaudeMessages({ system: SYSTEM, messages: beforeNowMessages, maxTokens: 400 }),
      callClaudeMessages({ system: SYSTEM, messages: timelineMessages, maxTokens: 400 }),
      callClaudeMessages({ system: SYSTEM, messages: nextMessages, maxTokens: 128 }),
    ]);

    // タイムラインJSONをパース
    let timeline: { day: number; label: string }[] = [];
    try {
      const match = timelineRaw.match(/\[[\s\S]*\]/);
      if (match) timeline = JSON.parse(match[0]);
    } catch {
      timeline = [];
    }

    return NextResponse.json({ hero, beforeNow, timeline, next });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
