'use client';

interface Props {
  onContinue: () => void;
  onBack: () => void;
}

export default function DistressIntroScreen({ onContinue, onBack }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-5 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Progress indicator */}
        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full w-4/5" />
        </div>

        {/* Content */}
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-2xl">
            🌡️
          </div>
          <h2 className="text-xl font-bold text-stone-900">
            ここからは<br />
            "困り度"を聞きます
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            今まで答えた傾向について、<br />
            <strong>実生活でどれくらい困っていますか・しんどいですか。</strong><br />
            <br />
            傾向が強くても、困っていなければ<br />
            あなたにとっての強みかもしれません。<br />
            直感で答えてください。
          </p>
        </div>

        {/* Scale preview */}
        <div className="bg-stone-50 rounded-2xl px-4 py-3 text-xs text-stone-500 text-center">
          0 = 全く困っていない　〜　5 = とても困っている
        </div>

        <button
          onClick={onContinue}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-4 rounded-2xl text-base transition-colors shadow-md shadow-indigo-200"
        >
          続ける（残り8問）
        </button>

        <button
          onClick={onBack}
          className="w-full py-2 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          ← 前の問いに戻る
        </button>
      </div>
    </div>
  );
}
