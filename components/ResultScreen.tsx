'use client';

import { FearAxis, DefenseAxis } from '@/data/questions';
import { DiagType, TYPE_CONTENT } from '@/data/types';

interface Props {
  firstType: DiagType;
  secondType: DiagType;
  fearScores: Record<FearAxis, number>;
  defenseScores: Record<DefenseAxis, number>;
  distressTotal: number;
  sessionId: string;
  onRestart: () => void;
  onShowEmailInput: () => void;
}

function renderBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-bold text-stone-900">{part}</strong> : part
  );
}

export default function ResultScreen({
  firstType,
  distressTotal,
  onShowEmailInput,
}: Props) {
  const isPositiveMode = distressTotal < 5;
  const content = TYPE_CONTENT[firstType.id];

  if (!content) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* ① ヒーローセクション */}
      <div className="px-5 pt-10 pb-6">
        <div className="max-w-sm mx-auto text-center space-y-3">
          <div className="inline-block border border-stone-300 text-stone-500 text-xs px-3 py-1 rounded-full">
            {isPositiveMode ? 'うまく付き合えています' : '診断タイプ'}
          </div>
          <h1 className="text-2xl font-bold text-stone-900 leading-snug">{content.hero}</h1>
          <p className="text-sm text-stone-500 leading-relaxed">{content.subtitle}</p>
          <div className="flex justify-center pt-2">
            <img
              src={`/illustrations/${firstType.id}.png`}
              alt={firstType.name}
              className="w-64 h-64 object-contain"
            />
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 pb-10 space-y-10">
        {/* ② あるある共感セクション */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <span className="text-xl">😊</span> こんなこと、ありませんか？
          </h2>
          <ul className="space-y-3">
            {content.relatable.map((text, i) => {
              const isLast = i === content.relatable.length - 1;
              if (isLast) {
                return (
                  <li key={i} className="border-l-4 border-indigo-400 pl-4 py-1 text-sm font-semibold text-stone-800 leading-relaxed bg-indigo-50 rounded-r-xl pr-3">
                    {text}
                  </li>
                );
              }
              return (
                <li key={i} className="flex gap-3 text-sm text-stone-600 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-400 mt-2 shrink-0" />
                  {text}
                </li>
              );
            })}
          </ul>
        </div>

        {/* ③ なぜそうなるセクション */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-stone-200 text-stone-600 text-xs flex items-center justify-center font-bold shrink-0">?</span>
            どうして、こうなるんだろう？
          </h2>
          <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
            {content.why.map((para, i) => {
              if (i === 1) {
                return (
                  <blockquote key={i} className="border-l-2 border-stone-300 pl-4 text-stone-500 italic leading-relaxed">
                    {renderBold(para)}
                  </blockquote>
                );
              }
              return <p key={i}>{renderBold(para)}</p>;
            })}
          </div>
        </div>

        {/* ④ CTAセクション */}
        <div className="space-y-5">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-stone-900">
              理由はわかったら、<br />次は「軽くする」番です。
            </h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              あなたが少しずつ、{content.ctaPain}に<br />振り回されずに済むように。
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: '📊', label: '4つの恐れと\n防衛スタイルを可視化' },
              { icon: '📋', label: '消耗しやすい\nシーンの分析' },
              { icon: '✏️', label: '今日から試せる\n練習プログラム' },
            ].map((item, i) => (
              <div key={i} className="bg-teal-50 rounded-2xl px-5 py-4 flex items-center gap-4">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm font-medium text-stone-700 whitespace-pre-line">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-1">
            <button
              onClick={onShowEmailInput}
              className="w-full py-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-colors shadow-lg shadow-indigo-200 flex items-center justify-between px-6"
            >
              <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs">▶</span>
              <span>詳細レポートとプログラムを受け取る</span>
              <span className="text-white/60">›</span>
            </button>
            <p className="text-xs text-stone-400 text-center">所要時間：約3分 / 完全無料</p>
          </div>
        </div>
      </div>
    </div>
  );
}
