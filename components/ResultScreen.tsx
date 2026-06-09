'use client';

import { useEffect } from 'react';
import { FearAxis, DefenseAxis } from '@/data/questions';
import { DiagType, TYPE_CONTENT } from '@/data/types';
import { fbqEvent } from '@/lib/pixel';

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
    i % 2 === 1 ? (
      <strong key={i} className="font-bold text-stone-900 underline decoration-indigo-200 decoration-4 underline-offset-2">
        {part}
      </strong>
    ) : part
  );
}

export default function ResultScreen({
  firstType,
  onShowEmailInput,
}: Props) {
  const content = TYPE_CONTENT[firstType.id];

  useEffect(() => {
    fbqEvent('ViewContent', { content_name: firstType.name });
  }, [firstType.name]);

  if (!content) return null;

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* ① ヒーローセクション */}
      <div className="px-6 pt-10 pb-8 bg-stone-50">
        <div className="max-w-sm mx-auto text-center space-y-4">
          <span className="inline-block px-4 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-medium tracking-wide">
            診断タイプ
          </span>
          <h1 className="text-2xl font-bold text-stone-900 leading-snug">
            あなたは「<span className="text-indigo-600 underline decoration-indigo-200 decoration-4 underline-offset-4">{firstType.name}</span>」です
          </h1>
          <div className="relative py-4">
            <div className="absolute inset-0 bg-indigo-100/40 rounded-full blur-3xl -z-10 scale-90" />
            <img
              src={`/illustrations/${firstType.id}.png`}
              alt={firstType.name}
              className="w-72 h-72 object-contain mx-auto"
            />
          </div>
          <p className="text-sm text-stone-500 leading-relaxed">{content.subtitle}</p>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 space-y-8 pb-10">
        {/* ② あるある共感セクション */}
        <div className="rounded-3xl overflow-hidden bg-stone-50 border border-stone-100">
          <div className="px-5 py-6 space-y-5">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <img src="/section-relatable-title.png" alt="" className="w-8 h-8 object-contain" />
              こんなこと、ありませんか？
            </h2>
            <ul className="space-y-4">
              {content.relatable.map((text, i) => {
                const isLast = i === content.relatable.length - 1;
                if (isLast) {
                  return (
                    <li key={i} className="flex items-start gap-3 p-4 bg-white/70 rounded-2xl border-l-4 border-indigo-500">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                      <p className="text-sm font-bold text-stone-900 leading-relaxed">{text}</p>
                    </li>
                  );
                }
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                    <p className="text-sm text-stone-700 leading-relaxed">{text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* ③ なぜそうなるセクション */}
        <div className="rounded-3xl bg-stone-50 border border-stone-100 relative">
          <img src="/section-why-bg.png" alt="" className="absolute top-8 right-2 w-40 h-40 object-contain opacity-15 pointer-events-none" />
          <div className="px-5 py-6 space-y-5 relative z-10">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <img src="/section-why-title.png" alt="" className="w-8 h-8 object-contain" />
              どうして、こうなるんだろう？
            </h2>
            <div className="space-y-4 text-sm text-stone-700 leading-relaxed">
              {content.why.map((para, i) => {
                if (i === 1) {
                  return (
                    <div key={i} className="bg-white rounded-2xl border border-stone-200 px-5 py-4 italic text-stone-600 leading-relaxed">
                      {renderBold(para)}
                    </div>
                  );
                }
                return <p key={i}>{renderBold(para)}</p>;
              })}
            </div>
          </div>
        </div>

        {/* ④ CTAセクション */}
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <h2 className="text-xl font-bold text-stone-900 leading-snug">
              理由がわかったら、<br />次は「軽くする」番です。
            </h2>
            <p className="text-sm text-stone-500 leading-relaxed">
              あなたが少しずつ、{content.ctaPain}に<br />振り回されずに済むように。
            </p>
          </div>

          <div className="space-y-3">
            {[
              { img: '/result-icon-1.png', label: '4つの恐れと防衛スタイルを可視化' },
              { img: '/result-icon-2.png', label: '消耗しやすいシーンの分析' },
              { img: '/result-icon-3.png', label: '今日から試せる練習プログラム' },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl px-5 py-4 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)' }}>
                <img src={item.img} alt="" className="w-12 h-12 object-contain shrink-0" />
                <span className="text-sm font-bold text-stone-700 leading-snug">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={onShowEmailInput}
              className="w-full h-16 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
              <span>詳細レポートとプログラムを受け取る</span>
              <span className="text-lg opacity-70">›</span>
            </button>

          </div>
        </div>

        {/* フッター */}
        <div className="pt-4 border-t border-stone-200">
          <div className="bg-stone-100 rounded-2xl p-4 text-center">
            <p className="text-xs text-stone-400 leading-relaxed">
              ※本結果は医療診断ではありません。<br />
              ビッグファイブ／CBT（認知行動療法）の考え方をベースにした自己分析ツールです。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
