'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { PROGRAM_CONTENT, TYPE_NAMES } from '@/data/program';

type Screen = 'onboarding' | 'loading' | 'plan-complete' | 'pricing';

interface Onboarding {
  lifestyle: string;
  dailyTime: string;
  bestTiming: string;
  distressLevel: string;
  changeScene: string;
}

const ONBOARDING_QUESTIONS = [
  {
    key: 'lifestyle',
    question: '生活スタイルを教えてください',
    options: ['社会人', '学生', '主婦・主夫', 'その他'],
  },
  {
    key: 'dailyTime',
    question: '1日に取れる時間はどれくらいですか？',
    options: ['5分以内', '10〜15分', '30分以上'],
  },
  {
    key: 'bestTiming',
    question: '続けやすいタイミングはいつですか？',
    options: ['朝', '昼', '夜'],
  },
  {
    key: 'distressLevel',
    question: '今の困り度を教えてください',
    options: ['とても困っている', '少し困っている', '知的興味で'],
  },
  {
    key: 'changeScene',
    question: '変えたい場面はどれですか？',
    options: ['職場・学校', '家族・パートナー', '友人関係', '自分の思考', '全部'],
  },
];

function ProgramPageInner() {
  const searchParams = useSearchParams();
  const typeId = searchParams.get('type') || 'distancer';
  const email = searchParams.get('email') || '';

  const [screen, setScreen] = useState<Screen>('onboarding');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [onboarding, setOnboarding] = useState<Partial<Onboarding>>({});
  const [loadingStep, setLoadingStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const typeName = TYPE_NAMES[typeId] || '診断さん';
  const content = PROGRAM_CONTENT[typeId];

  const loadingMessages = [
    `${typeName}の特性を分析しています...`,
    `あなたの回答を反映しています...`,
    `${onboarding.bestTiming || ''}・${onboarding.dailyTime || ''}に合わせています...`,
    `あなた専用のプランを作成しています...`,
  ];

  useEffect(() => {
    if (screen !== 'loading') return;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setLoadingStep(step);
      if (step >= loadingMessages.length) {
        clearInterval(interval);
        setTimeout(() => setScreen('plan-complete'), 600);
      }
    }, 900);
    return () => clearInterval(interval);
  }, [screen]);

  function handleAnswer(value: string) {
    const key = ONBOARDING_QUESTIONS[questionIndex].key;
    const newOnboarding = { ...onboarding, [key]: value };
    setOnboarding(newOnboarding);
    if (questionIndex < ONBOARDING_QUESTIONS.length - 1) {
      setQuestionIndex(questionIndex + 1);
    } else {
      setScreen('loading');
      setLoadingStep(0);
    }
  }

  async function handleSelectPlan(plan: 'light' | 'standard') {
    setIsLoading(true);
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, email, typeId, onboarding }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setIsLoading(false);
  }

  if (screen === 'onboarding') {
    const q = ONBOARDING_QUESTIONS[questionIndex];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="flex gap-1 mb-6">
              {ONBOARDING_QUESTIONS.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= questionIndex ? 'bg-purple-500' : 'bg-stone-200'}`} />
              ))}
            </div>
            <p className="text-xs text-stone-400">{questionIndex + 1} / {ONBOARDING_QUESTIONS.length}</p>
            <h2 className="text-xl font-bold text-stone-800">{q.question}</h2>
          </div>
          <div className="space-y-3">
            {q.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className="w-full py-4 px-5 rounded-2xl border-2 border-stone-200 text-left text-sm font-medium text-stone-700 hover:border-purple-400 hover:bg-purple-50 active:scale-[0.98] transition-all"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
          <div className="space-y-3">
            {loadingMessages.slice(0, loadingStep).map((msg, i) => (
              <p key={i} className={`text-sm transition-all ${i === loadingStep - 1 ? 'text-purple-600 font-medium' : 'text-stone-400'}`}>
                {i < loadingStep - 1 ? '✓ ' : ''}{msg}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'plan-complete') {
    const missions = content?.missionPool.slice(0, 2) || [];
    return (
      <div className="min-h-screen px-5 py-12" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-purple-100 text-purple-600 text-xs font-medium">プラン完成</span>
            <h1 className="text-2xl font-bold text-stone-900">{typeName}のあなた専用の<br />30日プランができました。</h1>
            <p className="text-sm text-stone-500">{onboarding.bestTiming}・{onboarding.dailyTime}に合わせた内容です。</p>
          </div>

          <div className="space-y-3">
            {missions.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-purple-100 space-y-1">
                <p className="text-xs text-purple-400 font-medium">DAY {i + 1} のミッション例</p>
                <p className="text-sm text-stone-700 font-medium">{m.text}</p>
              </div>
            ))}
            <div className="bg-white rounded-2xl p-4 border border-stone-100 relative overflow-hidden">
              <p className="text-xs text-stone-400 font-medium mb-1">DAY 3 以降のプログラム</p>
              <p className="text-sm text-stone-300 blur-sm select-none">毎日続けるための具体的なミッションと、変化を記録する仕組みが待っています...</p>
              <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />
            </div>
          </div>

          <button
            onClick={() => setScreen('pricing')}
            className="w-full py-4 rounded-full font-bold text-white text-base transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
          >
            プランを始める →
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'pricing') {
    return (
      <div className="min-h-screen px-5 py-12" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-xl font-bold text-stone-900">一人でやるのは、難しい。<br />ここリフトが、毎日あなたの隣にいます。</h1>
            <p className="text-sm text-stone-500">プログラムの内容は無料でお届け済み。<br />毎日続ける仕組みが、有料です。</p>
          </div>

          <div className="space-y-4">
            {/* スタンダード（推奨） */}
            <div className="bg-white rounded-3xl p-6 border-2 border-purple-400 relative shadow-lg shadow-purple-100">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-purple-500 text-white text-xs font-bold px-4 py-1 rounded-full">おすすめ</span>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="font-bold text-stone-900">スタンダードプラン</p>
                  <p className="text-xs text-stone-500 mt-1">毎日のミッション提示＋変化の可視化＋記録機能</p>
                </div>
                <ul className="space-y-2 text-sm text-stone-600">
                  <li className="flex gap-2"><span className="text-purple-400">✓</span>毎日のミッション自動提示（30日分）</li>
                  <li className="flex gap-2"><span className="text-purple-400">✓</span>変化の可視化グラフ</li>
                  <li className="flex gap-2"><span className="text-purple-400">✓</span>記録・振り返り機能</li>
                  <li className="flex gap-2"><span className="text-purple-400">✓</span>プログラム閲覧</li>
                </ul>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-stone-900">¥2,980</span>
                  <span className="text-stone-400 text-sm mb-1">買い切り</span>
                </div>
                <button
                  onClick={() => handleSelectPlan('standard')}
                  disabled={isLoading}
                  className="w-full py-4 rounded-full font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
                >
                  {isLoading ? '処理中...' : 'スタンダードで始める'}
                </button>
              </div>
            </div>

            {/* ライト */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200">
              <div className="space-y-4">
                <div>
                  <p className="font-bold text-stone-900">ライトプラン</p>
                  <p className="text-xs text-stone-500 mt-1">プログラム閲覧＋記録機能</p>
                </div>
                <ul className="space-y-2 text-sm text-stone-600">
                  <li className="flex gap-2"><span className="text-stone-300">✓</span>記録機能</li>
                  <li className="flex gap-2"><span className="text-stone-300">✓</span>プログラム閲覧</li>
                </ul>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-stone-900">¥1,980</span>
                  <span className="text-stone-400 text-sm mb-1">買い切り</span>
                </div>
                <button
                  onClick={() => handleSelectPlan('light')}
                  disabled={isLoading}
                  className="w-full py-4 rounded-full font-bold text-stone-700 border-2 border-stone-300 hover:border-purple-300 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? '処理中...' : 'ライトで始める'}
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-400 text-center leading-relaxed">
            ※効果を保証するものではありません。<br />
            ビッグファイブ／CBTの考え方をベースにした自己改善ツールです。
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export default function ProgramPage() {
  return (
    <Suspense>
      <ProgramPageInner />
    </Suspense>
  );
}
