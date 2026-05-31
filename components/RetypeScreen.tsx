'use client';

import { useState } from 'react';
import { RootType } from '@/data/types';

interface Props {
  candidates: RootType[];
  onSubmit: (selectedTypeId: string | null) => void; // null = どれにも当てはまらない
}

export default function RetypeScreen({ candidates, onSubmit }: Props) {
  const [selected, setSelected] = useState<string | 'none' | null>(null);

  const handleSubmit = () => {
    if (selected === null) return;
    onSubmit(selected === 'none' ? null : selected);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white px-5 py-12">
      <div className="w-full max-w-sm mx-auto space-y-8 flex-1">
        <div className="space-y-2">
          <div className="text-xs text-stone-400 font-medium">選び直し</div>
          <h2 className="text-xl font-bold text-stone-900 leading-snug">
            では、どれが一番<br />近そうでしたか？
          </h2>
          <p className="text-xs text-stone-500">
            タイプ名だけでなく説明文も読んで選んでください。
          </p>
        </div>

        <div className="space-y-3">
          {candidates.map(type => (
            <button
              key={type.id}
              onClick={() => setSelected(type.id)}
              className={`w-full text-left px-4 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                selected === type.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-stone-100 bg-white hover:border-stone-300'
              }`}
            >
              <div className="font-semibold text-stone-900 text-sm mb-1">{type.name}</div>
              <div className="text-xs text-stone-500 leading-relaxed">{type.catch}</div>
              <div className="text-xs text-indigo-400 mt-1.5">恐れていること：{type.fear}</div>
            </button>
          ))}

          <button
            onClick={() => setSelected('none')}
            className={`w-full text-left px-4 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
              selected === 'none'
                ? 'border-stone-400 bg-stone-50'
                : 'border-stone-100 bg-white hover:border-stone-300'
            }`}
          >
            <div className="font-semibold text-stone-500 text-sm">どれにも当てはまらない</div>
          </button>
        </div>
      </div>

      <div className="w-full max-w-sm mx-auto pt-6">
        <button
          onClick={handleSubmit}
          disabled={selected === null}
          className={`w-full py-4 rounded-2xl text-sm font-semibold transition-all ${
            selected !== null
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
              : 'bg-stone-100 text-stone-400 cursor-not-allowed'
          }`}
        >
          送信する
        </button>
      </div>
    </div>
  );
}
