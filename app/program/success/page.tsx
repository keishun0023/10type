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

  const [step, setStep] = useState<'setup' | 'account' | 'done'>('setup');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [dailyTime, setDailyTime] = useState('');
  const [lifestyle, setLifestyle] = useState('');
  const [bestTiming, setBestTiming] = useState('');

  // Stripeセッションからメタデータを取得
  const [meta, setMeta] = useState<{ email: string; typeId: string; plan: string; onboarding: Record<string, string>; diagSession: string } | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/checkout-session?session_id=${sessionId}`)
      .then(r => r.json())
      .then(data => {
        setMeta(data);
        if (data.email) setEmail(data.email);
        // 課金完了直後にプラン生成を裏で開始（ユーザーがアカウント作成している間に終わらせる）。
        // onboardingはdiagnosticsに保存済みなので渡さない（metadataのslim版で上書きしないため）。
        if (data.diagSession && !sessionStorage.getItem(`plan_gen_${data.diagSession}`)) {
          sessionStorage.setItem(`plan_gen_${data.diagSession}`, '1');
          fetch('/api/generate-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ diagSession: data.diagSession, typeId: data.typeId, phase: 'preview' }),
          }).catch(() => {});
        }
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
    let uid = authData?.user?.id;

    if (authError) {
      // 既に登録済みなど → 同じパスワードでログインを試す
      const { data: si, error: siErr } = await sb.auth.signInWithPassword({ email, password });
      if (siErr || !si.user) {
        setStatus('error');
        setErrorMsg('このメールアドレスは既に使われています。パスワードが違う場合はログイン画面からお進みください。');
        return;
      }
      uid = si.user.id;
    } else if (!authData?.session && uid) {
      // メール確認ON：サーバーで即時確認 → サインインしてセッションを確立
      await fetch('/api/confirm-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      });
      const { error: siErr } = await sb.auth.signInWithPassword({ email, password });
      if (siErr) {
        setStatus('error');
        setErrorMsg('ログインの確立に失敗しました。もう一度お試しください。');
        return;
      }
    }

    if (!uid) { setStatus('error'); setErrorMsg('アカウント作成に失敗しました'); return; }

    // service_role経由でusersテーブルに保存（RLS回避）
    const res = await fetch('/api/register-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: uid,
        email,
        username,
        typeId: meta.typeId,
        lifestyle: lifestyle || meta.onboarding?.lifestyle,
        dailyTime: dailyTime || meta.onboarding?.dailyTime,
        bestTiming: bestTiming || meta.onboarding?.bestTiming,
        distressLevel: meta.onboarding?.distressLevel,
        changeScene: meta.onboarding?.changeScene,
        difficultScene: meta.onboarding?.difficultScene,
        changeOrientation: meta.onboarding?.changeOrientation,
        plan: meta.plan,
        diagSession: meta.diagSession,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setStatus('error'); setErrorMsg(data.error || '登録に失敗しました'); return;
    }

    localStorage.setItem('kokolift_user_id', uid);
    localStorage.setItem('kokolift_user_email', email);
    localStorage.setItem('kokolift_type_id', meta.typeId);
    localStorage.setItem('kokolift_username', username);

    setStep('done');
  }

  if (!meta) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  if (step === 'setup') {
    const canProceed = dailyTime && lifestyle && bestTiming;
    return (
      <div className="min-h-screen px-5 py-12" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="space-y-2">
            <div className="text-3xl text-center">✅</div>
            <h1 className="text-xl font-bold text-stone-900 text-center">支払いが完了しました！</h1>
            <p className="text-sm text-stone-500 text-center">あなたに合ったプログラムを作るために<br />3つだけ教えてください。</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-stone-700">1日に取れる時間はどれくらいですか？</p>
              <div className="space-y-2">
                {['5分以内', '10〜15分', '30分以上'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setDailyTime(opt)}
                    className={`w-full py-3 px-4 rounded-xl text-sm text-left border transition-all ${
                      dailyTime === opt
                        ? 'border-purple-400 bg-purple-50 text-purple-800 font-medium'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-stone-700">生活スタイルを教えてください</p>
              <div className="space-y-2">
                {['会社員・フルタイム', 'パートタイム・アルバイト', '学生', 'フリーランス・自営業', '専業主婦・主夫', 'その他'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setLifestyle(opt)}
                    className={`w-full py-3 px-4 rounded-xl text-sm text-left border transition-all ${
                      lifestyle === opt
                        ? 'border-purple-400 bg-purple-50 text-purple-800 font-medium'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-stone-700">続けやすいタイミングはいつですか？</p>
              <div className="space-y-2">
                {['朝（起床後）', '昼休み', '夕方・帰宅後', '夜寝る前', 'バラバラ・空き時間に'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setBestTiming(opt)}
                    className={`w-full py-3 px-4 rounded-xl text-sm text-left border transition-all ${
                      bestTiming === opt
                        ? 'border-purple-400 bg-purple-50 text-purple-800 font-medium'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep('account')}
            disabled={!canProceed}
            className="w-full py-4 rounded-full font-bold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
          >
            次へ →
          </button>
        </div>
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
            onClick={() => router.push('/program/welcome')}
            className="w-full py-4 rounded-full font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
          >
            プログラムを始める →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-12" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
      <div className="w-full max-w-sm mx-auto space-y-8">
        <div className="space-y-2">
          <div className="text-3xl text-center">👤</div>
          <h1 className="text-xl font-bold text-stone-900 text-center">アカウントを作成しましょう</h1>
          <p className="text-sm text-stone-500 text-center">プログラムの進捗を保存するために<br />アカウント情報を登録してください。</p>
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
