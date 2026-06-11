'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { TYPE_NAMES, ChangeOrientation } from '@/data/program';
import { updateDiagnosticOnboarding } from '@/lib/analytics';

type Screen = 'onboarding' | 'deepdive' | 'building' | 'pricing';

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

// しんどい場面ごとの「最初の3日間」プレビュー（内容の一例。実際のミッションは課金後にAI生成）
type DayPreview = { title: string; body: string };
const DAY_PREVIEWS: Record<string, DayPreview[]> = {
  '評価される・見られる場面（発表・提出・ミスなど）': [
    { title: '頭の中の言葉を外に出す', body: '評価される場面で浮かびやすい考えを、3つだけ書き出します。' },
    { title: '事実と思い込みを分ける', body: '「本当に起きたこと」と「頭の中で想像したこと」を分けて整理します。' },
    { title: '小さく試す準備をする', body: '不安が強すぎない場面を選び、できそうな一歩を一緒に決めます。' },
  ],
  '予定が変わったり、見通しが立たないとき': [
    { title: '不安の正体を言葉にする', body: '「決まっていないこと」の何が不安なのか、3つだけ書き出します。' },
    { title: '決められることと、決められないことを分ける', body: '自分で決められることと、相手や状況しだいのことを分けて整理します。' },
    { title: '小さく試す準備をする', body: '不安が強すぎない場面を選び、できそうな一歩を一緒に決めます。' },
  ],
  '人に頼んだり、断ったりしないといけないとき': [
    { title: '頭の中の言葉を外に出す', body: '頼みたい・断りたいのに言えなかった場面で浮かんだ考えを、3つだけ書き出します。' },
    { title: '事実と思い込みを分ける', body: '「相手が実際に言ったこと」と「自分が想像したこと」を分けて整理します。' },
    { title: '小さく試す準備をする', body: '負担の少ない相手・場面を選び、できそうな一言を一緒に決めます。' },
  ],
  '大切な人との関係がギクシャクしたとき': [
    { title: '不安になった瞬間を書き出す', body: '「関係がまずいかも」と感じた瞬間に浮かんだ考えを、3つだけ書き出します。' },
    { title: '事実と想像を分ける', body: '「実際に起きたこと」と「頭の中で広がった想像」を分けて整理します。' },
    { title: '小さく試す準備をする', body: '不安が強すぎない相手を選び、できそうな小さな一歩を一緒に決めます。' },
  ],
};
const DEFAULT_DAY_PREVIEW = DAY_PREVIEWS['評価される・見られる場面（発表・提出・ミスなど）'];

const FAQ_ITEMS = [
  {
    q: 'どれくらい時間がかかりますか？',
    a: '1日のミッションは5分ほどから始められます。余裕がある日は、AIとの振り返りを長めに行えます。',
  },
  {
    q: '毎日できないと意味がありませんか？',
    a: '毎日続けることを目指しますが、空いた日があっても大丈夫です。記録を見ながら、自分のペースで再開できます。',
  },
  {
    q: 'これは治療ですか？',
    a: '医療行為ではありません。CBTの考え方をベースにした、自己理解と行動のためのセルフケアツールです。効果を保証するものではありません。',
  },
  {
    q: '支払いは自動更新ですか？',
    a: '自動更新ではありません。一度のお支払いで、30日プログラムをご利用いただけます。',
  },
  {
    q: '機能はあとから追加できますか？',
    a: 'はい。いつでもAIに相談できるプレミアム機能へ、開始後にいつでもアップグレードできます。',
  },
];

const BUILDING_STEPS = [
  '診断結果を読み込んでいます',
  'あなたの回答を反映しています',
  'プランの構成を決めています',
];

// チェック行（紫丸✓＋テキスト）
function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex gap-2.5 items-start text-sm font-medium text-stone-700 leading-relaxed">
      <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">✓</span>
      {text}
    </li>
  );
}

function ProgramPageInner() {
  const searchParams = useSearchParams();
  const typeId = searchParams.get('type') || 'distancer';
  const email = searchParams.get('email') || '';
  const session = searchParams.get('session') || '';

  const [screen, setScreen] = useState<Screen>('onboarding');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [onboarding, setOnboarding] = useState<Partial<Onboarding>>({});
  const [buildingStep, setBuildingStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [planDetailOpen, setPlanDetailOpen] = useState(false);

  // スティッキーCTA：FV通過後に表示、プランゾーン・フッター表示中は隠す
  const fvRef = useRef<HTMLElement>(null);
  const plansRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const [pastFV, setPastFV] = useState(false);
  const [inPlans, setInPlans] = useState(false);
  const [inFooter, setInFooter] = useState(false);

  // 深掘り（具体的な困りごと）
  const [detailSelected, setDetailSelected] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');

  const typeName = TYPE_NAMES[typeId] || '診断さん';

  // building 画面：短い演出（約2.7秒）の後ペイウォールへ。AI生成は課金後に行う。
  useEffect(() => {
    if (screen !== 'building') return;
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step >= BUILDING_STEPS.length) {
        clearInterval(interval);
        setScreen('pricing');
        return;
      }
      setBuildingStep(step);
    }, 900);
    return () => clearInterval(interval);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'pricing') return;
    const observers: IntersectionObserver[] = [];
    const watch = (el: Element | null, cb: (v: boolean) => void, threshold: number) => {
      if (!el) return;
      const o = new IntersectionObserver(([e]) => cb(e.isIntersecting), { threshold });
      o.observe(el);
      observers.push(o);
    };
    watch(fvRef.current, v => setPastFV(!v), 0);
    watch(plansRef.current, v => setInPlans(v), 0.08);
    watch(footerRef.current, v => setInFooter(v), 0.2);
    return () => observers.forEach(o => o.disconnect());
  }, [screen]);

  function scrollToPlans() {
    plansRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

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
    const finalOnboarding = {
      ...onboarding,
      difficultDetail: detailSelected.join('、'),
      difficultFreeText: freeText.trim(),
    };
    setOnboarding(finalOnboarding);
    // 課金後のプラン生成で使うため、回答を diagnostics に保存（待たない）
    if (session) {
      updateDiagnosticOnboarding(session, finalOnboarding as Record<string, string>);
    }
    setBuildingStep(0);
    setScreen('building');
  }

  async function handleSelectPlan(plan: 'standard' | 'premium') {
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

  if (screen === 'onboarding') {
    const q = ONBOARDING_QUESTIONS[questionIndex];
    const isKeyQuestion = q.key === 'difficultScene' || q.key === 'changeOrientation';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            {questionIndex === 0 && (
              <div className="mb-6 space-y-1">
                <h1 className="text-xl font-bold text-stone-900 leading-snug">
                  <span className="text-purple-600">{typeName}</span>のあなた専用のプランを作るために、少しだけ教えてください
                </h1>
                <p className="text-xs text-stone-400">約1分で終わります</p>
              </div>
            )}
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

  if (screen === 'building') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm flex flex-col items-center gap-8">
          <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
          <div className="space-y-2 text-center">
            {BUILDING_STEPS.map((msg, i) => (
              <p
                key={i}
                className={`text-sm transition-all duration-500 ${
                  i < buildingStep ? 'text-stone-300' : i === buildingStep ? 'text-base font-bold text-purple-600' : 'text-stone-300 opacity-0'
                }`}
              >
                {i < buildingStep ? `✓ ${msg}` : msg}
              </p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'pricing') {
    const dayPreviews = DAY_PREVIEWS[onboarding.difficultScene ?? ''] ?? DEFAULT_DAY_PREVIEW;

    const showSticky = pastFV && !inPlans && !inFooter;

    return (
      <div className="min-h-screen bg-[#faf9ff] text-stone-800">
        <div className="mx-auto max-w-[26.875rem] min-h-screen relative">

          {/* ════ 1. ファーストビュー ════ */}
          <section
            ref={fvRef}
            className="px-6 pt-10 pb-12 text-center"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.45), rgba(255,255,255,0.45)), url(/paywall-texture.jpg)', backgroundSize: '100% auto', backgroundRepeat: 'repeat-y', backgroundPosition: 'top center' }}
          >
            <img src="/intro-service-icon.png" alt="" className="w-12 h-12 mx-auto" />
            <img src="/intro-logo.png" alt="ココリフト" className="h-6 mx-auto mt-2 object-contain" />

            <h1 className="font-bold leading-[1.6] mt-6 text-stone-900 text-[22px]">
              <span className="text-[25px]"><span className="text-violet-600" style={{ background: 'linear-gradient(transparent 72%, #ddd2f9 72%)', paddingBottom: 2 }}>{typeName}</span>向けに、</span><br />詳細レポートと個別プログラムを<br />用意しました
            </h1>

            {/* 実画面プレビュー：詳細レポート × 個別プログラム */}
            <div className="relative mt-7 h-[312px]">
              <div className="absolute left-0 top-7 w-[55%] -rotate-3 rounded-[20px] bg-white ring-1 ring-violet-100 shadow-[0_16px_40px_-14px_rgba(80,40,160,0.35)] overflow-hidden aspect-[3/4]">
                <img src="/paywall-fv-report.png" alt="詳細レポート画面" className="w-full h-full object-cover object-top scale-125 origin-top" onError={e => { e.currentTarget.style.display = 'none'; }} />
                <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/90 ring-1 ring-violet-200 text-violet-600 text-[10px] font-bold whitespace-nowrap">詳細レポート</span>
              </div>
              <div className="absolute right-0 top-0 w-[55%] rotate-2 rounded-[20px] bg-white ring-1 ring-violet-100 shadow-[0_20px_44px_-14px_rgba(80,40,160,0.4)] overflow-hidden aspect-[3/4] z-10">
                <img src="/paywall-fv-program.png" alt="個別プログラム画面" className="w-full h-full object-cover object-top scale-125 origin-top" onError={e => { e.currentTarget.style.display = 'none'; }} />
                <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-violet-500 text-white text-[10px] font-bold whitespace-nowrap">個別プログラム</span>
              </div>
            </div>

            {/* 価値訴求カード */}
            <div className="mt-6 rounded-[28px] p-[1.5px] bg-gradient-to-b from-violet-300 via-violet-100 to-white shadow-[0_24px_48px_-20px_rgba(124,58,237,0.35)]">
              <div className="rounded-[27px] bg-white px-6 pt-6 pb-6">
                <ul className="space-y-2.5 text-left">
                  <CheckItem text="あなたの恐れと不安を可視化する詳細レポート" />
                  <CheckItem text="あなた専用の30日ミッション" />
                  <CheckItem text="AIによる記録・フィードバック" />
                </ul>
                <button
                  onClick={scrollToPlans}
                  className="mt-5 w-full py-4 rounded-full font-bold text-white text-[15px] active:scale-[0.98] transition-all"
                  style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
                >
                  プログラムを試してみる
                </button>
                <p className="mt-3 flex items-baseline justify-center gap-1.5">
                  <span className="text-[24px] font-black text-violet-600 tracking-tight">¥3,980</span>
                  <span className="text-xs text-stone-500 font-medium">（税込）</span>
                  <span className="text-sm text-stone-600 font-bold">1ヶ月分</span>
                </p>
              </div>
            </div>
          </section>

          {/* ════ 2. 詳細レポート ════ */}
          <section className="bg-white px-6 py-12">
            <p className="text-center text-[11px] font-bold tracking-[0.18em] text-violet-500">REPORT</p>
            <h2 className="font-bold text-[22px] text-center leading-snug mt-2 text-stone-900">
              合計<span className="text-violet-600">8軸</span>からなる<br />詳細なレポートをお届けします
            </h2>
            <p className="text-xs text-stone-500 leading-relaxed text-center mt-3">
              「なんとなくしんどい」の正体を、<br />4つの恐れ×認知・行動の8軸で可視化。<br />自分でも気づいていなかったパターンが、<br />言葉になって見えてきます。
            </p>
            <div className="mt-7 mx-auto w-[72%] rounded-[20px] bg-white ring-1 ring-violet-100 shadow-[0_16px_40px_-14px_rgba(80,40,160,0.3)] overflow-hidden aspect-[3/4]">
              <img src="/paywall-fv-report.png" alt="詳細レポート画面" className="w-full h-full object-cover object-top" onError={e => { e.currentTarget.style.display = 'none'; }} />
            </div>
          </section>

          {/* ════ 3. 日替わりミッション ════ */}
          <section className="bg-[#f4f1fc] px-6 py-12">
            <p className="text-center text-[11px] font-bold tracking-[0.18em] text-violet-500">PROGRAM</p>
            <h2 className="font-bold text-[22px] text-center leading-snug mt-2 text-stone-900">
              レポートを元にした、<br /><span className="text-violet-600">日替わりのミッション</span>を<br />届けます
            </h2>
            <p className="text-xs text-stone-500 leading-relaxed text-center mt-3">
              読んで終わりにしない。<br />あなたのパターンに合わせた小さなミッションが毎日届き、<br />30日かけて少しずつ反応のクセをほぐしていきます。
            </p>
            <div className="mt-7 mx-auto w-[72%] rounded-[20px] bg-white ring-1 ring-violet-100 shadow-[0_16px_40px_-14px_rgba(80,40,160,0.3)] overflow-hidden aspect-[3/4]">
              <img src="/paywall-fv-program.png" alt="個別プログラム画面" className="w-full h-full object-cover object-top" onError={e => { e.currentTarget.style.display = 'none'; }} />
            </div>
          </section>

          {/* ════ 4. 最初の3日間プレビュー ════ */}
          <section className="bg-white px-6 py-12">
            <p className="text-center text-[11px] font-bold tracking-[0.18em] text-violet-500">PREVIEW</p>
            <h2 className="font-bold text-[22px] text-center leading-snug mt-2 text-stone-900">
              あなたの<span className="text-violet-600">最初の3日間</span>は、<br />こんな内容です
            </h2>

            <div className="mt-7 rounded-[24px] bg-white shadow-sm ring-1 ring-violet-100/60 px-5 py-6">
              <ol className="relative space-y-7">
                <span className="absolute left-[17px] top-6 bottom-6 w-0.5 bg-violet-100" aria-hidden="true"></span>
                {dayPreviews.map((d, i) => (
                  <li key={i} className="relative flex gap-4">
                    <span className={`w-9 h-9 rounded-full text-white text-[10px] font-bold flex flex-col items-center justify-center leading-none flex-shrink-0 z-10 ${['bg-violet-500', 'bg-violet-400', 'bg-violet-300'][i]}`}>
                      <span className="text-[8px] opacity-80">Day</span>{i + 1}
                    </span>
                    <div className="pt-0.5">
                      <p className="text-[15px] font-bold text-stone-800 leading-snug">{d.title}</p>
                      <p className="text-xs text-stone-500 leading-relaxed mt-1">{d.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="text-[11px] text-stone-400 leading-relaxed mt-6 pt-4 border-t border-stone-100">
                回答内容に合わせて、最初は負担の少ないミッションから始まります。（内容の一例です）
              </p>
            </div>
          </section>

          {/* ════ 5. 向いている方／向いていない方 ════ */}
          <section className="bg-[#f4f1fc] px-6 py-12">
            <p className="text-center text-[11px] font-bold tracking-[0.18em] text-violet-500">FOR YOU?</p>
            <h2 className="font-bold text-[22px] text-center leading-snug mt-2 text-stone-900">
              こんな方に<span className="text-violet-600">向いています</span>
            </h2>

            <div className="mt-7 rounded-[24px] ring-1 ring-violet-100 overflow-hidden">
              <div className="bg-white px-5 py-5">
                <ul className="space-y-3">
                  <CheckItem text="考えすぎて動けなくなることがある" />
                  <CheckItem text="自分のしんどさの原因を、ちゃんと理解したい" />
                  <CheckItem text="変わりたいけど、何から始めればいいかわからない" />
                  <CheckItem text="AIと一緒に、自分の気持ちを整理しながら進めたい" />
                </ul>
              </div>
              <div className="bg-white/60 px-5 py-4 border-t border-violet-100">
                <p className="text-[11px] font-bold text-stone-400 mb-2">向いていない方</p>
                <ul className="space-y-2">
                  {[
                    '今すぐ医療的なサポートや専門家との面談が必要な方',
                    'AIとのやりとりに強い抵抗がある方',
                  ].map((t, i) => (
                    <li key={i} className="flex gap-2.5 items-start text-[13px] text-stone-500 leading-relaxed">
                      <span className="w-4 h-4 rounded-full bg-stone-200 text-stone-500 text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">−</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-[11px] text-stone-400 text-center leading-relaxed mt-4">
              無理におすすめするものではありません。ご自身に合う形でご検討ください。
            </p>
          </section>

          {/* ════ 6. プラン選択（購入ゾーン） ════ */}
          <section ref={plansRef} className="px-6 py-12 bg-gradient-to-b from-violet-800 via-violet-600 to-violet-800">
            <p className="text-center text-[11px] font-bold tracking-[0.18em] text-violet-200">PLANS</p>
            <h2 className="font-bold text-[22px] text-center leading-snug mt-2 text-white">ココリフトを始める</h2>
            <p className="text-xs text-violet-100 text-center mt-2">買い切り・自動更新はありません</p>

            {/* 30日プログラム */}
            <div className="mt-7 rounded-[28px] bg-white shadow-[0_24px_60px_-16px_rgba(40,16,90,0.5)] overflow-hidden">
              <div className="bg-gradient-to-r from-violet-400 to-violet-600 text-white text-center text-xs font-bold py-2 tracking-wide">✦ 無料診断を受けた方の特別価格</div>
              <div className="px-6 pt-5 pb-6">
                <p className="font-bold text-[22px] text-stone-900">30日プログラム</p>
                <p className="text-xs text-stone-500 mt-1">詳細レポートと30日ミッションがすべて含まれています</p>

                <div className="mt-4 flex items-end gap-2">
                  <span className="font-black text-[40px] leading-none text-violet-600 tracking-tight">¥3,980</span>
                  <div className="mb-0.5">
                    <p className="text-[11px] text-stone-400"><span className="line-through">¥4,980</span> → 診断特別価格</p>
                    <p className="text-[11px] text-stone-400">税込・買い切り</p>
                  </div>
                </div>

                <ul className="mt-5 space-y-2.5">
                  <CheckItem text="あなた専用の30日ミッション" />
                  <CheckItem text="ミッション後のAI振り返り" />
                  <CheckItem text="記録・連続日数・変化フィードバック" />
                  <CheckItem text="詳細な振り返り" />
                </ul>

                <button
                  onClick={() => setPlanDetailOpen(v => !v)}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-violet-50/70 text-[13px] font-medium text-stone-600"
                >
                  含まれる内容を詳しく見る
                  <span className={`text-violet-400 transition-transform ${planDetailOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {planDetailOpen && (
                  <div className="mt-3 space-y-3 rounded-2xl bg-violet-50/60 ring-1 ring-violet-100 p-4 text-left">
                    {[
                      { t: 'AI対話セッション', b: '不安になった出来事をAIと対話。事実と思い込みのズレに気づき、考え方のクセを一緒にほぐします。' },
                      { t: 'AIの変化フィードバック', b: '取り組み前後の不安の変化をAIが読み取り、あなたの進歩を言葉にして返します。' },
                      { t: '詳細な振り返り', b: '恐れ軸別・認知/行動別の統計と気づきの蓄積。変化がグラフと言葉の両方で見えます。' },
                    ].map((d, i) => (
                      <div key={i}>
                        <p className="text-xs font-bold text-stone-700">{d.t}</p>
                        <p className="text-xs text-stone-500 leading-relaxed mt-0.5">{d.b}</p>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => handleSelectPlan('standard')}
                  disabled={isLoading}
                  className="mt-5 w-full py-4 rounded-full font-bold text-white text-[15px] active:scale-[0.98] transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)' }}
                >
                  {isLoading ? '処理中...' : 'プログラムを始める'}
                </button>

                <div className="mt-4 grid grid-cols-3 divide-x divide-stone-100 text-center">
                  <div className="px-1">
                    <p className="text-[10px] font-bold text-stone-600">買い切り</p>
                    <p className="text-[9px] text-stone-400 mt-0.5">月額ではありません</p>
                  </div>
                  <div className="px-1">
                    <p className="text-[10px] font-bold text-stone-600">自動更新なし</p>
                    <p className="text-[9px] text-stone-400 mt-0.5">解約手続き不要</p>
                  </div>
                  <div className="px-1">
                    <p className="text-[10px] font-bold text-stone-600">安全な決済</p>
                    <p className="text-[9px] text-stone-400 mt-0.5">Stripeを利用</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-violet-100 leading-relaxed text-center mt-6">
              30日プログラムを進めるための機能は、<br />すべてこのプランに含まれています。
            </p>
          </section>

          {/* ════ 7. FAQ ════ */}
          <section className="bg-white px-6 py-12">
            <p className="text-center text-[11px] font-bold tracking-[0.18em] text-violet-500">FAQ</p>
            <h2 className="font-bold text-[22px] text-center leading-snug mt-2 text-stone-900">よくある質問</h2>

            <div className="mt-6 divide-y divide-stone-100 rounded-[24px] ring-1 ring-violet-100 px-5">
              {FAQ_ITEMS.map((f, i) => (
                <div key={i} className="py-1">
                  <button
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="w-full py-3.5 flex items-center justify-between gap-3 text-left"
                  >
                    <span className="text-sm font-bold text-stone-800 leading-snug">{f.q}</span>
                    <span className={`text-violet-400 transition-transform flex-shrink-0 ${faqOpen === i ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {faqOpen === i && (
                    <p className="text-xs text-stone-500 leading-relaxed pb-4">{f.a}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* ════ フッター（最後にもう一度、静かなCTA） ════ */}
          <section
            ref={footerRef}
            className="px-6 pt-10 pb-28 text-center"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.45), rgba(255,255,255,0.45)), url(/paywall-texture.jpg)', backgroundSize: '100% auto', backgroundRepeat: 'repeat-y', backgroundPosition: 'top center' }}
          >
            <img src="/images/icon-sprout.png" alt="" className="w-12 h-12 mx-auto" />
            <p className="font-bold text-[18px] text-stone-900 leading-relaxed mt-3">
              小さな一歩から、<br />始めてみませんか
            </p>
            <button
              onClick={scrollToPlans}
              className="mt-5 w-full py-4 rounded-full font-bold text-white text-[15px] active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
            >
              プログラムを始める
            </button>
            <p className="text-[10px] text-stone-400 mt-4">買い切り・自動更新なし ｜ 医療行為ではありません</p>
          </section>

          {/* ════ スティッキーCTA ════ */}
          <div className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[26.875rem] px-4 pb-4 pt-2 z-50 transition-transform duration-300 ${showSticky ? '' : 'translate-y-full pointer-events-none'}`}>
            <div className="rounded-full bg-white/95 backdrop-blur shadow-[0_12px_40px_rgba(60,30,120,0.25)] ring-1 ring-violet-100 pl-5 pr-2 py-2 flex items-center gap-3">
              <div className="leading-tight">
                <p className="text-[10px] text-stone-400"><span className="line-through">¥4,980</span> 買い切り</p>
                <p className="font-black text-[20px] text-violet-600 tracking-tight">¥3,980</p>
              </div>
              <button
                onClick={scrollToPlans}
                className="flex-1 py-3 rounded-full font-bold text-white text-sm active:scale-[0.98] transition-all"
                style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
              >
                プログラムを始める
              </button>
            </div>
          </div>

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
