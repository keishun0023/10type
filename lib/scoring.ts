import { FearAxis, DefenseAxis, FEAR_AXES, DEFENSE_AXES, Question } from '@/data/questions';
import { TYPES, DiagType } from '@/data/types';

export function calculateFearScores(
  answers: Record<string, number>,
  questions: Question[]
): Record<FearAxis, number> {
  const scores: Partial<Record<FearAxis, number>> = {};
  for (const axis of FEAR_AXES) {
    const axisQs = questions.filter(q => q.kind === 'fear' && q.axis === axis);
    let total = 0;
    for (const q of axisQs) {
      const raw = answers[q.id] ?? 0;
      total += q.reverse ? 5 - raw : raw;
    }
    scores[axis] = (total / 25) * 100;
  }
  return scores as Record<FearAxis, number>;
}

export function calculateDefenseScores(
  answers: Record<string, number>,
  questions: Question[]
): Record<DefenseAxis, number> {
  const scores: Partial<Record<DefenseAxis, number>> = {};
  for (const axis of DEFENSE_AXES) {
    const axisQs = questions.filter(q => q.kind === 'defense' && q.axis === axis);
    const posQs = axisQs.filter(q => q.pole === 'pos');
    const negQs = axisQs.filter(q => q.pole === 'neg');
    const posAvg = posQs.length > 0
      ? posQs.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0) / posQs.length
      : 0;
    const negAvg = negQs.length > 0
      ? negQs.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0) / negQs.length
      : 0;
    scores[axis] = (posAvg / 5) * 100 - (negAvg / 5) * 100;
  }
  return scores as Record<DefenseAxis, number>;
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

const FEAR_AXES_ORDER: FearAxis[] = ['F_REL', 'F_EVAL', 'F_IMP', 'F_CTRL'];
const DEFENSE_AXES_ORDER: DefenseAxis[] = ['D_APP', 'D_ACT', 'D_EXP'];

export function findTypes(
  fearScores: Record<FearAxis, number>,
  defenseScores: Record<DefenseAxis, number>
): { first: DiagType; second: DiagType } {
  const userVector = [
    ...FEAR_AXES_ORDER.map(a => fearScores[a]),
    ...DEFENSE_AXES_ORDER.map(a => defenseScores[a]),
  ];

  const ranked = TYPES.map(type => ({
    type,
    dist: euclidean(userVector, type.profile),
  })).sort((a, b) => a.dist - b.dist);

  return { first: ranked[0].type, second: ranked[1].type };
}

export function getRetypeCandidates(
  fearScores: Record<FearAxis, number>,
  defenseScores: Record<DefenseAxis, number>,
  excludeId: string
): DiagType[] {
  const userVector = [
    ...FEAR_AXES_ORDER.map(a => fearScores[a]),
    ...DEFENSE_AXES_ORDER.map(a => defenseScores[a]),
  ];
  return TYPES
    .filter(t => t.id !== excludeId)
    .map(t => ({ type: t, dist: euclidean(userVector, t.profile) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3)
    .map(x => x.type);
}
