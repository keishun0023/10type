import { NextRequest, NextResponse } from 'next/server';
import { callClaude, parseJSONFromText, isAIConfigured } from '@/lib/ai';

export const maxDuration = 60;

const SYSTEM = `あなたは、CBT（認知行動療法）とACTの考え方をベースにした自己改善プログラムの専門ライターです。ユーザーがこの1ヶ月で取り組んできた記録をもとに、温かく寄り添う「月次のふりかえりレポート」を書きます。

【厳守する原則】
- 煽らない・断定しない・責めない。できていないことを責めず、取り組めたこと自体を認める。
- 医療表現（治療・診断・症状・患者）は使わず、「整理・練習・気づき」などの言葉を使う。
- 自己否定を前提にした励まし方をしない。
- 記録が少なくても、その人のペースを尊重して前向きにまとめる。
- 具体的なミッション文をそのまま羅列せず、奥にある変化やテーマを言葉にする。

【出力】
- 必ず有効なJSONのみを出力する。コードフェンスや説明文は付けない。`;

export async function POST(req: NextRequest) {
  try {
    const { typeName, fearSummary, currentFocus, doneCount, cogCount, actionCount, logs } = await req.json();

    if (!isAIConfigured()) {
      return NextResponse.json({
        summary: {
          headline: 'この1ヶ月、よく歩いてきました。',
          changes: '少しずつでも続けてきたことが、これからの変化の土台になります。',
          patterns: '',
          encouragement: '焦らず、あなたのペースで大丈夫です。',
          nextFocus: '来月も、無理のない一歩から続けていきましょう。',
        },
      });
    }

    const logLines = (Array.isArray(logs) ? logs : [])
      .slice(0, 30)
      .map((l: { title: string; memo: string; kind: string | null }, i: number) =>
        `${i + 1}. [${l.kind === 'action' ? '行動' : l.kind === 'cognitive' ? '認知' : '-'}] ${l.title}${l.memo ? `（記録: ${l.memo}）` : ''}`)
      .join('\n');

    const user = `# このユーザーの1ヶ月
- 診断タイプ: ${typeName || '不明'}
- 恐れの傾向: ${fearSummary || '不明'}
- 取り組んでいるテーマ: ${currentFocus || '不明'}
- 取り組んだ回数: 合計${doneCount ?? 0}回（気づき系${cogCount ?? 0}回 / 行動系${actionCount ?? 0}回）

## 取り組みの記録
${logLines || '（記録はまだ少なめです）'}

# あなたのタスク
この1ヶ月のふりかえりレポートを書いてください。記録の奥にある変化やテーマを汲み取り、本人をねぎらいながら、次の一歩に繋がる温かい内容にします。

以下のJSON形式で**JSONのみ**を出力してください：
{
  "headline": "この1ヶ月を一言で表す、温かい見出し（1文）",
  "changes": "この1ヶ月で見えてきた変化や気づきを、2〜3文で。具体例の羅列ではなく奥にあるテーマを言葉にする。",
  "patterns": "記録から見えてきたその人のパターンや傾向を、やさしく2文程度で。決めつけない。",
  "encouragement": "取り組んできたこと自体へのねぎらいを1〜2文で。",
  "nextFocus": "来月に向けた、無理のない次の一歩の提案を1〜2文で。"
}`;

    const raw = await callClaude({ system: SYSTEM, user, maxTokens: 1200, temperature: 0.7 });
    const parsed = parseJSONFromText<{
      headline: string; changes: string; patterns: string; encouragement: string; nextFocus: string;
    }>(raw);
    return NextResponse.json({ summary: parsed });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
