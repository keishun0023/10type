'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Axis, AXES, AXIS_LABELS } from '@/data/questions';
import { TypeData } from '@/data/types';

const RadarChartComponent = dynamic(() => import('@/components/RadarChartComponent'), {
  ssr: false,
  loading: () => <div className="h-[280px] flex items-center justify-center text-stone-400 text-sm">チャート読み込み中…</div>,
});

interface Props {
  firstType: TypeData;
  secondType: TypeData;
  axisScores: Record<Axis, number>;
  distressTotal: number;
  onRestart: () => void;
}

export default function ResultScreen({
  firstType,
  secondType,
  axisScores,
  distressTotal,
  onRestart,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const isPositiveMode = distressTotal < 10;

  const shareText = `私の生きづらさのかたちは「${firstType.name}」でした。\n${firstType.catch}\n\nあなたの"生きづらさのかたち"を、8つの軸で確認してみませんか。`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: '内在化タイプ診断', text: shareText });
      } catch {
        // User cancelled, do nothing
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  // Top 3 highest axes for this user
  const sortedAxes = AXES.slice()
    .sort((a, b) => axisScores[b] - axisScores[a])
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero section */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 pt-12 pb-10 text-white">
        <div className="max-w-sm mx-auto space-y-4">
          {isPositiveMode && (
            <div className="text-xs font-medium bg-white/20 px-3 py-1.5 rounded-full inline-block">
              あなたはこの傾向を持ちつつ、うまく付き合えています
            </div>
          )}
          <div className="text-sm font-medium opacity-80">あなたの生きづらさのかたちは</div>
          <h1 className="text-3xl font-bold leading-tight">{firstType.name}</h1>
          <p className="text-sm opacity-90 leading-relaxed">{firstType.catch}</p>

          <div className="flex flex-wrap gap-2 pt-1">
            {sortedAxes.map(axis => (
              <span
                key={axis}
                className="text-xs bg-white/20 px-2.5 py-1 rounded-full"
              >
                {AXIS_LABELS[axis]}：{Math.round(axisScores[axis])}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 py-6 space-y-6">
        {/* Radar chart + 2nd type */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-stone-700 mb-2">あなたの8軸ベクトル</h2>
          <RadarChartComponent axisScores={axisScores} />
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-500">
            <span className="shrink-0">次いで</span>
            <span className="font-semibold text-stone-700">{secondType.name}</span>
            <span>の傾向も</span>
          </div>
        </div>

        {/* Aruaru */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-stone-700">こんなこと、ありませんか？</h2>
          <ul className="space-y-3">
            {firstType.aruaru.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm text-stone-700 leading-relaxed">
                <span className="text-indigo-400 font-bold mt-0.5 shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Bad cycle */}
        <div className="bg-amber-50 rounded-2xl p-5 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold text-amber-800">ハマりがちな悪循環</h2>
          <p className="text-sm text-amber-900 leading-relaxed">{firstType.badCycle}</p>
        </div>

        {/* Paid teaser (blurred) */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-sm font-semibold text-stone-700 mb-1">
              楽になるための、あなた専用の習慣プラン
            </h2>
            <p className="text-xs text-stone-500">
              {isPositiveMode
                ? 'この傾向をさらにうまく活かすための、あなただけの小さな習慣。'
                : '「わかる」の次は「楽になれるかもしれない」へ。'}
            </p>
          </div>

          {/* Blurred content */}
          <div className="relative px-5 pb-5">
            <div className="blur-sm select-none pointer-events-none space-y-2 text-sm text-stone-600">
              <div className="bg-stone-50 rounded-xl p-3">
                <div className="font-medium">ステップ1 ／ 毎朝1分</div>
                <div className="text-stone-400 text-xs mt-1">{firstType.paidTeaser}</div>
              </div>
              <div className="bg-stone-50 rounded-xl p-3">
                <div className="font-medium">ステップ2 ／ 気づきの記録</div>
                <div className="text-stone-400 text-xs mt-1">変化が見えるから、続けたくなる。</div>
              </div>
            </div>

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-[1px] rounded-xl">
              <p className="text-xs text-stone-500 text-center px-4">
                {firstType.paidTeaser}
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-md shadow-indigo-200 transition-colors"
              >
                続きを見る
              </button>
            </div>
          </div>
        </div>

        {/* Share */}
        <button
          onClick={handleShare}
          className={`w-full py-4 rounded-2xl text-sm font-semibold border-2 transition-all ${
            shareSuccess
              ? 'border-green-500 text-green-600 bg-green-50'
              : 'border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50'
          }`}
        >
          {shareSuccess ? '✓ コピーしました' : 'この結果をシェアする'}
        </button>

        {/* Restart */}
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

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-5"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-stone-900">準備中です</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              習慣プランと変化の記録機能は、現在開発中です。
              楽になるための、あなた専用のプランをお届けできるよう準備しています。
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
