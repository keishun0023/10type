'use client';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';

interface Props {
  sessionId: string;
  firstTypeName: string;
  onSuccess: () => void;
}

export default function EmailInputScreen({ sessionId, firstTypeName, onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    const sb = getSupabase();
    if (!sb) { setStatus('error'); return; }
    const { error } = await sb.from('leads').insert({
      email,
      session_id: sessionId,
      first_type_name: firstTypeName,
      created_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }).replace(' ', 'T') + '+09:00',
    });
    if (error) { setStatus('error'); return; }
    onSuccess();
  }

  return (
    <div className="min-h-screen flex flex-col bg-white px-5 py-12">
      <div className="w-full max-w-sm mx-auto space-y-8 flex-1">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-stone-900 leading-snug">
            あなた専用のレポートを<br />お送りします
          </h2>
          <p className="text-sm text-stone-500 leading-relaxed">
            診断では見えなかった数値の詳細と、{firstTypeName}のあなたに向けた具体的なプログラムを、メールでお届けします。
          </p>
        </div>

        <div className="bg-stone-50 rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">お届けする内容</p>
          <ul className="space-y-2 text-sm text-stone-700">
            <li className="flex gap-2"><span className="text-indigo-400 shrink-0">✓</span><span>あなたの恐れ4軸と防衛スタイルの詳細スコア</span></li>
            <li className="flex gap-2"><span className="text-indigo-400 shrink-0">✓</span><span>{firstTypeName}が消耗しやすい場面とパターン分析</span></li>
            <li className="flex gap-2"><span className="text-indigo-400 shrink-0">✓</span><span>今日から試せる、あなた向けの練習プログラム</span></li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="メールアドレスを入力"
            required
            className="w-full px-4 py-3.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
          />
          <button
            type="submit"
            disabled={status === 'loading' || !email}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-md shadow-indigo-200 disabled:opacity-50"
          >
            {status === 'loading' ? '送信中...' : '▶ 詳細レポートとプログラムを受け取る'}
          </button>
          {status === 'error' && (
            <p className="text-xs text-red-500 text-center">エラーが発生しました。もう一度お試しください。</p>
          )}
        </form>
      </div>
    </div>
  );
}
