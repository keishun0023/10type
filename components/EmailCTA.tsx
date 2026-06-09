'use client';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';

interface Props {
  sessionId: string;
  firstTypeName: string;
}

export default function EmailCTA({ sessionId, firstTypeName }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

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
    setStatus('done');
  }

  if (status === 'done') {
    return (
      <div className="text-center py-4 text-sm text-indigo-600 font-medium">
        ありがとうございます！レポートの準備ができたらお送りします。
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="メールアドレスを入力"
        required
        className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-indigo-400 bg-white"
      />
      <button
        type="submit"
        disabled={status === 'loading' || !email}
        className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
      >
        {status === 'loading' ? '送信中...' : (
          <span className="inline-flex items-center justify-center gap-2">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
            詳細レポートとプログラムを受け取る
          </span>
        )}
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-500 text-center">エラーが発生しました。もう一度お試しください。</p>
      )}
    </form>
  );
}
