export type Axis = 'Anx' | 'Ang' | 'Dep' | 'SC' | 'Imp' | 'Vul' | 'Sac' | 'Perf';

export type Question = {
  id: string;
  axis: Axis;
  text: string;
  reverse: boolean;
  kind: 'strength' | 'distress';
};

export const AXES: Axis[] = ['Anx', 'Ang', 'Dep', 'SC', 'Imp', 'Vul', 'Sac', 'Perf'];

export const AXIS_LABELS: Record<Axis, string> = {
  Anx: '不安',
  Ang: '怒り抑圧',
  Dep: '抑うつ',
  SC: '自意識',
  Imp: '衝動性',
  Vul: '傷つきやすさ',
  Sac: '自己犠牲',
  Perf: '完璧主義',
};

export const QUESTIONS: Question[] = [
  // 軸1：不安 (Anx)
  { id: 'Q1', axis: 'Anx', text: '先のことを考えると、まだ何も起きていないのに胸がざわつくことが多い。', reverse: false, kind: 'strength' },
  { id: 'Q2', axis: 'Anx', text: '「もし最悪のことが起きたら」と、頼まれてもいないのに頭の中でシミュレーションしている。', reverse: false, kind: 'strength' },
  { id: 'Q3', axis: 'Anx', text: '小さな決断でも「これで合っているか」と何度も確認したくなる。', reverse: false, kind: 'strength' },
  { id: 'Q4', axis: 'Anx', text: 'これから起きることについて、たいていは「なんとかなる」と楽観できている。', reverse: true, kind: 'strength' },

  // 軸2：怒り抑圧 (Ang)
  { id: 'Q5', axis: 'Ang', text: '本当は嫌なのに、その場では笑って受け入れてしまう。', reverse: false, kind: 'strength' },
  { id: 'Q6', axis: 'Ang', text: '後になってから「あの時こう言い返せばよかった」と腹が立つことが多い。', reverse: false, kind: 'strength' },
  { id: 'Q7', axis: 'Ang', text: 'イライラを表に出せず、自分の中に溜め込んでいる感覚がある。', reverse: false, kind: 'strength' },
  { id: 'Q8', axis: 'Ang', text: '怒りや不満を感じたら、その場で穏やかに相手に伝えられる。', reverse: true, kind: 'strength' },

  // 軸3：抑うつ (Dep)
  { id: 'Q9', axis: 'Dep', text: '自分には価値がないと感じる瞬間が、ふとした時に訪れる。', reverse: false, kind: 'strength' },
  { id: 'Q10', axis: 'Dep', text: '以前は楽しめたことが、最近はあまり楽しいと感じられない。', reverse: false, kind: 'strength' },
  { id: 'Q11', axis: 'Dep', text: '何をするにも「どうせ」という気持ちが先に立つ。', reverse: false, kind: 'strength' },
  { id: 'Q12', axis: 'Dep', text: '自分のことを、おおむね好きだと思える。', reverse: true, kind: 'strength' },

  // 軸4：自意識 (SC)
  { id: 'Q13', axis: 'SC', text: '人と話したあと、「変に思われなかったか」を何度も思い返す。', reverse: false, kind: 'strength' },
  { id: 'Q14', axis: 'SC', text: '会議や集まりで、意見を求められると正解より「場に合う答え」を探してしまう。', reverse: false, kind: 'strength' },
  { id: 'Q15', axis: 'SC', text: '他人が小声で話していると、自分のことを言われている気がする。', reverse: false, kind: 'strength' },
  { id: 'Q16', axis: 'SC', text: '人からどう見られているかは、あまり気にならない。', reverse: true, kind: 'strength' },

  // 軸5：衝動性 (Imp)
  { id: 'Q17', axis: 'Imp', text: 'ストレスがたまると、つい食べすぎたり買いすぎたりしてしまう。', reverse: false, kind: 'strength' },
  { id: 'Q18', axis: 'Imp', text: '「やめておこう」と思っても、その場の欲求に流されてしまうことがある。', reverse: false, kind: 'strength' },
  { id: 'Q19', axis: 'Imp', text: '感情が高ぶると、後で後悔する行動を取ってしまう。', reverse: false, kind: 'strength' },
  { id: 'Q20', axis: 'Imp', text: '誘惑があっても、自分で決めたことはたいてい守れる。', reverse: true, kind: 'strength' },

  // 軸6：傷つきやすさ (Vul)
  { id: 'Q21', axis: 'Vul', text: '強いストレスがかかると、頭が真っ白になって対処できなくなる。', reverse: false, kind: 'strength' },
  { id: 'Q22', axis: 'Vul', text: '予定外のことが重なると、パニックに近い状態になる。', reverse: false, kind: 'strength' },
  { id: 'Q23', axis: 'Vul', text: '人の何気ない一言を、長く引きずってしまう。', reverse: false, kind: 'strength' },
  { id: 'Q24', axis: 'Vul', text: '困難な状況でも、落ち着いて一つずつ対応できるほうだ。', reverse: true, kind: 'strength' },

  // 軸7：自己犠牲 (Sac)
  { id: 'Q25', axis: 'Sac', text: '相手の頼みを断ると、罪悪感でいっぱいになる。', reverse: false, kind: 'strength' },
  { id: 'Q26', axis: 'Sac', text: '自分の予定より、人の都合を優先してしまうことが多い。', reverse: false, kind: 'strength' },
  { id: 'Q27', axis: 'Sac', text: '「嫌われたくない」が、自分の行動を決める大きな理由になっている。', reverse: false, kind: 'strength' },
  { id: 'Q28', axis: 'Sac', text: '自分の希望を、相手に遠慮なく伝えられる。', reverse: true, kind: 'strength' },

  // 軸8：完璧主義 (Perf)
  { id: 'Q29', axis: 'Perf', text: '「これくらいでいい」が自分には許せず、なかなか終われない。', reverse: false, kind: 'strength' },
  { id: 'Q30', axis: 'Perf', text: '1つでもミスがあると、全体が台無しになった気がする。', reverse: false, kind: 'strength' },
  { id: 'Q31', axis: 'Perf', text: '着手する前に「完璧にできる自信」がないと、なかなか始められない。', reverse: false, kind: 'strength' },
  { id: 'Q32', axis: 'Perf', text: '60点でも、出してしまえばいいと思える。', reverse: true, kind: 'strength' },

  // 困り度設問（各軸1問）
  { id: 'D1', axis: 'Anx', text: '心配しすぎることで、生活や仕事に支障が出ている。', reverse: false, kind: 'distress' },
  { id: 'D2', axis: 'Ang', text: '感情を飲み込むことで、後からしんどくなっている。', reverse: false, kind: 'distress' },
  { id: 'D3', axis: 'Dep', text: '気分の落ち込みで、やるべきことが手につかないことがある。', reverse: false, kind: 'distress' },
  { id: 'D4', axis: 'SC', text: '人目が気になりすぎて、やりたいことを我慢している。', reverse: false, kind: 'distress' },
  { id: 'D5', axis: 'Imp', text: '衝動的な行動の後悔で、自分を責めている。', reverse: false, kind: 'distress' },
  { id: 'D6', axis: 'Vul', text: '些細なことで消耗し、回復に時間がかかって困っている。', reverse: false, kind: 'distress' },
  { id: 'D7', axis: 'Sac', text: '人を優先しすぎて、自分がすり減っていると感じる。', reverse: false, kind: 'distress' },
  { id: 'D8', axis: 'Perf', text: '完璧を求めすぎて、動けない・終われないことに困っている。', reverse: false, kind: 'distress' },
];

export const STRENGTH_QUESTIONS = QUESTIONS.filter(q => q.kind === 'strength');
export const DISTRESS_QUESTIONS = QUESTIONS.filter(q => q.kind === 'distress');
