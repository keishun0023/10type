'use client';

import dynamic from 'next/dynamic';
import { Axis, AXES, AXIS_LABELS } from '@/data/questions';
import { TypeData } from '@/data/types';

const RadarChartComponent = dynamic(() => import('@/components/RadarChartComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] flex items-center justify-center text-stone-400 text-sm">
      チャート読み込み中…
    </div>
  ),
});

interface Props {
  firstType: TypeData;
  secondType: TypeData;
  axisScores: Record<Axis, number>;
  distressTotal: number;
  onRestart: () => void;
  onNextFeedback: () => void;
}

export default function ResultScreen({
  firstType,
  secondType,
  axisScores,
  distressTotal,
  onRestart,
  onNextFeedback,
}: Props) {
  const isPositiveMode = distressTotal < 10;

  const sortedAxes = AXES.slice()
    .sort((a, b) => axisScores[b] - axisScores[a])
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 pt-12 pb-10 text-white">
        <div className="max-w-sm mx-auto space-y-4">
          {isPositiveMode && (
            <div className="text-xs font-medium bg-white/20 px-3 py-1.5 rounded-full inline-block">
              あなたはこの傾向を持ちつつ、うまく付き合えています
            </div>
          )}
          <div className="text-sm font-medium opacity-80">あなたの生きづらさのかたちは</div>
          <h1 className="text-2xl font-bold leading-tight">
            {firstType.name}<span className="opacity-60 mx-1">×</span>{secondType.name}
          </h1>
          <p className="text-sm opacity-90 leading-relaxed">{firstType.catch}</p>
          <p className="text-sm opacity-80 leading-relaxed">{secondType.catch}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {sortedAxes.map(axis => (
              <span key={axis} className="text-xs bg-white/20 px-2.5 py-1 rounded-full">
                {AXIS_LABELS[axis]}：{Math.round(axisScores[axis])}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 py-6 space-y-6">
        {/* Radar chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-700 mb-2">あなたの8軸ベクトル</h2>
          <RadarChartComponent axisScores={axisScores} />
        </div>

        {/* Aruaru - 両タイプ */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-5">
          <h2 className="text-sm font-semibold text-stone-700">こんなこと、ありませんか？</h2>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-indigo-500">{firstType.name}</div>
            <ul className="space-y-3">
              {firstType.aruaru.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-stone-700 leading-relaxed">
                  <span className="text-indigo-400 font-bold mt-0.5 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-stone-100 pt-4 space-y-3">
            <div className="text-xs font-semibold text-violet-500">{secondType.name}</div>
            <ul className="space-y-3">
              {secondType.aruaru.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-stone-700 leading-relaxed">
                  <span className="text-violet-400 font-bold mt-0.5 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bad cycle - 両タイプ */}
        <div className="bg-amber-50 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-amber-800">ハマりがちな悪循環</h2>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-amber-700">{firstType.name}</div>
            <p className="text-sm text-amber-900 leading-relaxed">{firstType.badCycle}</p>
          </div>

          <div className="border-t border-amber-200 pt-4 space-y-1">
            <div className="text-xs font-semibold text-amber-700">{secondType.name}</div>
            <p className="text-sm text-amber-900 leading-relaxed">{secondType.badCycle}</p>
          </div>
        </div>

        {/* Feedback CTA */}
        <div className="bg-stone-50 rounded-2xl p-5 space-y-3">
          <p className="text-sm font-semibold text-stone-700 text-center">
            この結果、どれくらい当てはまりましたか？
          </p>
          <p className="text-xs text-stone-400 text-center">感想を教えてもらえると、診断がよくなります。</p>
          <button
            onClick={onNextFeedback}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors shadow-md shadow-indigo-200"
          >
            フィードバックを答える（30秒）
          </button>
        </div>

        <button
          onClick={onRestart}
          className="w-full py-3 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          もう一度診断する
        </button>

        <p className="text-xs text-stone-400 text-center pb-4 leading-relaxed">
          ビッグファイブ／CBTの考え方をベースにしています。医療診断ではありません。
        </p>
      </div>
    </div>
  );
}
