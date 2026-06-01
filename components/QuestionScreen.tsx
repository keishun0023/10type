'use client';

import { Question } from '@/data/questions';

const STRENGTH_LABELS = ['全く当てはまらない', 'ほとんど当てはまらない', 'あまり当てはまらない', '少し当てはまる', 'かなり当てはまる', 'とても当てはまる'];
const DISTRESS_LABELS = ['全く困っていない', '', '', '', '', 'とても困っている'];

interface Props {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  currentAnswer: number | undefined;
  onAnswer: (value: number) => void;
  onBack: () => void;
  isDistress: boolean;
}

export default function QuestionScreen({
  question,
  questionNumber,
  totalQuestions,
  currentAnswer,
  onAnswer,
  onBack,
  isDistress,
}: Props) {
  const progress = (questionNumber / totalQuestions) * 100;
  const remaining = totalQuestions - questionNumber;
  const labels = isDistress ? DISTRESS_LABELS : STRENGTH_LABELS;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header with progress */}
      <div className="px-5 pt-8 pb-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>{questionNumber} / {totalQuestions}</span>
          <span>残り {remaining} 問</span>
        </div>
        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col px-5 pt-8 pb-6">
        {isDistress && (
          <div className="mb-4 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg w-fit">
            実生活でどれくらい困っていますか
          </div>
        )}
        <p className="text-lg font-medium text-stone-900 leading-relaxed flex-1">
          {question.text}
        </p>

        {/* Scale */}
        <div className="mt-10 space-y-3">
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4, 5].map(value => (
              <button
                key={value}
                onClick={() => onAnswer(value)}
                className={`flex-1 h-14 rounded-xl text-base font-semibold transition-all duration-150 ${
                  currentAnswer === value
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200 active:scale-95'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-stone-400 px-1">
            <span>{labels[0]}</span>
            <span>{labels[5]}</span>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="px-5 pb-8">
        <button
          onClick={onBack}
          className="w-full py-3 text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          ← 前の問いに戻る
        </button>
      </div>
    </div>
  );
}
