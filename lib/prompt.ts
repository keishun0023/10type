import { FearAxis, DefenseAxis } from '@/data/questions';
import { ProgramConfig, PROGRAM_COMPONENTS } from '@/data/program';
import { TYPES } from '@/data/types';
import { REPORT_CONTENT } from '@/data/report';

const FEAR_LABEL: Record<FearAxis, string> = {
  F_REL: '関係喪失への恐れ',
  F_EVAL: '評価への恐れ',
  F_IMP: '不完全への恐れ',
  F_CTRL: '制御不能への恐れ',
};

// 防衛スコアは両極のスケール（高いほど右の極）。傾向を言葉で表すためのラベル。
const DEFENSE_POLES: Record<DefenseAxis, { low: string; high: string; theme: string }> = {
  D_APP: { low: '回避（しんどい場面から離れる）', high: '接近（あえて向き合う）', theme: '回避↔接近' },
  D_ACT: { low: '受動（相手や状況に合わせる）', high: '能動（自分から動く）', theme: '受動↔能動' },
  D_EXP: { low: '抑制（気持ちを内にためる）', high: '表出（気持ちを外に出す）', theme: '抑制↔表出' },
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
  defenseScores?: Record<DefenseAxis, number> | null;
  config: ProgramConfig;
  onboarding: Record<string, string>;
  schedule: SkeletonDay[];
};

export type FullPromptInput = PlanPromptInput & {
  // preview で確定済みの土台（full ではこれを必ず踏襲する）
  userInsight: string;
  report: {
    currentState: string;
    drainScene: string;
    strengthReframe: string;
    direction: string;
  };
};

const SYSTEM = `あなたは認知行動療法（CBT）とACT（アクセプタンス＆コミットメント・セラピー）の考え方をベースにした、自己改善プログラムの専門ライターです。日本語で、ユーザー一人ひとりに寄り添った文章を書きます。

【厳守する原則】
- 煽らない。不安を煽って行動させようとしない。
- 断定しない。「あなたは〇〇だ」と決めつけず、「〜かもしれません」「〜のようでした」と余地を残す。
- 弱った人を凹ませない。できていないことを責めない。
- 効能を保証しない。「必ず治る」「改善します」と約束しない。
- 医療表現を使わない。「治療」「診断」「症状」「患者」などの医療用語は避け、「整理」「練習」「気づき」などの言葉を使う。
- 自己否定をベースにした改善を促さない。「今のあなたではダメ」という前提を作らない。

【本人の言葉の扱い方（最重要）】
- 本人が書いた具体的な場面（例：「朝礼での発表」「上司に企画案を持っていく」など）を、そのまま繰り返さない。
- 具体例は「氷山の一角」として扱い、その奥にある共通のテーマを一段抽象化して捉える。
  - 悪い例：「朝礼での発表や上司への相談で緊張してしまうあなたへ」（具体例の羅列・抽象化されていない）
  - 良い例：「人から評価される場面で、本来の力を出しづらくなりやすいあなたへ」（具体例の奥にあるテーマを言語化）
- 抽象化のときは、本人の自由記述だけに引きずられず、恐れスコア・防衛傾向・オンボーディングの回答を総合して「結局この人は何に困っているのか」を組み立てる。
- ただし抽象的すぎて他人事に感じさせないよう、本人が「わかってもらえている」と感じる温度感は保つ。

【出力形式】
- 必ず有効なJSONのみを出力する。マークダウンのコードフェンスや説明文は一切付けない。
- 文章は温かく、ユーザーが「自分のことだ」と感じられるものにする。`;

// 共通：ユーザー情報ブロック（恐れ・防衛・オンボ・部品）
function userContextBlock(input: PlanPromptInput): string {
  const { typeId, fearScores, defenseScores, config, onboarding } = input;

  const type = TYPES.find(t => t.id === typeId);
  const report = REPORT_CONTENT[typeId];

  const fearLines = (Object.entries(fearScores) as [FearAxis, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([axis, score]) => `- ${FEAR_LABEL[axis]}: ${Math.round(score)}点`)
    .join('\n');

  const defenseLines = defenseScores
    ? (Object.entries(defenseScores) as [DefenseAxis, number][])
        .map(([axis, score]) => {
          const p = DEFENSE_POLES[axis];
          const lean = score >= 60 ? p.high : score <= 40 ? p.low : 'どちらともいえない';
          return `- ${p.theme}: ${Math.round(score)}点（傾向：${lean}）`;
        })
        .join('\n')
    : '（データなし）';

  const compLines = config.components
    .map(c => {
      const comp = PROGRAM_COMPONENTS[c.componentId];
      const kind = comp.kind === 'action' ? '行動実験' : '考え方の整理';
      return `- ${c.componentId}（${FEAR_LABEL[comp.fearAxis]} × ${kind}）: ${comp.approach}`;
    })
    .join('\n');

  const orientationLabel =
    config.changeOrientation === 'change' ? '変わりたい・できるようになりたい' :
    config.changeOrientation === 'accept' ? '今の自分を受け入れて楽になりたい' :
    'まだ決めきれていない';

  return `## 診断タイプ
${type ? `${type.name}：${type.catch}` : typeId}

## 恐れスコア（高いほど強い）
${fearLines}

## 防衛傾向（普段どうやって不安に対処しがちか）
${defenseLines}

## 本人の希望
- 方向性: ${orientationLabel}
- 生活スタイル: ${onboarding.lifestyle || '未回答'}
- 1日に取れる時間: ${onboarding.dailyTime || '未回答'}
- 続けやすいタイミング: ${onboarding.bestTiming || '未回答'}
- 困り度: ${onboarding.distressLevel || '未回答'}

## 本人が一番しんどくなりやすい場面（カテゴリ選択）
${onboarding.difficultScene || '未回答'}

## その場面で具体的に困っていること（本人の言葉・あくまで素材）
選択した項目: ${onboarding.difficultDetail || 'なし'}
自由記述: ${onboarding.difficultFreeText || 'なし'}

## このプログラムで使う部品（恐れ × アプローチ）
${compLines}

## 参考：このタイプの一般的な消耗場面と強み（そのまま使わず、本人の情報で再構成する）
- 消耗場面: ${report?.drainScene || '（データなし）'}
- 強みの捉え直し: ${report?.strengthReframe || '（データなし）'}`;
}

function scheduleBlock(schedule: SkeletonDay[]): string {
  return schedule
    .map(d => {
      const kind = d.kind === 'action' ? '行動' : '認知';
      const heavy = d.heavy ? '【じっくり取り組む日】' : '';
      return `Day ${d.day} [${d.componentId} ${kind} Lv${d.lv}]${heavy}\n  骨格: ${d.skeletonTitle}\n  なぜ: ${d.skeletonWhy}`;
    })
    .join('\n');
}

// ── プレビュー（課金前）：要約＋レポート＋ようこそ＋最初の数日のミッション ──
export function buildPreviewPrompt(input: PlanPromptInput): { system: string; user: string } {
  const ctx = userContextBlock(input);
  const scheduleLines = scheduleBlock(input.schedule);
  const lastDay = input.schedule[input.schedule.length - 1]?.day ?? input.schedule.length;

  const user = `# ユーザー情報

${ctx}

## 最初の${input.schedule.length}日分のスケジュール（骨格）
${scheduleLines}

# あなたのタスク

まず、本人の自由記述・選択・恐れ/防衛スコア・希望を**統合して一段抽象化**し、「結局この人は何に困っているのか」を userInsight としてまとめてください。これ以降の全文面（レポート・ミッション）は、この userInsight を土台にします。具体的な場面名そのままの繰り返しは禁止です。

そのうえで、本人に最初に見せる分析レポートと、最初の${input.schedule.length}日分のミッションを作ってください。

以下のJSON形式で**JSONのみ**を出力してください：

{
  "userInsight": "本人の具体例の奥にある共通テーマを一段抽象化した『この人は結局どんなことに困っているか』の要約。3〜4文。これを全文面の土台にする。",
  "report": {
    "currentState": "今の本人の状態を、userInsight を踏まえて2〜3文で。決めつけず『〜のようでした』調で。具体例の羅列は避ける。",
    "drainScene": "本人が消耗しやすい場面を、抽象化したテーマとして2〜3文で。複数の具体例に共通する構造を言葉にする。",
    "strengthReframe": "本人の防衛/恐れを、本来は強みであると捉え直す。2〜3文で。",
    "direction": "本人がどうなりたいかを踏まえ、これから30日間で何を中心にやるかを2〜3文で。"
  },
  "previewMissions": [
    { "day": 1, "title": "その日の具体的なミッション文", "why": "なぜこれをやるのかを温かく1〜2文で" }
    // Day 1 から Day ${lastDay} まで。上のスケジュールの骨格・Lv・行動/認知の種別を必ず守る。
  ]
}

注意：
- previewMissions は Day 1〜${lastDay} の全${input.schedule.length}件。day番号はスケジュールと一致させる。
- 各ミッションは骨格の意図（行動実験 or 考え方の整理、Lv）を守る。
- ミッションも userInsight を土台に、本人の状況に合うよう具体化する（ただし本人の書いた場面名をそのままコピーしない）。`;

  return { system: SYSTEM, user };
}

// ── フル（課金後）：ようこそガイド＋残りのミッション。土台（userInsight/report）は踏襲 ──
export function buildFullPrompt(input: FullPromptInput): { system: string; user: string } {
  const ctx = userContextBlock(input);
  const scheduleLines = scheduleBlock(input.schedule);
  const days = input.schedule.map(d => d.day);
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  const user = `# ユーザー情報

${ctx}

## すでに確定している土台（必ず踏襲する。矛盾させない）

### この人の困りごとの要約（userInsight）
${input.userInsight || '（未設定）'}

### 確定済みレポート
- 今の状態: ${input.report.currentState}
- 消耗しやすい場面: ${input.report.drainScene}
- 強みの捉え直し: ${input.report.strengthReframe}
- これからの方向性: ${input.report.direction}

## 作成するスケジュール（Day ${firstDay}〜${lastDay} の骨格）
${scheduleLines}

# あなたのタスク

上の userInsight とレポートを土台に、課金直後に見せる「ようこそガイド」と、Day ${firstDay}〜${lastDay} のミッションを作ってください。土台と矛盾しないこと、本人の書いた具体的な場面名をそのまま繰り返さないことを守ってください。

以下のJSON形式で**JSONのみ**を出力してください：

{
  "welcomeSteps": [
    { "title": "短い見出し", "body": "課金直後に一画面ずつ見せる導入文。1ステップ2〜3文。" }
    // 4〜5ステップ。流れ：①ようこそ ②あなたは今こういう状態でした ③消耗の正体 ④だから何をやるか ⑤一緒に進もう、の順。userInsight/レポートと一貫させる。
  ],
  "missions": [
    { "day": ${firstDay}, "title": "その日の具体的なミッション文", "why": "なぜこれをやるのかを温かく1〜2文で" }
    // Day ${firstDay} から Day ${lastDay} まで全て。上のスケジュールの骨格・Lv・行動/認知の種別を必ず守り、文面だけを本人向けに具体化する。
  ]
}

注意：
- missions は必ず Day ${firstDay}〜${lastDay} の全${input.schedule.length}件。day番号はスケジュールと一致させる。
- 各ミッションは骨格の意図（行動実験 or 考え方の整理、Lv）を守る。勝手に別のことをさせない。
- 【じっくり取り組む日】は、腰を据えて考える重めの認知ワークにする。`;

  return { system: SYSTEM, user };
}
