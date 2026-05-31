'use client';

interface Props {
  typeName: string;
  onRate: (rating: number) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'ぜんぜん',
  2: 'あまり',
  3: 'まあまあ',
  4: 'けっこう',
  5: 'すごく',
};

export default function FeedbackScreen({ typeName, onRate }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-5 py-12">
      <div className="w-full max-w-sm space-y-10">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="text-xs text-stone-400 font-medium">フィードバック</div>
          <h2 className="text-xl font-bold text-stone-900 leading-snug">
            「{typeName}」という結果、<br />
            どれくらい当てはまりましたか？
          </h2>
          <p className="text-sm text-stone-500">
            正直な感想を教えてください。
          </p>
        </div>

        {/* Rating buttons */}
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map(rating => (
            <button
              key={rating}
              onClick={() => onRate(rating)}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-stone-100 bg-white hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.98] transition-all text-left"
            >
              <span className="text-xl font-bold text-indigo-500 w-6 shrink-0">{rating}</span>
              <span className="text-sm font-medium text-stone-700">{RATING_LABELS[rating]}当てはまる</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
