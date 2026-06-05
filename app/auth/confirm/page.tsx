'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';

function ConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');
    if (!tokenHash || !type) { setStatus('error'); return; }

    const sb = getSupabase();
    if (!sb) { setStatus('error'); return; }

    sb.auth.verifyOtp({ token_hash: tokenHash, type: type as any })
      .then(({ error }) => {
        if (error) { setStatus('error'); return; }
        setStatus('success');
        setTimeout(() => router.push('/program/dashboard'), 2000);
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
      <div className="w-full max-w-sm text-center space-y-4">
        {status === 'loading' && (
          <>
            <div className="w-10 h-10 mx-auto rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
            <p className="text-sm text-stone-500">確認中...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <p className="text-4xl">✅</p>
            <h1 className="text-xl font-bold text-stone-900">メールアドレスを確認しました</h1>
            <p className="text-sm text-stone-500">ダッシュボードに移動します...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-4xl">❌</p>
            <h1 className="text-xl font-bold text-stone-900">確認に失敗しました</h1>
            <p className="text-sm text-stone-500">リンクの有効期限が切れているか、すでに使用済みです。</p>
            <button
              onClick={() => router.push('/program/dashboard')}
              className="w-full py-4 rounded-full font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
            >
              ログイン画面へ
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmInner />
    </Suspense>
  );
}
