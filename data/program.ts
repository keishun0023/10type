import { FearAxis } from './questions';

// ─────────────────────────────────────────────
// 部品の型
// ─────────────────────────────────────────────

export type ComponentKind = 'action' | 'cognitive';

export type MissionLevel = {
  lv: 1 | 2 | 3 | 4 | 5;
  text: string;       // 骨格（汎用）
  why: string;        // なぜこれか（D）
  weeklyOnly?: true;  // 週次向き（重い認知ワーク等）
};

export type ProgramComponent = {
  id: ComponentId;
  fearAxis: FearAxis;
  kind: ComponentKind;
  // A: 恐れの正体
  fearDescription: string;
  // B: アプローチ
  approach: string;
  // C+D: Lv1~5のミッション/ワーク（whyはD）
  levels: MissionLevel[];
  // E: 記録項目
  recordBefore: string;   // やる前に聞くこと
  recordAfter: string;    // やった後に聞くこと
  answerCheckLabel: string; // 答え合わせの文言
  // F: 変化の兆し
  changeSignals: string[];
};

// ─────────────────────────────────────────────
// 8部品の識別子
// ─────────────────────────────────────────────

export type ComponentId =
  | 'EVAL_ACT'   // 部品① 評価 × 行動
  | 'CTRL_ACT'   // 部品② 制御 × 行動
  | 'IMP_ACT'    // 部品③ 不完全 × 行動
  | 'REL_ACT'    // 部品④ 関係 × 行動
  | 'EVAL_COG'   // 部品⑤ 評価 × 認知
  | 'CTRL_COG'   // 部品⑥ 制御 × 認知
  | 'IMP_COG'    // 部品⑦ 不完全 × 認知
  | 'REL_COG';   // 部品⑧ 関係 × 認知

// ─────────────────────────────────────────────
// 8部品のデータ
// ─────────────────────────────────────────────

export const PROGRAM_COMPONENTS: Record<ComponentId, ProgramComponent> = {

  // ① 評価への恐れ × 行動変更
  EVAL_ACT: {
    id: 'EVAL_ACT',
    fearAxis: 'F_EVAL',
    kind: 'action',
    fearDescription:
      '人から能力・価値を低く見られる恐れ。強いと見られる場面・試される場面を避け、挑戦・発言・人前を回避する。避けると安全だが成長と繋がりが止まる。',
    approach:
      '行動実験＋段階的曝露。「評価が怖い」の予測は現実より大げさ。小さく身をさらし「思ったより大丈夫」を積んで恐れを実物大に縮める。',
    levels: [
      { lv: 1, text: '店員や知らない人に質問する（関係が続かない相手）', why: '安全な相手から始めると、評価への恐れが予測より小さいと気づきやすいです。' },
      { lv: 2, text: '会話で「自分はこう思う」と小さな意見を一つ言う', why: '意見を言うと評価される、という予測を小さな場面で試します。たいてい何も起きません。' },
      { lv: 3, text: '分からないことを「知らないんだけど教えて」と素直に聞く', why: '"できない自分"を見せても、人は軽蔑しません。むしろ自然に助けてくれることの方が多い。それを確かめる実験です。' },
      { lv: 4, text: '会議・グループで一度だけ自分から発言する', why: '発言して恥をかく、という予測が実際に起きるか確かめます。' },
      { lv: 5, text: '完璧じゃない状態のものを、あえて人に見せる/提出する', why: '不完全な自分を見せることが、想定ほど悪い結果を生まないと体験します。' },
    ],
    recordBefore: 'どう思われると思う？（1〜5）',
    recordAfter: '実際どうだった？（1〜5）＋相手の反応メモ',
    answerCheckLabel: '「思ったより大丈夫」だった回数',
    changeSignals: [
      '評価前の不安が4→2.8に',
      '「思ったより大丈夫」が今月12回',
      '意見を言えた回数が増加',
    ],
  },

  // ② 制御への恐れ × 行動変更
  CTRL_ACT: {
    id: 'CTRL_ACT',
    fearAxis: 'F_CTRL',
    kind: 'action',
    fearDescription:
      '先が読めない・コントロールできない状況への恐れ。計画を固めたがり、不確実な誘い・展開を断つ。',
    approach:
      '行動実験。「読めない状況でも何とかなる」を体験し、「不確実＝危険」を緩める。',
    levels: [
      { lv: 1, text: '今日の予定を一つ、あえて決めずに空けておく', why: '決めなくても困らない体験を積みます。空白は怖くない、と少しずつ気づきます。' },
      { lv: 2, text: 'いつもと違う店・道・メニューを、調べずに選ぶ', why: '小さな未知に触れて、「想定外でも大丈夫」を体験します。' },
      { lv: 3, text: '相手に予定や店選びを任せる（主導権を渡す）', why: '人に任せると失敗するかもと思いがち。でも"任せた結果が案外悪くない"を確かめる実験です。' },
      { lv: 4, text: '先が読めない誘い（何するか未定の集まり等）を一回受ける', why: '未確定のまま動いても、何とかなる体験を積みます。' },
      { lv: 5, text: 'きっちり準備せず、その場の流れに任せて動く', why: '準備なしでも自分が対応できることを確かめます。' },
    ],
    recordBefore: 'どれくらい不安？（1〜5）',
    recordAfter: '実際どうなった？（自由記述）',
    answerCheckLabel: '想定した最悪は起きなかった回数',
    changeSignals: [
      '"決まってないと不安"が4→2.5に',
      '"任せても大丈夫"が今月◯回',
    ],
  },

  // ③ 不完全への恐れ × 行動変更
  IMP_ACT: {
    id: 'IMP_ACT',
    fearAxis: 'F_IMP',
    kind: 'action',
    fearDescription:
      '理想・基準に届かない不完全な状態への恐れ。完璧の見通しが立たないと動けず、中途半端を許せず手を出さない。',
    approach:
      '行動実験。「不完全なまま出しても世界は回る／評価は変わらない」を体験。あえて60点で出す曝露。',
    levels: [
      { lv: 1, text: 'やることを一つ「60点でいい」と決め、時間で区切って終える', why: '完璧を目指すと終われません。"60点で出す"を試すと、たいてい誰も困らないと分かります。' },
      { lv: 2, text: '下書き・未完成のものを直さずに一回出す', why: '不完全なまま出しても関係が壊れないことを確かめます。' },
      { lv: 3, text: '得意じゃないこと・初めてのことに、準備不足のまま手を出す', why: '"完璧にできる見通しが立たないと動けない"を、小さく崩す実験です。' },
      { lv: 4, text: '人に「ちゃんとできてないけど」と前置きして見せる/関わる', why: '不完全な自分を開示しても、人は想定ほど気にしないと体験します。' },
      { lv: 5, text: '失敗してもいい前提で、新しい挑戦を一つやる', why: '失敗が許される場所から挑戦を始めると、行動への敷居が下がります。' },
    ],
    recordBefore: '60点で出すの怖い？（1〜5）',
    recordAfter: '実際、問題起きた？（1〜5）',
    answerCheckLabel: '不完全でも大丈夫だった回数',
    changeSignals: [
      '"完璧じゃないと出せない"不安が4→2.7に',
      '60点で出せた回数◯回',
      '取りかかりが早くなった',
    ],
  },

  // ④ 関係喪失への恐れ × 行動変更
  REL_ACT: {
    id: 'REL_ACT',
    fearAxis: 'F_REL',
    kind: 'action',
    fearDescription:
      '大切な相手が離れる・見捨てられる恐れ。相手の反応に過敏になり、確かめずにいられない／嫌われないよう抑える／離れられる前に自分から引く。',
    approach:
      '行動実験。「確かめなくても関係は壊れない」「少し自分を出しても人は離れない」を体験。過剰な確認行動を減らす曝露。',
    levels: [
      { lv: 1, text: '返信が来なくても、すぐ追わず半日待つ', why: '半日待っても関係は壊れません。それを確かめる実験です。' },
      { lv: 2, text: '相手に合わせず、小さな希望を一つ伝える（「私はこっちがいい」）', why: '自分を少し出しても人は離れない、を試します。' },
      { lv: 3, text: '不安でも、確かめる連絡をせずに過ごす', why: '確認行動を一度減らすと、関係への影響がないと気づきます。' },
      { lv: 4, text: '軽い頼みごとをして、相手に少し負担をかける', why: '少し頼っても人は離れません。むしろ頼られて嬉しいことの方が多い。' },
      { lv: 5, text: '意見の食い違いを、飲み込まず伝える', why: '意見の違いを伝えても関係は壊れない、を体験します。' },
    ],
    recordBefore: '関係が悪くなりそうで怖い？（1〜5）',
    recordAfter: '実際どうだった？（1〜5）',
    answerCheckLabel: '不安は当たらなかった回数',
    changeSignals: [
      '"嫌われるかも"の不安が4→2.6に',
      '確かめずに済んだ回数が増加',
      '希望を言えた回数◯回',
    ],
  },

  // ⑤ 評価への恐れ × 認知変更
  EVAL_COG: {
    id: 'EVAL_COG',
    fearAxis: 'F_EVAL',
    kind: 'cognitive',
    fearDescription:
      '人から能力・価値を低く見られる恐れ。強いと見られる場面・試される場面を避け、挑戦・発言・人前を回避する。',
    approach:
      '認知再構成。「人は自分が思うほど自分を見ていない（スポットライト効果）」「評価＝自分の価値ではない」と捉え直す。',
    levels: [
      { lv: 1, text: '今日「評価が気になった場面」を一つ書き出す（観察するだけ）', why: '評価への反応に気づく練習です。書くだけでOK。' },
      { lv: 2, text: 'その時「相手は本当にそこまで自分を見ていた?」を考える', why: '人は自分のことで精一杯で、あなたが思うほどあなたを見ていません。' },
      { lv: 3, text: '「もし友達が同じ失敗をしたら、軽蔑する?」と問う', why: '他人の失敗は許せるのに自分には厳しい、その非対称に気づく。' },
      { lv: 4, text: '仕事や成果と関係なく、自分が大事にしてる/好きなことを3つ書く（例：料理が好き、友達に優しい）', why: '自分の価値は成果だけで決まらない、という別の評価軸を育てます。' },
      { lv: 5, text: 'もし親友が「仕事で失敗した」と落ち込んでたら何て声をかける? それを自分にも言う', why: '自分への厳しさを、他者への優しさと同じ目線に揃えます（セルフコンパッション）。' },
    ],
    recordBefore: '',
    recordAfter: '気づきメモ（自由記述）',
    answerCheckLabel: '「気にしすぎだったかも」と思えた回数',
    changeSignals: [
      '"評価が気になる"頻度が減少',
      '"気にしすぎだったかも"が今月◯回',
    ],
  },

  // ⑥ 制御への恐れ × 認知変更
  CTRL_COG: {
    id: 'CTRL_COG',
    fearAxis: 'F_CTRL',
    kind: 'cognitive',
    fearDescription:
      '先が読めない・コントロールできない状況への恐れ。計画を固めたがり、不確実な誘い・展開を断つ。',
    approach:
      '認知再構成。「全部はコントロールできないし、しなくていい」「不確実なことの多くは実際には悪い結果にならない」。',
    levels: [
      { lv: 1, text: '今日「"まだ決まってない・どうなるか分からない"でモヤっとしたこと」を書き出す', why: '不確実さへの反応に気づく練習です。まず書くだけ。' },
      { lv: 2, text: '「それは本当に自分がコントロールすべき?」を仕分け（自分の領域/領域外）', why: '世の中の多くは自分の領域外。"自分が何とかすべき"を手放すと肩の荷が下りる。' },
      { lv: 3, text: '過去に「心配したが実際は何とかなったこと」を3つ思い出す', why: '「案外何とかなる」というデータを自分で集めます。' },
      { lv: 4, text: 'この1ヶ月で「心配してたこと」のうち、実際に最悪な結果になったのは何個? と数える', why: '心配の数と、実際にダメだった数を並べると、たいてい心配が大幅に上回る。' },
      { lv: 5, text: '「読めなくても、その時対応すればいい」を自分の言葉で書く', why: '「どうにかなる」を外から借りるのでなく、自分の言葉で持つ練習です。' },
    ],
    recordBefore: '',
    recordAfter: '気づきメモ（自由記述）',
    answerCheckLabel: '「心配しすぎだったかも」と思えた回数',
    changeSignals: [
      '先のことへの心配の頻度が減少',
      '"何とかなった"と思えた回数◯回',
    ],
  },

  // ⑦ 不完全への恐れ × 認知変更
  IMP_COG: {
    id: 'IMP_COG',
    fearAxis: 'F_IMP',
    kind: 'cognitive',
    fearDescription:
      '理想・基準に届かない不完全な状態への恐れ。完璧の見通しが立たないと動けず、中途半端を許せず手を出さない。',
    approach:
      '認知再構成。「完璧でなくていい」「60点でも価値がある」「不完全さは人間らしさで、むしろ親しまれる」。全か無か思考を緩める。',
    levels: [
      { lv: 1, text: '今日「"あー、ちゃんとできなかったな"と思ったこと」を書き出す', why: '自己批判の瞬間に気づく練習です。書くだけでOK。' },
      { lv: 2, text: 'それは100点満点なら実際何点だった? と点数をつける', why: '完璧か失敗かの二択で見ると苦しい。"70点も十分"という中間に目を向ける。' },
      { lv: 3, text: '尊敬してる人・好きな人を一人思い浮かべ、その人の「完璧じゃないとこ」を一つ挙げる', why: '完璧じゃなくても、好かれ・尊敬されている人がいることに気づく。' },
      { lv: 4, text: '過去に「手を抜いた/ほどほどにしたのに、意外と問題なかったこと」を一つ思い出す', why: '"ほどほど"でも大丈夫だった実績を積むと、完璧基準が緩みます。' },
      { lv: 5, text: '「完璧じゃなくても、これでいい」と思えた瞬間が今日あったら書いておく', why: '「十分」という感覚を言語化することで、少しずつ自分に許可を出す練習です。' },
    ],
    recordBefore: '',
    recordAfter: '気づきメモ（自由記述）',
    answerCheckLabel: '「これで十分かも」と思えた回数',
    changeSignals: [
      '"ちゃんとしなきゃ"の頻度が減少',
      '"十分かも"と思えた回数◯回',
    ],
  },

  // ⑧ 関係喪失への恐れ × 認知変更
  REL_COG: {
    id: 'REL_COG',
    fearAxis: 'F_REL',
    kind: 'cognitive',
    fearDescription:
      '大切な相手が離れる・見捨てられる恐れ。相手の反応に過敏になり、破局的な解釈をしてしまう。',
    approach:
      '認知再構成。「相手の小さな反応＝見捨てられる、ではない」「自分を出しても関係は簡単には壊れない」。破局的思考を緩める。',
    levels: [
      { lv: 1, text: '今日「見捨てられそう/関係まずいと不安になった場面」を書き出す', why: '不安の引き金を観察する練習です。書くだけでOK。' },
      { lv: 2, text: '「相手のその反応に、別の解釈はない?」を考える', why: '"既読なのに返事がない＝嫌われた"以外にも解釈はたくさんある。一つの最悪な解釈に飛びつくクセに気づく。' },
      { lv: 3, text: '今日「"嫌われたかも・関係まずいかも"とドキッとした瞬間」あった? その後どうなった?（2段階）', why: '不安の後の現実を確認すると、たいてい心配は外れていたと気づきます。' },
      { lv: 4, text: '「気をつかわず自然体でいられる相手」は誰? を挙げる', why: 'その人との安心感を手がかりに、他の関係を見直すヒントを探します。' },
      { lv: 5, text: 'その人となぜ大丈夫なのか考える→「気をつかう相手」は本当に危険? それとも自分がそう予測してるだけ?', why: '"見捨てない"と信じてるから安心できる。その信頼を他の関係に少し広げる練習。', weeklyOnly: true },
    ],
    recordBefore: '',
    recordAfter: '気づきメモ（自由記述）',
    answerCheckLabel: '「考えすぎだったかも」と思えた回数',
    changeSignals: [
      '相手の反応に振り回される頻度が減少',
      '"考えすぎだったかも"が◯回',
    ],
  },
};

// ─────────────────────────────────────────────
// ユーザーのプログラム設定（配合エンジンの出力）
// ─────────────────────────────────────────────

export type ComponentWeight = {
  componentId: ComponentId;
  weight: number;   // 0〜1の相対比率（合計1）
  currentLv: 1 | 2 | 3 | 4 | 5;
};

export type ChangeOrientation =
  | 'change'    // 変わりたい・できるようになりたい（行動多め）
  | 'accept'    // 受け入れたい・楽になりたい（認知中心）
  | 'unknown';  // まだ分からない（中くらいから）

export type ProgramConfig = {
  userId: string;
  // 配合した部品と比率（最大4部品：恐れ上位2軸 × 行動/認知）
  components: ComponentWeight[];
  // 変わりたい方向（行動量の決定に使う）
  changeOrientation: ChangeOrientation;
  // 困り度（distress合計スコア、0〜20）
  distressLevel: number;
  // 開始日（ISO文字列）
  startedAt: string;
  // 現在の恐れフォーカス（今週取り組んでいる恐れ軸）
  currentFocus: FearAxis;
  // 週次フィードバックで最後に更新した日（ISO文字列）
  lastReviewedAt?: string;
};

// ─────────────────────────────────────────────
// AI生成プラン（オンボ完了時に一括生成して保存）
// ─────────────────────────────────────────────

// 30日の「地図」の1日分（配合エンジンが決定論的に算出）
export type ScheduledDay = {
  day: number;             // 1〜30
  componentId: ComponentId;
  kind: ComponentKind;
  lv: 1 | 2 | 3 | 4 | 5;
  heavy: boolean;          // 重い認知ワーク（まとまった時間が要る日）
};

// AIが文面を個別化したミッション
export type GeneratedMission = ScheduledDay & {
  title: string;  // 個別化されたミッション文
  why: string;    // 個別化された「なぜこれ」
};

// 治療方針（レポート）＋ようこそガイド＋30日ミッション
export type GeneratedPlan = {
  // 本人の自由記述・選択・恐れ/防衛スコアを統合し、一段抽象化した「結局この人は何に困っているか」の要約。
  // 全文面の土台に使う（具体例そのままは繰り返さない）。
  userInsight?: string;
  // 治療方針（レポートタブでいつでも見られる詳細）
  report: {
    currentState: string;    // 今の状態
    drainScene: string;      // 消耗する場面
    strengthReframe: string; // 本来の強み
    direction: string;       // どうなりたいか／これから何をやるか
  };
  // ようこそガイド（課金直後・一個ずつ「次へ」で進む）
  welcomeSteps: { title: string; body: string }[];
  // 30日分のミッション
  missions: GeneratedMission[];
  // 生成時のメタ
  config: ProgramConfig;
  generatedAt: string;
  // 生成フェーズ：preview=課金前（要約＋レポート＋ようこそ＋最初の数日）/ full=課金後（30日分すべて）
  phase?: 'preview' | 'full';
};

// ─────────────────────────────────────────────
// 後方互換: ダッシュボードが旧PROGRAM_CONTENTを使う間の shim
// ─────────────────────────────────────────────

// タイプ→主要恐れ軸のマッピング（blending実装後に削除予定）
const TYPE_PRIMARY_COMPONENT: Record<string, ComponentId> = {
  good_child:       'EVAL_ACT',
  people_pleaser:   'REL_ACT',
  over_considerate: 'REL_COG',
  perfectionist:    'IMP_ACT',
  over_carrier:     'IMP_COG',
  abandonment:      'REL_ACT',
  distancer:        'REL_COG',
  worrier:          'CTRL_ACT',
};

export type ProgramContent = {
  missionPool: { id: number; text: string; why: string }[];
  visualizationLabel: string;
  accumulator: string;
};

export const PROGRAM_CONTENT: Record<string, ProgramContent> = Object.fromEntries(
  Object.entries(TYPE_PRIMARY_COMPONENT).map(([typeId, compId]) => {
    const comp = PROGRAM_COMPONENTS[compId];
    return [
      typeId,
      {
        missionPool: comp.levels.map(l => ({ id: l.lv, text: l.text, why: l.why })),
        visualizationLabel: comp.changeSignals[0] ?? '',
        accumulator: comp.answerCheckLabel,
      } satisfies ProgramContent,
    ];
  })
);

export const TYPE_NAMES: Record<string, string> = {
  good_child: 'いい子・承認さん',
  people_pleaser: '顔色うかがいさん',
  over_considerate: '気づかいさん',
  perfectionist: '完璧主義さん',
  over_carrier: '抱え込みさん',
  abandonment: '見捨てられ不安さん',
  distancer: '距離をとりたいさん',
  worrier: '先回りさん',
};
