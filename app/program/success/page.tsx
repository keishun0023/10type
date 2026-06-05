'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { getSupabaseServer } from '@/lib/supabase-server';
import { TYPE_NAMES } from '@/data/program';

function SuccessPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id') || '';

  const [step, setStep] = useState<'account' | 'done'>('account');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Stripeセッションからメタデータを取得
  const [meta, setMeta] = useState<{ email: string; typeId: string; plan: string; onboarding: Record<string, string>; diagSession: string } | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/checkout-session?session_id=${sessionId}`)
      .then(r => r.json())
      .then(data => {
        setMeta(data);
        if (data.email) setEmail(data.email);
      });
  }, [sessionId]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!meta) return;
    setStatus('loading');
    const sb = getSupabase();
    if (!sb) { setStatus('error'); setErrorMsg('接続エラー'); return; }

    // Supabase Authでアカウント作成
    const { data: authData, error: authError } = await sb.auth.signUp({ email, password });
    if (authError) { setStatus('error'); setErrorMsg(authError.message); return; }
    const uid = authData.user?.id;
    if (!uid) { setStatus('error'); setErrorMsg('アカウント作成に失敗しました'); return; }

    // 診断スコアをdiagnosticsから取得
    let fearScores = null;
    let defenseScores = null;
    if (meta.diagSession) {
      const res = await fetch(`/api/diag-scores?session=${meta.diagSession}`);
      if (res.ok) {
        const scores = await res.json();
        fearScores = scores.fear_scores;
        defenseScores = scores.defense_scores;
      }
    }

    const { error } = await sb.from('users').upsert({
      id: uid,
      email,
      username,
      type_id: meta.typeId,
      lifestyle: meta.onboarding?.lifestyle,
      daily_time: meta.onboarding?.dailyTime,
      best_timing: meta.onboarding?.bestTiming,
      distress_level: meta.onboarding?.distressLevel,
      change_scene: meta.onboarding?.changeScene,
      paid_plan: meta.plan,
      paid_at: new Date().toISOString(),
      fear_scores: fearScores,
      defense_scores: defenseScores,
    }, { onConflict: 'email' });

    if (error) { setStatus('error'); setErrorMsg(error.message); return; }

    localStorage.setItem('kokolift_user_id', uid);
    localStorage.setItem('kokolift_user_email', email);
    localStorage.setItem('kokolift_type_id', meta.typeId);

    setStep('done');
  }

  if (!meta) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="text-5xl">🎉</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-stone-900">{username}さん、ようこそ！</h1>
            <p className="text-sm text-stone-500">30日プログラムが始まりました。<br />今日から少しずつ、一緒に進みましょう。</p>
          </div>
          <button
            onClick={() => router.push('/program/dashboard')}
            className="w-full py-4 rounded-full font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
          >
            ダッシュボードへ →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-12" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
      <div className="w-full max-w-sm mx-auto space-y-8">
        <div className="space-y-2">
          <div className="text-3xl text-center">✅</div>
          <h1 className="text-xl font-bold text-stone-900 text-center">支払いが完了しました！</h1>
          <p className="text-sm text-stone-500 text-center">最後に、呼び名だけ教えてください。</p>
        </div>

        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-stone-500">呼び名（ニックネームでOK）</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="例：たろう"
              required
              className="w-full px-4 py-3.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-purple-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-stone-500">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="w-full px-4 py-3.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-purple-400"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-stone-500">パスワード（6文字以上）</label>
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

          {status === 'error' && <p className="text-xs text-red-500">{errorMsg}</p>}

          <button
            type="submit"
            disabled={status === 'loading' || !username || !email || !password}
            className="w-full py-4 rounded-full font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
          >
            {status === 'loading' ? '登録中...' : 'はじめる →'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessPageInner />
    </Suspense>
  );
}
