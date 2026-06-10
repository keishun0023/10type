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
      const { data } = await sb.from('users').select('generated_plan, welcome_completed, diag_session').eq('id', user.id).single();
      if (data?.welcome_completed) { router.replace('/program/dashboard'); return; }
      const plan = data?.generated_plan as GeneratedPlan | null;
      const ws = plan?.welcomeSteps;
      if (ws && ws.length > 0) { setSteps(ws); return; }

      // プランがまだ無い：課金直後に裏で開始した生成の完了を待つ（最大約2分）。
      // 完了したら users に保存してウェルカムを表示する。
      if (data?.diag_session) {
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 4000));
          try {
            const res = await fetch('/api/plan-by-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ diagSession: data.diag_session }),
            });
            const { plan: p } = await res.json() as { plan: GeneratedPlan | null };
            if (p?.welcomeSteps && p.welcomeSteps.length > 0) {
              if (p.config) p.config.userId = user.id;
              await sb.from('users').update({ generated_plan: p, program_config: p.config ?? null }).eq('id', user.id);
              setSteps(p.welcomeSteps);
              return;
            }
          } catch { /* 次のポーリングで再試行 */ }
        }
      }
      // 生成が間に合わなかった場合はダッシュボードへ（ダッシュボード側で生成を再開する）
      router.replace('/program/dashboard');
    })();
  }, []);

  if (!steps) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-5" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-purple-600">あなた専用のプログラムを仕上げています</p>
          <p className="text-xs text-stone-400">診断とご回答をもとに作成中です。少しだけお待ちください。</p>
        </div>
      </div>
    );
  }

  async function markWelcomeDone() {
    const sb = getSupabase();
    if (!sb) return;
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user) {
      await sb.from('users').update({ welcome_completed: true }).eq('id', session.user.id);
    }
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

          {isLast && (
            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
              <p className="text-xs text-stone-600 leading-relaxed">
                あなたの詳細な傾向や、今後30日間のプログラムの内容は、いつでも
                <span className="font-bold text-purple-600">「あなたについて」</span>
                から見られます。
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-8">
          <button
            onClick={async () => {
              if (isLast) { await markWelcomeDone(); router.push('/program/dashboard?tab=report'); }
              else setIdx(idx + 1);
            }}
            className="w-full py-4 rounded-full font-bold text-white text-base transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
          >
            {isLast ? '詳細を見てみる →' : '次へ →'}
          </button>
          {!isLast && (
            <button
              onClick={async () => { await markWelcomeDone(); router.push('/program/dashboard'); }}
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
