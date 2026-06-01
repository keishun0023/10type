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
    i % 2 === 1 ? <strong key={i} className="font-semibold text-stone-800">{part}</strong> : part
  );
}

export default function ResultScreen({
  firstType,
  secondType,
  distressTotal,
  sessionId,
  onShowEmailInput,
}: Props) {
  const isPositiveMode = distressTotal < 5;
  const content = TYPE_CONTENT[firstType.id];

  if (!content) return null;

  return (
    <div className="min-h-screen bg-white">
      {/* ① ヒーローセクション */}
      <div className="bg-stone-50 px-5 pt-12 pb-8">
        <div className="max-w-sm mx-auto space-y-3">
          {isPositiveMode && (
            <div className="text-xs font-medium bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full inline-block">
              あなたはこの傾向を持ちつつ、うまく付き合えています
            </div>
          )}
          <h1 className="text-3xl font-bold text-stone-900 leading-tight">{content.hero}</h1>
          {/* イラスト */}
          <div className="flex justify-center">
            <img
              src={`/illustrations/${firstType.id}.png`}
              alt={firstType.name}
              className="w-64 h-64 object-contain"
            />
          </div>
          <p className="text-sm text-stone-500 leading-relaxed">{content.subtitle}</p>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 py-8 space-y-10">
        {/* ② あるある共感セクション */}
        <div className="bg-amber-50 rounded-2xl p-5 space-y-4">
          <h2 className="text-xl font-bold text-stone-900">こんなこと、ありませんか?</h2>
          <ul className="space-y-3">
            {content.relatable.map((text, i) => {
              const isLast = i === content.relatable.length - 1;
              return (
                <li key={i} className="flex gap-3 leading-relaxed">
                  <span className="text-indigo-300 mt-0.5 shrink-0">・</span>
                  <span className={isLast ? 'font-semibold text-stone-800 text-base' : 'text-stone-600 text-sm'}>
                    {text}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ③ なぜそうなるセクション */}
        <div className="bg-amber-50 rounded-2xl p-5 space-y-4">
          <h2 className="text-xl font-bold text-stone-900">どうして、こうなるんだろう?</h2>
          <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
            {content.why.map((para, i) => (
              <p key={i}>{renderBold(para)}</p>
            ))}
          </div>
        </div>

        {/* ④ CTAセクション */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xl font-bold text-stone-900">
            理由がわかったら、次は「軽くする」番です。
          </h2>
          <p className="text-base text-stone-700 leading-relaxed">
            あなたが少しずつ、{content.ctaPain}に振り回されずに済むように。
          </p>
          <ul className="space-y-2 text-sm text-stone-600">
            <li>・あなたの「生きづらさの4つの恐れ」と「防衛スタイル」を数値で可視化</li>
            <li>・{firstType.name}が、いつ・どんな場面で消耗しやすいかのパターン分析</li>
            <li>・今日から試せる、あなた向けの小さな練習プログラム</li>
          </ul>
          <div className="space-y-2">
            <div className="blur-sm select-none bg-stone-100 rounded-lg px-4 py-3 text-sm text-stone-400">
              ██████████ █████ ██████ ████ ███████
            </div>
            <div className="blur-sm select-none bg-stone-100 rounded-lg px-4 py-3 text-sm text-stone-400">
              ████████ ██████████ █████ ████
            </div>
          </div>
          <button
            onClick={onShowEmailInput}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-md shadow-indigo-200"
          >
            ▶ 詳細レポートとプログラムを受け取る
          </button>
        </div>
      </div>
    </div>
  );
}
