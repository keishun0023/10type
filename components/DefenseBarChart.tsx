'use client';

import { DefenseAxis } from '@/data/questions';

interface Props {
  defenseScores: Record<DefenseAxis, number>;
}

const BARS: { axis: DefenseAxis; negLabel: string; posLabel: string }[] = [
  { axis: 'D_APP', negLabel: '回避', posLabel: '接近' },
  { axis: 'D_ACT', negLabel: '受動', posLabel: '能動' },
  { axis: 'D_EXP', negLabel: '抑制', posLabel: '表出' },
];

export default function DefenseBarChart({ defenseScores }: Props) {
  return (
    <div className="space-y-4">
      {BARS.map(({ axis, negLabel, posLabel }) => {
        const score = defenseScores[axis] ?? 0;
        // score: -100 to +100 → percent: 0 to 100
        const percent = (score + 100) / 2;
        const isNeg = score < -10;
        const isPos = score > 10;

        return (
          <div key={axis} className="space-y-1.5">
            <div className="flex justify-between text-xs text-stone-400 font-medium">
              <span className={isNeg ? 'text-indigo-500 font-bold' : ''}>{negLabel}</span>
              <span className={isPos ? 'text-teal-500 font-bold' : ''}>{posLabel}</span>
            </div>
            <div className="relative w-full h-3 bg-stone-100 rounded-full overflow-hidden">
              {/* center line */}
              <div className="absolute left-1/2 top-0 w-px h-full bg-stone-300" />
              {score >= 0 ? (
                <div
                  className="absolute top-0 h-full rounded-full bg-teal-400"
                  style={{ left: '50%', width: `${percent - 50}%` }}
                />
              ) : (
                <div
                  className="absolute top-0 h-full rounded-full bg-indigo-400"
                  style={{ right: `${50}%`, width: `${50 - percent}%` }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
