import { FearAxis } from '@/data/questions';
import { ProgramConfig, PROGRAM_COMPONENTS } from '@/data/program';
import { TYPES } from '@/data/types';
import { REPORT_CONTENT } from '@/data/report';

const FEAR_LABEL: Record<FearAxis, string> = {
  F_REL: '関係喪失への恐れ',
  F_EVAL: '評価への恐れ',
  F_IMP: '不完全への恐れ',
  F_CTRL: '制御不能への恐れ',
};

type SkeletonDay = {
  day: number;
  componentId: string;
  kind: string;
  lv: number;
  heavy: boolean;
  skeletonTitle: string;
  skeletonWhy: string;
};

export type PlanPromptInput = {
  typeId: string;
  fearScores: Record<FearAxis, number>;
  config: ProgramConfig;
  onboarding: Record<string, string>;
  schedule: SkeletonDay[];
};

const SYSTEM = `あなたは認知行動療法（CBT）とACT（アクセプタンス＆コミットメント・セラピー）の考え方をベースにした、自己改善プログラムの専門ライターです。日本語で、ユーザー一人ひとりに寄り添った文章を書きます。

【厳守する原則】
- 煽らない。不安を煽って行動させようとしない。
- 断定しない。「あなたは〇〇だ」と決めつけず、「〜かもしれません」「〜のようでした」と余地を残す。
- 弱った人を凹ませない。できていないことを責めない。
- 効能を保証しない。「必ず治る」「改善します」と約束しない。
- 医療表現を使わない。「治療」「診断」「症状」「患者」などの医療用語は避け、「整理」「練習」「気づき」などの言葉を使う。
- 自己否定をベースにした改善を促さない。「今のあなたではダメ」という前提を作らない。

【出力形式】
- 必ず有効なJSONのみを出力する。マークダウンのコードフェンスや説明文は一切付けない。
- 文章は温かく、具体的で、ユーザーが「自分のことだ」と感じられるものにする。`;

export function buildPlanPrompt(input: PlanPromptInput): { system: string; user: string } {
  const { typeId, fearScores, config, onboarding, schedule } = input;

  const type = TYPES.find(t => t.id === typeId);
  const report = REPORT_CONTENT[typeId];

  // 恐れスコアを高い順に
  const fearLines = (Object.entries(fearScores) as [FearAxis, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([axis, score]) => `- ${FEAR_LABEL[axis]}: ${Math.round(score)}点`)
    .join('\n');

  // 使う部品の説明
  const compLines = config.components
    .map(c => {
      const comp = PROGRAM_COMPONENTS[c.componentId];
      const kind = comp.kind === 'action' ? '行動実験' : '考え方の整理';
      return `- ${c.componentId}（${FEAR_LABEL[comp.fearAxis]} × ${kind}）: ${comp.approach}`;
    })
    .join('\n');

  // 30日スケジュール（骨格）
  const scheduleLines = schedule
    .map(d => {
      const kind = d.kind === 'action' ? '行動' : '認知';
      const heavy = d.heavy ? '【じっくり取り組む日】' : '';
      return `Day ${d.day} [${d.componentId} ${kind} Lv${d.lv}]${heavy}\n  骨格: ${d.skeletonTitle}\n  なぜ: ${d.skeletonWhy}`;
    })
    .join('\n');

  const orientationLabel =
    config.changeOrientation === 'change' ? '変わりたい・できるようになりたい' :
    config.changeOrientation === 'accept' ? '今の自分を受け入れて楽になりたい' :
    'まだ決めきれていない';

  const user = `# ユーザー情報

## 診断タイプ
${type ? `${type.name}：${type.catch}` : typeId}

## 恐れスコア（高いほど強い）
${fearLines}

## 本人の希望
- 方向性: ${orientationLabel}
- 生活スタイル: ${onboarding.lifestyle || '未回答'}
- 1日に取れる時間: ${onboarding.dailyTime || '未回答'}
- 続けやすいタイミング: ${onboarding.bestTiming || '未回答'}
- 困り度: ${onboarding.distressLevel || '未回答'}

## 本人が一番しんどくなりやすい場面
${onboarding.difficultScene || '未回答'}

## その場面で具体的に困っていること（本人の言葉）
選択した項目: ${onboarding.difficultDetail || 'なし'}
自由記述: ${onboarding.difficultFreeText || 'なし'}

## このプログラムで使う部品（恐れ × アプローチ）
${compLines}

## 参考：このタイプの一般的な消耗場面と強み（そのまま使わず、本人の情報で具体化する）
- 消耗場面: ${report?.drainScene || '（データなし）'}
- 強みの捉え直し: ${report?.strengthReframe || '（データなし）'}

# あなたのタスク

上記の情報をもとに、このユーザー専用の30日プログラムを作ってください。特に「その場面で具体的に困っていること（本人の言葉）」を最大限に活用し、ミッションを本人の状況に合わせて具体化してください。

以下のJSON形式で**JSONのみ**を出力してください：

{
  "report": {
    "currentState": "今の本人の状態を、本人の言葉を踏まえて2〜3文で。決めつけず『〜のようでした』調で。",
    "drainScene": "本人が消耗しやすい場面を、本人の記述に即して具体的に2〜3文で。",
    "strengthReframe": "本人の防衛/恐れを、本来は強みであると捉え直す。2〜3文で。",
    "direction": "本人がどうなりたいかを踏まえ、これから30日間で何を中心にやるかを2〜3文で。"
  },
  "welcomeSteps": [
    { "title": "短い見出し", "body": "課金直後に一画面ずつ見せる導入文。1ステップ2〜3文。" }
    // 4〜5ステップ。流れ：①ようこそ ②あなたは今こういう状態でした ③消耗の正体 ④だから何をやるか ⑤一緒に進もう、の順
  ],
  "missions": [
    { "day": 1, "title": "その日の具体的なミッション文（本人向けに具体化）", "why": "なぜこれをやるのかを温かく1〜2文で" }
    // Day 1 から Day 30 まで全て。上の30日スケジュールの骨格・Lv・行動/認知の種別を必ず守り、文面だけを本人向けに具体化する。
  ]
}

注意：
- missions は必ず Day 1〜30 の全30件。day番号はスケジュールと一致させる。
- 各ミッションは骨格の意図（行動実験 or 考え方の整理、Lv）を守る。勝手に別のことをさせない。
- 【じっくり取り組む日】は、腰を据えて考える重めの認知ワークにする。
- 本人の自由記述が空の場合は、選択した場面情報とタイプ情報で具体化する。`;

  return { system: SYSTEM, user };
}
