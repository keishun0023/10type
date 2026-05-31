import { AXES, Axis, Question, ROOT_AXES, SYMPTOM_AXES } from '@/data/questions';
import { ROOT_TYPES, RootType, SymptomAxis } from '@/data/types';

export function calculateAxisScores(
  answers: Record<string, number>,
  questions: Question[]
): Record<Axis, number> {
  const scores: Partial<Record<Axis, number>> = {};

  for (const axis of AXES) {
    const axisQs = questions.filter(q => q.axis === axis && q.kind === 'strength');
    let total = 0;
    for (const q of axisQs) {
      const raw = answers[q.id] ?? 0;
      total += q.reverse ? 5 - raw : raw;
    }
    scores[axis] = (total / 20) * 100;
  }

  return scores as Record<Axis, number>;
}

export function calculateDistressTotal(
  answers: Record<string, number>,
  questions: Question[]
): number {
  return questions
    .filter(q => q.kind === 'distress')
    .reduce((sum, q) => sum + (answers[q.id] ?? 0), 0);
}

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, v, i) => sum + Math.pow(v - b[i], 2), 0));
}

// 根っこ4軸のみでユークリッド距離を計算してタイプ判定
export function findTypes(axisScores: Record<Axis, number>): {
  first: RootType;
  second: RootType;
} {
  const rootVector = ROOT_AXES.map(a => axisScores[a]);

  const ranked = ROOT_TYPES.map(type => ({
    type,
    dist: euclidean(rootVector, type.profile),
  })).sort((a, b) => a.dist - b.dist);

  return { first: ranked[0].type, second: ranked[1].type };
}

// 選び直し候補：指定タイプを除いた残りを距離近い順に上位3つ
export function getRetypeCandidates(
  axisScores: Record<Axis, number>,
  excludeTypeId: string
): RootType[] {
  const rootVector = ROOT_AXES.map(a => axisScores[a]);
  return ROOT_TYPES
    .filter(t => t.id !== excludeTypeId)
    .map(t => ({ type: t, dist: euclidean(rootVector, t.profile) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3)
    .map(x => x.type);
}

// 症状4軸をスコア降順で返す（結果画面の「その結果」表示用）
export function getTopSymptoms(
  axisScores: Record<Axis, number>,
  topN = 2
): { axis: SymptomAxis; score: number }[] {
  return (SYMPTOM_AXES as SymptomAxis[])
    .map(axis => ({ axis, score: axisScores[axis] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
