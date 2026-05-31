export type RootType = {
  id: string;
  name: string;
  profile: number[]; // [Sac, SC, Perf, Anx]
  fear: string;
  catch: string;
};

export const ROOT_TYPES: RootType[] = [
  {
    id: 'good_child',
    name: 'いい子・承認型',
    profile: [75, 50, 50, 25],
    fear: '期待に応えられないこと',
    catch: '「ちゃんとしなきゃ」で動き続けるあなたへ。',
  },
  {
    id: 'perfectionist',
    name: '完璧主義型',
    profile: [25, 50, 75, 50],
    fear: '不完全であること',
    catch: '自分の理想に、自分が一番届かない。',
  },
  {
    id: 'people_pleaser',
    name: '顔色うかがい・過敏型',
    profile: [50, 75, 25, 50],
    fear: '嫌われている・変に見られること',
    catch: 'いつも「どう見られてる？」が頭にある。',
  },
  {
    id: 'abandonment',
    name: '見捨てられ不安型',
    profile: [75, 50, 25, 75],
    fear: '特定の関係が切れること',
    catch: '返信が遅いだけで、世界が揺らぐ。',
  },
  {
    id: 'over_carrier',
    name: '抱え込み型',
    profile: [75, 25, 75, 50],
    fear: '自分がやらないと回らないこと',
    catch: '全部背負って、全部自分で潰れてしまう前に。',
  },
];

export type SymptomAxis = 'Ang' | 'Imp' | 'Vul' | 'Dep';

export const SYMPTOM_LABEL: Record<SymptomAxis, string> = {
  Ang: '怒りを飲み込みやすい',
  Imp: '衝動的になりやすい',
  Vul: '傷つきやすい・消耗しやすい',
  Dep: '気分が落ち込みやすい',
};

export const SYMPTOM_DESC: Record<SymptomAxis, string> = {
  Ang: '本当は嫌でも、その場では受け入れて飲み込んでしまう',
  Imp: '我慢の反動で、つい食べすぎ・買いすぎてしまう',
  Vul: '些細なことで消耗し、回復に時間がかかる',
  Dep: '「どうせ」と落ち込み、自分の価値を感じにくくなる',
};
