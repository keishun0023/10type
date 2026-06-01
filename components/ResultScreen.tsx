'use client';

import { FearAxis, DefenseAxis } from '@/data/questions';
import { DiagType, TYPE_CONTENT } from '@/data/types';
import EmailCTA from '@/components/EmailCTA';

interface Props {
  firstType: DiagType;
  secondType: DiagType;
  fearScores: Record<FearAxis, number>;
  defenseScores: Record<DefenseAxis, number>;
  distressTotal: number;
  sessionId: string;
  onRestart: () => void;
  onNextFeedback: () => void;
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
  onRestart,
  onNextFeedback,
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
        <div className="space-y-4">
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
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-stone-900">どうして、こうなるんだろう?</h2>
          <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
            {content.why.map((para, i) => (
              <p key={i}>{renderBold(para)}</p>
            ))}
          </div>
        </div>

        {/* ④ CTAセクション */}
        <div className="bg-stone-50 rounded-2xl p-5 space-y-4 border border-stone-100">
          <h2 className="text-base font-bold text-stone-900">
            理由がわかったら、次は「軽くする」番です。
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            あなたが少しずつ、{content.ctaPain}に振り回されずに済むように。
          </p>
          <ul className="space-y-2 text-sm text-stone-600">
            <li className="flex gap-2">
              <span className="text-indigo-400 shrink-0">・</span>
              <span>あなたの「生きづらさの4つの恐れ」と「防衛スタイル」を数値で可視化</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 shrink-0">・</span>
              <span>{firstType.name}が、いつ・どんな場面で消耗しやすいかのパターン分析</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 shrink-0">・</span>
              <span>今日から試せる、あなた向けの小さな練習プログラム</span>
            </li>
          </ul>

          <div className="space-y-2">
            <div className="blur-sm select-none bg-white rounded-lg px-4 py-3 text-sm text-stone-400 border border-stone-100">
              ██████████ █████ ██████ ████ ███████
            </div>
            <div className="blur-sm select-none bg-white rounded-lg px-4 py-3 text-sm text-stone-400 border border-stone-100">
              ████████ ██████████ █████ ████
            </div>
          </div>

          <EmailCTA sessionId={sessionId} firstTypeName={firstType.name} />
        </div>

        {/* ⑤ FBセクション */}
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold text-stone-700">
            この結果、どれくらい当てはまりましたか?
          </p>
          <p className="text-xs text-stone-400">感想を教えてもらえると、診断がよくなります。</p>
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
