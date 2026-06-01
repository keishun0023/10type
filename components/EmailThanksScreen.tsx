'use client';

interface Props {
  onNextFeedback: () => void;
  onRestart: () => void;
}

export default function EmailThanksScreen({ onNextFeedback, onRestart }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-white px-5 py-12">
      <div className="w-full max-w-sm mx-auto space-y-8 flex-1">
        <div className="space-y-3 text-center pt-8">
          <div className="text-4xl">✉️</div>
          <h2 className="text-2xl font-bold text-stone-900">ありがとうございます！</h2>
          <p className="text-sm text-stone-500 leading-relaxed">
            レポートの準備ができたら、ご登録のメールアドレスにお送りします。
          </p>
        </div>

        <div className="bg-stone-50 rounded-2xl p-5 space-y-4">
          <p className="text-sm font-semibold text-stone-700 text-center">
            この結果、どれくらい当てはまりましたか?
          </p>
          <p className="text-xs text-stone-400 text-center">感想を教えてもらえると、診断がよくなります。</p>
          <button
            onClick={onNextFeedback}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors shadow-md shadow-indigo-200"
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
