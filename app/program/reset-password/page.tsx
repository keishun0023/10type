'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

function ResetPasswordInner() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    // Supabaseがリセットリンクのトークンを自動処理するのを待つ
    sb.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
    // すでにセッションがある場合も対応
    sb.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setStatus('error');
      setErrorMsg('パスワードが一致しません');
      return;
    }
    if (password.length < 6) {
      setStatus('error');
      setErrorMsg('パスワードは6文字以上で入力してください');
      return;
    }
    setStatus('loading');
    const sb = getSupabase();
    if (!sb) { setStatus('error'); setErrorMsg('接続エラー'); return; }
    const { error } = await sb.auth.updateUser({ password });
    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }
    setStatus('success');
    setTimeout(() => router.push('/program/dashboard'), 2000);
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-4xl">✅</p>
          <h1 className="text-xl font-bold text-stone-900">パスワードを変更しました</h1>
          <p className="text-sm text-stone-500">ダッシュボードに移動します...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <p className="text-2xl">🔑</p>
          <h1 className="text-xl font-bold text-stone-900">新しいパスワードを設定</h1>
          <p className="text-sm text-stone-500">6文字以上で入力してください</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-stone-500">新しいパスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-3.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-purple-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-stone-500">確認（もう一度入力）</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-3.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-purple-400"
            />
          </div>

          {status === 'error' && <p className="text-xs text-red-500">{errorMsg}</p>}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full py-4 rounded-full font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
          >
            {status === 'loading' ? '変更中...' : 'パスワードを変更する'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}
