'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

function UpgradeSuccessInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id') || '';
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!sessionId) { setStatus('error'); setErrorMsg('セッションが見つかりません'); return; }
    (async () => {
      const sb = getSupabase();
      if (!sb) { setStatus('error'); setErrorMsg('接続エラー'); return; }
      const { data } = await sb.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) { setStatus('error'); setErrorMsg('ログイン情報が確認できませんでした。お手数ですが再度ログインしてください。'); return; }

      try {
        const res = await fetch('/api/apply-upgrade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, userId }),
        });
        const result = await res.json();
        if (!res.ok) { setStatus('error'); setErrorMsg(result.error || 'プランの反映に失敗しました'); return; }
        // 反映完了 → ダッシュボードへ
        router.replace('/program/dashboard');
      } catch {
        setStatus('error');
        setErrorMsg('通信エラーが発生しました');
      }
    })();
  }, [sessionId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
      {status === 'loading' ? (
        <div className="text-center space-y-4">
          <div className="w-8 h-8 mx-auto rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
          <p className="text-sm text-stone-500">プランを反映しています...</p>
        </div>
      ) : (
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-sm text-stone-600 leading-relaxed">{errorMsg}</p>
          <button
            onClick={() => router.replace('/program/dashboard')}
            className="px-6 py-3 rounded-full font-bold text-white text-sm"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
          >
            ダッシュボードへ
          </button>
        </div>
      )}
    </div>
  );
}

export default function UpgradeSuccessPage() {
  return (
    <Suspense fallback={null}>
      <UpgradeSuccessInner />
    </Suspense>
  );
}
