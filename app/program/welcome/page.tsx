'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { GeneratedPlan } from '@/data/program';

export default function WelcomePage() {
  const router = useRouter();
  const [steps, setSteps] = useState<{ title: string; body: string }[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const uname = localStorage.getItem('kokolift_username') || '';
    setUsername(uname);
    (async () => {
      const sb = getSupabase();
      if (!sb) { router.replace('/program/dashboard'); return; }
      const { data: { session } } = await sb.auth.getSession();
      const user = session?.user;
      if (!user) { router.replace('/program/dashboard'); return; }
      const { data } = await sb.from('users').select('generated_plan').eq('id', user.id).single();
      const plan = data?.generated_plan as GeneratedPlan | null;
      const ws = plan?.welcomeSteps;
      if (ws && ws.length > 0) setSteps(ws);
      else { router.replace('/program/dashboard'); }
    })();
  }, []);

  if (!steps) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  const step = steps[idx];
  const isLast = idx === steps.length - 1;

  return (
    <div className="min-h-screen flex flex-col px-5 py-12" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
      <div className="w-full max-w-sm mx-auto flex-1 flex flex-col">
        {/* 進捗ドット */}
        <div className="flex gap-1.5 mb-10">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= idx ? 'bg-purple-500' : 'bg-stone-200'}`} />
          ))}
        </div>

        <div className="flex-1 flex flex-col justify-center space-y-5">
          {idx === 0 && username && (
            <p className="text-sm text-purple-400 font-medium">{username}さん、ようこそ</p>
          )}
          <h1 className="text-2xl font-bold text-stone-900 leading-snug">{step.title}</h1>
          <p className="text-base text-stone-600 leading-relaxed whitespace-pre-wrap">{step.body}</p>
        </div>

        <div className="space-y-3 pt-8">
          <button
            onClick={() => { if (isLast) router.push('/program/dashboard'); else setIdx(idx + 1); }}
            className="w-full py-4 rounded-full font-bold text-white text-base transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
          >
            {isLast ? 'はじめる →' : '次へ →'}
          </button>
          {!isLast && (
            <button
              onClick={() => router.push('/program/dashboard')}
              className="w-full text-center text-xs text-stone-400 hover:text-purple-500 transition-colors"
            >
              スキップ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
