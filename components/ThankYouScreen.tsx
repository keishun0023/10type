'use client';

interface Props {
  onRestart: () => void;
}

export default function ThankYouScreen({ onRestart }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-5 py-12">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-4">
          <div className="text-5xl">🙏</div>
          <h2 className="text-2xl font-bold text-stone-900">ありがとうございました</h2>
          <p className="text-sm text-stone-500 leading-relaxed">
            あなたのフィードバックは、<br />
            診断をより良くするために活かされます。
          </p>
        </div>

        <div className="bg-indigo-50 rounded-2xl px-5 py-4 text-sm text-indigo-700 leading-relaxed">
          ビッグファイブ／CBTの考え方をベースにした<br />
          「楽になるための習慣プラン」を、現在準備中です。
        </div>

        <button
          onClick={onRestart}
          className="w-full py-4 rounded-2xl border-2 border-stone-100 text-sm font-medium text-stone-500 hover:border-stone-300 hover:text-stone-700 transition-all"
        >
          もう一度診断する
        </button>
      </div>
    </div>
  );
}
