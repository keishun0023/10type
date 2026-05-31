'use client';

import dynamic from 'next/dynamic';
import { Axis, AXIS_LABELS, ROOT_AXES } from '@/data/questions';
import { RootType, SYMPTOM_DESC, SYMPTOM_LABEL, SymptomAxis } from '@/data/types';
import { getTopSymptoms } from '@/lib/scoring';

const RadarChartComponent = dynamic(() => import('@/components/RadarChartComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] flex items-center justify-center text-stone-400 text-sm">
      チャート読み込み中…
    </div>
  ),
});

interface Props {
  firstType: RootType;
  secondType: RootType;
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

  // 根っこ4軸のうち最も高い軸
  const topRootAxis = ROOT_AXES.slice()
    .sort((a, b) => axisScores[b] - axisScores[a])[0];

  // 症状上位2軸
  const topSymptoms = getTopSymptoms(axisScores, 2);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 pt-12 pb-10 text-white">
        <div className="max-w-sm mx-auto space-y-3">
          {isPositiveMode && (
            <div className="text-xs font-medium bg-white/20 px-3 py-1.5 rounded-full inline-block">
              あなたはこの傾向を持ちつつ、うまく付き合えています
            </div>
          )}
          <div className="text-sm font-medium opacity-80">あなたの生きづらさの核は</div>
          <h1 className="text-3xl font-bold leading-tight">{firstType.name}</h1>
          <p className="text-sm opacity-90 leading-relaxed">{firstType.catch}</p>
          <div className="text-xs opacity-70">
            次いで <span className="font-semibold opacity-90">{secondType.name}</span> の傾向も
          </div>
          <div className="pt-1">
            <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full">
              {AXIS_LABELS[topRootAxis]}：{Math.round(axisScores[topRootAxis])}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 py-6 space-y-6">
        {/* Radar chart */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-700 mb-2">あなたの8軸ベクトル</h2>
          <RadarChartComponent axisScores={axisScores} />
        </div>

        {/* Symptoms — 因果の「その結果」 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-stone-700">
              その結果、あなたの場合はこう出ています
            </h2>
            <p className="text-xs text-stone-400">
              核の傾向が、以下の形で現れやすくなっています。
            </p>
          </div>
          <ul className="space-y-4">
            {topSymptoms.map(({ axis, score }) => (
              <li key={axis} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-700">
                    {SYMPTOM_LABEL[axis as SymptomAxis]}
                  </span>
                  <span className="text-xs text-stone-400">{Math.round(score)}</span>
                </div>
                <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-400 rounded-full"
                    style={{ width: `${score}%` }}
                  />
                </div>
                <p className="text-xs text-stone-500 leading-relaxed">
                  {SYMPTOM_DESC[axis as SymptomAxis]}
                </p>
              </li>
            ))}
          </ul>
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
          ビッグファイブ／CBTの考え方をベースにしています。医療診断ではありません。<br />
          核→症状の因果方向は仮説であり、検証中です。
        </p>
      </div>
    </div>
  );
}
