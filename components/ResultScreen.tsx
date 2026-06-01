'use client';

import dynamic from 'next/dynamic';
import { FearAxis, DefenseAxis, FEAR_AXES, DEFENSE_AXES, AXIS_LABELS } from '@/data/questions';
import { DiagType, ARARUA } from '@/data/types';

const RadarChartComponent = dynamic(() => import('@/components/RadarChartComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] flex items-center justify-center text-stone-400 text-sm">
      チャート読み込み中…
    </div>
  ),
});

interface Props {
  firstType: DiagType;
  secondType: DiagType;
  fearScores: Record<FearAxis, number>;
  defenseScores: Record<DefenseAxis, number>;
  distressTotal: number;
  onRestart: () => void;
  onNextFeedback: () => void;
}

const DEFENSE_LABELS: Record<DefenseAxis, { neg: string; pos: string }> = {
  D_APP: { neg: '回避', pos: '接近' },
  D_ACT: { neg: '受動', pos: '能動' },
  D_EXP: { neg: '抑制', pos: '表出' },
};

export default function ResultScreen({
  firstType,
  secondType,
  fearScores,
  defenseScores,
  distressTotal,
  onRestart,
  onNextFeedback,
}: Props) {
  const isPositiveMode = distressTotal < 5;
  const ararua = ARARUA[firstType.id] ?? [];

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
              主な恐れ: {firstType.fear}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 py-6 space-y-6">
        {/* Radar chart — 恐れ4軸 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-700 mb-2">恐れの4軸プロファイル</h2>
          <RadarChartComponent fearScores={fearScores} />
        </div>

        {/* Defense 3軸バー表示 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-stone-700">防衛スタイル（3軸）</h2>
          {DEFENSE_AXES.map(axis => {
            const score = defenseScores[axis];
            const pct = Math.round(score);
            const posWidth = score > 0 ? Math.min(score, 100) : 0;
            const negWidth = score < 0 ? Math.min(-score, 100) : 0;
            const { neg, pos } = DEFENSE_LABELS[axis];
            return (
              <div key={axis} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>{AXIS_LABELS[axis]}</span>
                  <span>{pct > 0 ? '+' : ''}{pct}</span>
                </div>
                <div className="flex w-full h-3 rounded-full overflow-hidden bg-stone-100">
                  {/* neg side */}
                  <div className="flex-1 flex justify-end">
                    <div
                      className="h-full bg-rose-400 rounded-l-full"
                      style={{ width: `${negWidth}%` }}
                    />
                  </div>
                  {/* center divider */}
                  <div className="w-px bg-stone-300" />
                  {/* pos side */}
                  <div className="flex-1">
                    <div
                      className="h-full bg-indigo-400 rounded-r-full"
                      style={{ width: `${posWidth}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-stone-400">
                  <span>{neg}</span>
                  <span>{pos}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* あるある共感文 */}
        {ararua.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-semibold text-stone-700">こんなこと、ありませんか？</h2>
            <ul className="space-y-2">
              {ararua.map((text, i) => (
                <li key={i} className="flex gap-2 text-sm text-stone-600 leading-relaxed">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

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
