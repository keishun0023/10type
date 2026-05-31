import { AXES, Axis, Question } from '@/data/questions';
import { TYPES, TypeData } from '@/data/types';

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

function euclidean(userVec: number[], profile: number[]): number {
  return Math.sqrt(profile.reduce((sum, val, i) => sum + Math.pow(userVec[i] - val, 2), 0));
}

// プロファイルでH(75)の軸インデックス一覧
function mainAxisIndices(profile: number[]): number[] {
  return profile.map((v, i) => (v === 75 ? i : -1)).filter(i => i >= 0);
}

export function findTypes(axisScores: Record<Axis, number>): {
  first: TypeData;
  second: TypeData;
  matchMode: 'exact' | 'partial' | 'distance';
} {
  const userVec = AXES.map(a => axisScores[a]);

  // ユーザーの上位2軸インデックス（スコア降順）
  const top2Indices = AXES
    .map((_, i) => ({ i, score: userVec[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(x => x.i)
    .sort((a, b) => a - b);

  const withDist = TYPES.map(type => ({
    type,
    dist: euclidean(userVec, type.profile),
    mainIdx: mainAxisIndices(type.profile),
  }));

  // ① 主役軸がちょうど2つ かつ ユーザー上位2軸と完全一致
  const exactMatch = withDist.find(({ mainIdx }) => {
    if (mainIdx.length !== 2) return false;
    const sorted = [...mainIdx].sort((a, b) => a - b);
    return sorted[0] === top2Indices[0] && sorted[1] === top2Indices[1];
  });

  if (exactMatch) {
    const rest = withDist.filter(x => x.type.id !== exactMatch.type.id);
    const second = rest.sort((a, b) => a.dist - b.dist)[0].type;
    return { first: exactMatch.type, second, matchMode: 'exact' };
  }

  // ② 上位2軸のうち少なくとも1つを主役に含む候補から距離最小
  const candidates = withDist.filter(({ mainIdx }) =>
    top2Indices.some(ti => mainIdx.includes(ti))
  );

  if (candidates.length > 0) {
    const first = candidates.sort((a, b) => a.dist - b.dist)[0].type;
    const rest = withDist.filter(x => x.type.id !== first.id);
    const second = rest.sort((a, b) => a.dist - b.dist)[0].type;
    return { first, second, matchMode: 'partial' };
  }

  // ③ 候補ゼロ → 純粋距離最小（複合・バランス型）
  const sorted = withDist.sort((a, b) => a.dist - b.dist);
  console.warn('[10type] matchMode=distance: no candidate matched top2 axes', top2Indices);
  return { first: sorted[0].type, second: sorted[1].type, matchMode: 'distance' };
}
