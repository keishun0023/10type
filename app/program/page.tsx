'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { TYPE_NAMES, ChangeOrientation, GeneratedPlan } from '@/data/program';

type Screen = 'landing' | 'onboarding' | 'deepdive' | 'loading' | 'plan-complete' | 'pricing';

interface Onboarding {
  lifestyle: string;
  dailyTime: string;
  bestTiming: string;
  distressLevel: string;
  difficultScene: string;
  difficultDetail: string;
  difficultFreeText: string;
  changeOrientation: string;
}

// changeOrientation の選択肢 → ChangeOrientation 型へのマッピング
const ORIENTATION_MAP: Record<string, ChangeOrientation> = {
  '変わりたい・できるようになりたい': 'change',
  '今の自分を受け入れて、楽になりたい': 'accept',
  'まだよく分からない': 'unknown',
};

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
    key: 'difficultScene',
    question: '一番しんどくなりやすい場面はどれですか？',
    options: [
      '評価される・見られる場面（発表・提出・ミスなど）',
      '予定が変わったり、見通しが立たないとき',
      '人に頼んだり、断ったりしないといけないとき',
      '大切な人との関係がギクシャクしたとき',
    ],
    note: 'ミッションの内容をあなたの状況に合わせるために使います',
  },
  {
    key: 'changeOrientation',
    question: '今の自分に対して、どちらに近いですか？',
    options: [
      '変わりたい・できるようになりたい',
      '今の自分を受け入れて、楽になりたい',
      'まだよく分からない',
    ],
    note: 'プログラムの内容の組み立て方が変わります。正解はありません',
  },
];

// difficultScene ごとの「具体的に何に困っているか」の選択肢
const SCENE_DETAILS: Record<string, string[]> = {
  '評価される・見られる場面（発表・提出・ミスなど）': [
    'ミスや失敗を人に見られること',
    '人前で話す・発表すること',
    '実力を試される・人と比べられること',
    '分からないと言う・質問すること',
  ],
  '予定が変わったり、見通しが立たないとき': [
    '急な予定変更',
    '段取りや計画を自分で決められないこと',
    '初めての場所・人・状況',
    '結果が見えないまま進めること',
  ],
  '人に頼んだり、断ったりしないといけないとき': [
    '人に頼みごとをすること',
    '誘いや依頼を断ること',
    '自分の希望や意見を言うこと',
    '相手に負担をかけること',
  ],
  '大切な人との関係がギクシャクしたとき': [
    '返信が来ない・既読スルー',
    '相手の機嫌や態度が読めないこと',
    '本音を言って嫌われる不安',
    '自分から距離を縮めること',
  ],
};

function ProgramPageInner() {
  const searchParams = useSearchParams();
  const typeId = searchParams.get('type') || 'distancer';
  const email = searchParams.get('email') || '';
  const session = searchParams.get('session') || '';

  const [screen, setScreen] = useState<Screen>('landing');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [onboarding, setOnboarding] = useState<Partial<Onboarding>>({});
  const [loadingStep, setLoadingStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);

  // 深掘り（具体的な困りごと）
  const [detailSelected, setDetailSelected] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');

  const typeName = TYPE_NAMES[typeId] || '診断さん';

  const loadingMessages = [
    `${typeName}の特性を分析しています...`,
    `あなたの回答を反映しています...`,
    `あなたの「困っていること」を読み込んでいます...`,
    `あなた専用の分析結果をまとめています...`,
  ];

  // loading 画面に入ったら、メッセージを進めつつ実際にAI生成を叩く
  useEffect(() => {
    if (screen !== 'loading') return;
    let step = 0;
    const interval = setInterval(() => {
      step = Math.min(step + 1, loadingMessages.length);
      setLoadingStep(step);
    }, 1200);

    (async () => {
      try {
        const res = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ diagSession: session, typeId, onboarding, phase: 'preview' }),
        });
        const data = await res.json();
        clearInterval(interval);
        if (data.plan) setGeneratedPlan(data.plan);
        setScreen('plan-complete');
      } catch {
        clearInterval(interval);
        setScreen('plan-complete');
      }
    })();

    return () => clearInterval(interval);
  }, [screen]);

  function handleAnswer(value: string) {
    const key = ONBOARDING_QUESTIONS[questionIndex].key;
    const newOnboarding = { ...onboarding, [key]: value };
    setOnboarding(newOnboarding);
    if (questionIndex < ONBOARDING_QUESTIONS.length - 1) {
      setQuestionIndex(questionIndex + 1);
    } else {
      // 最後の質問が終わったら深掘りへ
      setScreen('deepdive');
    }
  }

  function toggleDetail(opt: string) {
    setDetailSelected(prev =>
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    );
  }

  function handleDeepdiveSubmit() {
    setOnboarding(prev => ({
      ...prev,
      difficultDetail: detailSelected.join('、'),
      difficultFreeText: freeText.trim(),
    }));
    setScreen('loading');
    setLoadingStep(0);
  }

  async function handleSelectPlan(plan: 'light' | 'standard') {
    setIsLoading(true);
    try {
      const changeOrientation: ChangeOrientation =
        ORIENTATION_MAP[onboarding.changeOrientation ?? ''] ?? 'unknown';
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email, typeId, onboarding: { ...onboarding, changeOrientation }, session }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || '決済の準備に失敗しました。もう一度お試しください。');
        setIsLoading(false);
      }
    } catch {
      alert('通信エラーが発生しました。もう一度お試しください。');
      setIsLoading(false);
    }
  }

  if (screen === 'landing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-16" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-block px-3 py-1 rounded-full bg-purple-100 text-purple-600 text-xs font-medium">
              あなただけの限定プログラム
            </div>
            <h1 className="text-2xl font-bold text-stone-900 leading-snug">
              <span className="text-purple-600">{typeName}</span>のあなたにぴったりの<br />30日プログラムを<br />ご用意しました。
            </h1>
            <p className="text-sm text-stone-500 leading-relaxed">
              診断結果をもとに、あなたの特性に合わせた<br />毎日のミッションをお届けします。
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <div className="flex items-center gap-1.5 bg-white border border-stone-100 rounded-full px-3 py-1.5 shadow-sm">
              <span className="text-xs text-stone-500">✦</span>
              <span className="text-xs text-stone-600 font-medium">CBT準拠</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-stone-100 rounded-full px-3 py-1.5 shadow-sm">
              <span className="text-xs text-stone-500">✦</span>
              <span className="text-xs text-stone-600 font-medium">30日間プログラム</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-purple-100 space-y-3">
            <p className="text-xs text-purple-400 font-medium">このプログラムでできること</p>
            <ul className="space-y-2.5">
              {[
                '毎日1つ、あなたに合わせたミッション',
                '小さな変化を記録・可視化',
                '続けるほど積み上がる達成感',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                  <span className="text-purple-400 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => setScreen('onboarding')}
            className="w-full py-4 rounded-full font-bold text-white text-base transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
          >
            プログラムを見る →
          </button>

          <p className="text-xs text-stone-400 text-center">
            ※ CBT（認知行動療法）の考え方をベースにした自己改善ツールです。医療ではありません。
          </p>
        </div>
      </div>
    );
  }

  if (screen === 'onboarding') {
    const q = ONBOARDING_QUESTIONS[questionIndex];
    const isKeyQuestion = q.key === 'difficultScene' || q.key === 'changeOrientation';
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
            <h2 className={`font-bold text-stone-800 leading-snug ${isKeyQuestion ? 'text-2xl' : 'text-xl'}`}>{q.question}</h2>
            {'note' in q && q.note && (
              <p className="text-xs text-stone-400 leading-relaxed">{q.note}</p>
            )}
          </div>
          <div className="space-y-3">
            {q.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className={`w-full py-4 px-5 rounded-2xl border-2 text-left text-sm font-medium transition-all active:scale-[0.98]
                  ${isKeyQuestion
                    ? 'border-stone-200 text-stone-700 hover:border-purple-400 hover:bg-purple-50 leading-snug'
                    : 'border-stone-200 text-stone-700 hover:border-purple-400 hover:bg-purple-50'
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'deepdive') {
    const scene = onboarding.difficultScene ?? '';
    const details = SCENE_DETAILS[scene] ?? [];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm space-y-7">
          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-purple-100 text-purple-600 text-xs font-medium">あと少し</span>
            <h2 className="text-2xl font-bold text-stone-800 leading-snug">具体的に困っていることを教えてください</h2>
            <p className="text-xs text-stone-400 leading-relaxed">
              ここで教えてもらった内容をもとに、あなた専用のミッションを作ります。当てはまるものを選び、あれば自由に書いてください（任意）。
            </p>
          </div>

          {details.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-stone-500 font-medium">当てはまるもの（複数可）</p>
              <div className="space-y-2">
                {details.map(opt => {
                  const active = detailSelected.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleDetail(opt)}
                      className={`w-full py-3.5 px-4 rounded-2xl border-2 text-left text-sm font-medium transition-all active:scale-[0.98] flex items-center gap-2
                        ${active ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-stone-200 text-stone-700 hover:border-purple-300'}`}
                    >
                      <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-[10px] ${active ? 'bg-purple-500 text-white' : 'bg-stone-100'}`}>
                        {active ? '✓' : ''}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs text-stone-500 font-medium">あなたの言葉で（任意）</p>
            <textarea
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="例：会議で意見を求められると頭が真っ白になって、後から『なんで言えなかったんだ』と落ち込む…"
              className="w-full px-4 py-3 rounded-2xl border-2 border-stone-200 text-sm focus:outline-none focus:border-purple-400 resize-none leading-relaxed"
            />
            <p className="text-[10px] text-stone-300 text-right">{freeText.length} / 500</p>
          </div>

          <button
            onClick={handleDeepdiveSubmit}
            className="w-full py-4 rounded-full font-bold text-white text-base transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
          >
            プランを作る →
          </button>
          <button
            onClick={handleDeepdiveSubmit}
            className="w-full text-center text-xs text-stone-400 hover:text-purple-500 transition-colors"
          >
            スキップして進む
          </button>
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
          <p className="text-xs text-stone-300">あなた専用にまとめています。少しだけお待ちください。</p>
        </div>
      </div>
    );
  }

  if (screen === 'plan-complete') {
    const report = generatedPlan?.report;
    const missions = generatedPlan?.missions ?? [];
    // 成果物の各ブロック（上から：いまのあなた → 続き）
    const revealSections = [
      { label: 'いまのあなたについて', body: report?.currentState, accent: true },
      { label: 'あなたの消耗しやすい場面', body: report?.drainScene },
      { label: 'あなたの強みの捉え直し', body: report?.strengthReframe },
      { label: 'これから30日でやること', body: report?.direction },
    ];
    return (
      <div className="min-h-screen px-5 py-10" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm mx-auto space-y-5">
          <div className="text-center space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-purple-100 text-purple-600 text-xs font-medium">あなたの分析が完成しました</span>
            <h1 className="text-2xl font-bold text-stone-900">{typeName}のあなたへの<br />30日プログラムができました。</h1>
          </div>

          {/* 成果物：上3割はくっきり、その先はフェードしながらロック */}
          <div className="relative">
            <div
              className="space-y-3"
              style={{
                maxHeight: 440,
                overflow: 'hidden',
                WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 34%, rgba(0,0,0,0.12) 72%, transparent 100%)',
                maskImage: 'linear-gradient(to bottom, #000 0%, #000 34%, rgba(0,0,0,0.12) 72%, transparent 100%)',
              }}
            >
              {revealSections.map((s, i) => (
                <div key={i} className={`bg-white rounded-2xl p-5 space-y-1.5 border ${s.accent ? 'border-purple-100' : 'border-stone-100'}`}>
                  <p className="text-xs text-purple-400 font-medium">{s.label}</p>
                  <p className="text-sm text-stone-700 leading-relaxed">
                    {s.body || 'あなたの回答をもとに、あなたの状況に合わせて具体的に書いています。'}
                  </p>
                </div>
              ))}
              {/* 30日ミッションの地図 */}
              <div className="bg-white rounded-2xl p-5 border border-stone-100 space-y-2">
                <p className="text-xs text-purple-400 font-medium">30日分のミッション</p>
                {(missions.length ? missions.slice(0, 8) : Array.from({ length: 8 })).map((m, i) => (
                  <p key={i} className="text-sm text-stone-600">
                    Day {i + 1}：{(m as GeneratedPlan['missions'][number])?.title || 'あなた専用のミッション'}
                  </p>
                ))}
                <p className="text-xs text-stone-400">…Day 30 まで全て用意済み</p>
              </div>
            </div>

            {/* ロック（スクロールせず画面内に収まる位置） */}
            <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ top: '300px' }}>
              <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur px-4 py-2 rounded-full shadow-md border border-purple-100">
                <span className="text-sm">🔒</span>
                <span className="text-xs font-medium text-stone-600">登録すると全て見られます</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setScreen('pricing')}
            className="w-full py-4 rounded-full font-bold text-white text-base transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
          >
            プランを始める →
          </button>

          <p className="text-xs text-stone-400 text-center leading-relaxed">
            あなたの回答をもとに作った内容です。<br />続きは登録後に、すべてご覧いただけます。
          </p>
        </div>
      </div>
    );
  }

  if (screen === 'pricing') {
    return (
      <div className="min-h-screen px-5 py-12" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-xl font-bold text-stone-900">一人でやるのは、難しい。<br />ココリフトが、毎日あなたの隣にいます。</h1>
            <p className="text-sm text-stone-500">あなただけの30日プログラムが完成しました。<br />ここから、毎日の一歩を一緒に続けていきます。</p>
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
