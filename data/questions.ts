export type FearAxis = 'F_REL' | 'F_EVAL' | 'F_IMP' | 'F_CTRL';
export type DefenseAxis = 'D_APP' | 'D_ACT' | 'D_EXP';
export type Axis = FearAxis | DefenseAxis;

export const FEAR_AXES: FearAxis[] = ['F_REL', 'F_EVAL', 'F_IMP', 'F_CTRL'];
export const DEFENSE_AXES: DefenseAxis[] = ['D_APP', 'D_ACT', 'D_EXP'];

export type Question = {
  id: string;
  text: string;
  axis: Axis;
  kind: 'fear' | 'defense' | 'distress';
  pole?: 'pos' | 'neg'; // defense only: pos=接近/能動/表出, neg=回避/受動/抑制
  reverse?: boolean;    // fear only
};

export const AXIS_LABELS: Record<Axis, string> = {
  F_REL: '関係喪失',
  F_EVAL: '評価失墜',
  F_IMP: '不完全性',
  F_CTRL: '制御不能',
  D_APP: '回避↔接近',
  D_ACT: '受動↔能動',
  D_EXP: '抑制↔表出',
};

export const FEAR_QUESTIONS: Question[] = [
  // F_REL（5問）
  { id: 'REL1', axis: 'F_REL', text: '親しい人から連絡が来ないと、「嫌われたのかも」と不安になる。', kind: 'fear' },
  { id: 'REL2', axis: 'F_REL', text: '大切な相手との関係が、いつか終わってしまう気がして落ち着かない。', kind: 'fear' },
  { id: 'REL3', axis: 'F_REL', text: '相手の態度が少しそっけないだけで、見捨てられるのではと感じる。', kind: 'fear' },
  { id: 'REL4', axis: 'F_REL', text: '親しい人には、できるだけ嫌われないよう気をつけている。', kind: 'fear' },
  { id: 'REL5', axis: 'F_REL', text: '親しい相手と少し距離があっても、関係が壊れる心配はあまりしない。', kind: 'fear', reverse: true },

  // F_EVAL（5問）
  { id: 'EVAL1', axis: 'F_EVAL', text: '仕事や課題でミスをすると、「能力がないと思われた」と感じてしばらく引きずる。', kind: 'fear' },
  { id: 'EVAL2', axis: 'F_EVAL', text: '他の人と比べて、自分が劣っていないか気になる。', kind: 'fear' },
  { id: 'EVAL3', axis: 'F_EVAL', text: '発表・提出・テストなど、評価される場面の前は必要以上に緊張する。', kind: 'fear' },
  { id: 'EVAL4', axis: 'F_EVAL', text: '「できない人だと思われたくない」という気持ちが、行動の動機になっている。', kind: 'fear' },
  { id: 'EVAL5', axis: 'F_EVAL', text: '評価される場面でも、あまり緊張せず自然体でいられる。', kind: 'fear', reverse: true },

  // F_IMP（5問）
  { id: 'IMP1', axis: 'F_IMP', text: '「これくらいでいい」が自分には許せず、なかなか終われない。', kind: 'fear' },
  { id: 'IMP2', axis: 'F_IMP', text: 'ミスが一つあると、全体が台無しになった気がする。', kind: 'fear' },
  { id: 'IMP3', axis: 'F_IMP', text: '自分のなかの「こうあるべき」基準に届かないと、強く落ち込む。', kind: 'fear' },
  { id: 'IMP4', axis: 'F_IMP', text: '完璧にできる見通しが立たないと、なかなか取りかかれない。', kind: 'fear' },
  { id: 'IMP5', axis: 'F_IMP', text: '60点くらいの出来でも、「まあいいか」と自分を許せる。', kind: 'fear', reverse: true },

  // F_CTRL（5問）
  { id: 'CTRL1', axis: 'F_CTRL', text: '予定が決まっていないと落ち着かず、先に計画を固めたくなる。', kind: 'fear' },
  { id: 'CTRL2', axis: 'F_CTRL', text: '「もし最悪のことが起きたら」と、起きてもいないことを何度も想定してしまう。', kind: 'fear' },
  { id: 'CTRL3', axis: 'F_CTRL', text: '想定外のことが起きると、強く動揺する。', kind: 'fear' },
  { id: 'CTRL4', axis: 'F_CTRL', text: '物事が自分のコントロールの外にあると、強い不安を感じる。', kind: 'fear' },
  { id: 'CTRL5', axis: 'F_CTRL', text: '予想外のことが起きても、その場で柔軟に対応できるほうだ。', kind: 'fear', reverse: true },
];

export const DEFENSE_QUESTIONS: Question[] = [
  // D_APP（4問）
  { id: 'APP1', axis: 'D_APP', text: '悩み事があるとき、人に相談したり頼ったりする。', kind: 'defense', pole: 'pos' },
  { id: 'APP2', axis: 'D_APP', text: '人と一緒にいると安心する。', kind: 'defense', pole: 'pos' },
  { id: 'AVO1', axis: 'D_APP', text: '困っていても、人に頼らず自分一人で抱えようとする。', kind: 'defense', pole: 'neg' },
  { id: 'AVO2', axis: 'D_APP', text: '人と深く関わると気疲れして、距離を取りたくなる。', kind: 'defense', pole: 'neg' },

  // D_ACT（4問）
  { id: 'ACT1', axis: 'D_ACT', text: '不安なことがあると、自分から動いて解決しようとする。', kind: 'defense', pole: 'pos' },
  { id: 'ACT2', axis: 'D_ACT', text: '問題が起きたら、先回りして対処するほうだ。', kind: 'defense', pole: 'pos' },
  { id: 'PAS1', axis: 'D_ACT', text: 'つらいことがあると、関わりを避けてやり過ごす。', kind: 'defense', pole: 'neg' },
  { id: 'PAS2', axis: 'D_ACT', text: '気が進まないことは、つい後回しにして動けなくなる。', kind: 'defense', pole: 'neg' },

  // D_EXP（4問）
  { id: 'SUP1', axis: 'D_EXP', text: '本当は嫌でも、その場では言わずに飲み込んでしまう。', kind: 'defense', pole: 'neg' },
  { id: 'SUP2', axis: 'D_EXP', text: '自分の感情や欲求は、表に出さないようにしている。', kind: 'defense', pole: 'neg' },
  { id: 'EXP1', axis: 'D_EXP', text: '不安や不満を感じたら、相手に伝えるほうだ。', kind: 'defense', pole: 'pos' },
  { id: 'EXP2', axis: 'D_EXP', text: '感情は、ためずにその場で出すほうだ。', kind: 'defense', pole: 'pos' },
];

export const DISTRESS_QUESTIONS: Question[] = [
  { id: 'DIS_REL',  axis: 'F_REL',  text: '人との関係を失う不安で、生活や気持ちがしんどくなることがある。', kind: 'distress' },
  { id: 'DIS_EVAL', axis: 'F_EVAL', text: '人からの評価を気にしすぎて、苦しくなることがある。', kind: 'distress' },
  { id: 'DIS_IMP',  axis: 'F_IMP',  text: '完璧にやろうとして、動けない・終われないことに困っている。', kind: 'distress' },
  { id: 'DIS_CTRL', axis: 'F_CTRL', text: '先のことを心配しすぎて、消耗することがある。', kind: 'distress' },
];
