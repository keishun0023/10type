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

export function findTypes(axisScores: Record<Axis, number>): {
  first: TypeData;
  second: TypeData;
} {
  const userVec = AXES.map(a => axisScores[a]);

  const ranked = TYPES.map(type => ({
    type,
    dist: Math.sqrt(
      type.profile.reduce((sum, val, i) => sum + Math.pow(userVec[i] - val, 2), 0)
    ),
  })).sort((a, b) => a.dist - b.dist);

  return { first: ranked[0].type, second: ranked[1].type };
}
