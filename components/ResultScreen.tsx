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
    <div className="min-h-screen bg-stone-50">
      {/* ① ヒーローセクション */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-5 pt-12 pb-10 text-white">
        <div className="max-w-sm mx-auto space-y-3">
          {isPositiveMode && (
            <div className="text-xs font-medium bg-white/20 px-3 py-1.5 rounded-full inline-block">
              あなたはこの傾向を持ちつつ、うまく付き合えています
            </div>
          )}
          <h1 className="text-2xl font-bold leading-tight">{content.hero}</h1>
          <p className="text-sm opacity-80 leading-relaxed">{content.subtitle}</p>
          <div className="text-xs opacity-70">
            次いで <span className="font-semibold opacity-90">{secondType.name}</span> の傾向も
          </div>
          <div className="h-32 bg-white/10 rounded-2xl flex items-center justify-center text-white/40 text-sm mt-4">
            イラスト（準備中）
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 py-6 space-y-6">
        {/* ② あるある共感セクション */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-stone-700">こんなこと、ありませんか?</h2>
          <ul className="space-y-2">
            {content.relatable.map((text, i) => {
              const isLast = i === content.relatable.length - 1;
              return (
                <li key={i} className="flex gap-2 text-sm leading-relaxed">
                  <span className="text-indigo-400 mt-0.5">・</span>
                  <span className={isLast ? 'font-semibold text-stone-800' : 'text-stone-600'}>
                    {text}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ③ なぜそうなるセクション */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-stone-700">どうして、こうなるんだろう?</h2>
          <div className="text-sm text-stone-600 leading-relaxed">
            {content.why.map((para, i) => {
              if (i === 1) {
                return (
                  <p key={i} className="bg-indigo-50 rounded-xl px-4 py-3 mb-3">
                    {para}
                  </p>
                );
              }
              return (
                <p key={i} className="mb-3">
                  {para}
                </p>
              );
            })}
          </div>
        </div>

        {/* ④ CTAセクション */}
        <div className="bg-stone-50 rounded-2xl p-5 space-y-4 border border-stone-100">
          <h2 className="text-sm font-semibold text-stone-800">
            理由がわかったら、次は「軽くする」番です。
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            あなたが少しずつ、{content.ctaPain}に振り回されずに済むように。
          </p>
          <ul className="space-y-2 text-sm text-stone-600">
            <li className="flex gap-2">
              <span className="text-indigo-400 mt-0.5">・</span>
              <span>あなたの「生きづらさの4つの恐れ」と「防衛スタイル」を数値で可視化</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 mt-0.5">・</span>
              <span>{firstType.name}が、いつ・どんな場面で消耗しやすいかのパターン分析</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 mt-0.5">・</span>
              <span>今日から試せる、あなた向けの小さな練習プログラム</span>
            </li>
          </ul>

          {/* ぼかしプレースホルダー */}
          <div className="space-y-2 mt-2">
            <div className="blur-sm select-none bg-stone-100 rounded-lg px-4 py-3 text-sm text-stone-500">
              ██████████ █████ ██████ ████ ███████
            </div>
            <div className="blur-sm select-none bg-stone-100 rounded-lg px-4 py-3 text-sm text-stone-500">
              ████████ ██████████ █████ ████
            </div>
          </div>

          <EmailCTA sessionId={sessionId} firstTypeName={firstType.name} />
        </div>

        {/* ⑤ FBセクション */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-stone-700 text-center">
            この結果、どれくらい当てはまりましたか?
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
