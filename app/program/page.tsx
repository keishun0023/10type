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

// ペイウォールの個別化見出し用：しんどい場面の短縮ラベル
const SCENE_SHORT: Record<string, string> = {
  '評価される・見られる場面（発表・提出・ミスなど）': '評価される場面',
  '予定が変わったり、見通しが立たないとき': '見通しが立たない場面',
  '人に頼んだり、断ったりしないといけないとき': '頼む・断る場面',
  '大切な人との関係がギクシャクしたとき': '大切な人との関係',
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
    q: 'どちらのプランを選べばいいですか？',
    a: '迷ったらスタンダードがおすすめです。30日プログラムを進める機能はすべて含まれています。',
  },
];

const BUILDING_STEPS = [
  '診断結果を読み込んでいます',
  'あなたの回答を反映しています',
  'プランの構成を決めています',
];

// 装飾用の葉っぱ（public/paywall-leaf.png を置くと表示される。無ければ自動非表示）
function Leaf({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <img
      src="/paywall-leaf.png"
      alt=""
      className={`pointer-events-none select-none ${className ?? ''}`}
      style={style}
      onError={e => { e.currentTarget.style.display = 'none'; }}
    />
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
  const contentRef = useRef<HTMLDivElement>(null);

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
    const sceneShort = SCENE_SHORT[onboarding.difficultScene ?? ''] || '';
    const dayPreviews = DAY_PREVIEWS[onboarding.difficultScene ?? ''] ?? DEFAULT_DAY_PREVIEW;

    const screenshots = [
      { src: '/paywall-shot-1.png', badge: '今日のミッション', title: '今日やることは1つだけ', body: '毎日、今のあなたに合わせた小さなミッションが表示されます' },
      { src: '/paywall-shot-2.png', badge: 'AI対話', title: '不安をひとりで抱え込まない', body: '出来事・考え・感情を、AIと一緒に整理できます' },
      { src: '/paywall-shot-3.png', badge: '成長記録', title: '変化が見えるから、続けやすい', body: '取り組んだ回数や気づきが残り、変化を振り返れます' },
    ];

    return (
      <div className="min-h-screen px-5 py-12 relative" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        {/* 背景テクスチャ（public/paywall-texture.jpg を置くと表示。縦に繰り返し） */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'url(/paywall-texture.jpg)', backgroundSize: '100% auto', backgroundRepeat: 'repeat-y' }}
        />
        <div className="w-full max-w-sm mx-auto space-y-12 relative">

          {/* ── 1. ファーストビュー ── */}
          <div className="text-center space-y-4 relative">
            <Leaf className="absolute -right-3 top-16 w-10 opacity-70 rotate-12" />
            <Leaf className="absolute -left-3 top-44 w-8 opacity-50 -rotate-45 scale-x-[-1]" />
            <span className="inline-block px-3 py-1 rounded-full bg-purple-100 text-purple-600 text-xs font-medium">
              ✦ 診断結果から作成しました
            </span>
            <h1 className="text-2xl font-bold text-stone-900 leading-snug">
              <span className="text-purple-600">{typeName}</span>向けに、<br />30日間の&ldquo;小さな一歩&rdquo;を<br />用意しました
            </h1>
            <p className="text-sm text-stone-500 leading-relaxed">
              {sceneShort ? <>{sceneShort}でしんどくなりやすいあなたへ。<br /></> : null}
              まずは頭の中を整理し、無理のない<br />小さな行動から始めます。
            </p>

            {/* ミニ価値訴求 */}
            <div className="bg-white rounded-3xl p-4 border border-stone-100 grid grid-cols-3 divide-x divide-stone-100">
              {[
                { icon: '/images/icon-day.png', label: '毎日5分の\nミッション' },
                { icon: '/images/icon-cloud.png', label: 'AIと不安を\n整理' },
                { icon: '/images/icon-sparkle.png', label: '変化が\n記録で見える' },
              ].map((f, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 px-1">
                  <img src={f.icon} alt="" className="w-8 h-8 object-contain" />
                  <p className="text-xs text-stone-600 font-medium text-center whitespace-pre-line leading-tight">{f.label}</p>
                </div>
              ))}
            </div>

            {/* 価格の予告 */}
            <div className="bg-white rounded-3xl p-5 border border-purple-100 space-y-3">
              <span className="inline-block px-3 py-1 rounded-full bg-purple-50 text-purple-500 text-xs font-medium border border-purple-100">
                30日プログラム
              </span>
              <p>
                <span className="text-3xl font-bold text-purple-600">¥3,980〜</span>
                <span className="text-xs text-stone-400 ml-2">・自動更新なし</span>
              </p>
              <button
                onClick={() => contentRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full py-4 rounded-full font-bold text-white text-base transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
              >
                内容を見てプランを選ぶ
              </button>
              <p className="text-xs text-stone-400">下にスクロールして詳細を確認できます</p>
            </div>
          </div>

          {/* ── 2. 無料診断と有料プログラムの違い ── */}
          <div ref={contentRef} className="space-y-5 scroll-mt-6">
            <div className="text-center space-y-3">
              <h2 className="text-xl font-bold text-stone-900 leading-snug">診断結果を、<br /><span className="text-purple-600">毎日の行動</span>に落とし込みます</h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                無料診断では、あなたのしんどさの傾向を整理しました。ここから先のプログラムでは、その結果をもとに「今日なにをするか」まで具体化していきます。
              </p>
            </div>
            <div className="space-y-2">
              {[
                { icon: '/images/icon-write.png', title: '無料診断', body: 'あなたの傾向がわかる', done: true },
                { icon: '/images/icon-calendar.png', title: '30日プログラム', body: '毎日のミッションに落とし込む', done: false },
                { icon: '/images/icon-cloud.png', title: 'AI振り返り', body: '不安や気づきを一緒に整理する', done: false },
              ].map((s, i) => (
                <div key={i}>
                  {i > 0 && <p className="text-center text-purple-400 text-lg leading-none py-1">↓</p>}
                  <div className="bg-white rounded-2xl p-4 border border-stone-100 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <img src={s.icon} alt="" className="w-8 h-8 object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-stone-800">{s.title}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{s.body}</p>
                    </div>
                    {s.done && (
                      <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-500 text-xs font-medium border border-purple-100">済 ✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 3. 最初の3日間プレビュー ── */}
          <div className="space-y-5 relative">
            <Leaf className="absolute -left-4 -top-2 w-9 opacity-60 -rotate-12 scale-x-[-1]" />
            <Leaf className="absolute -right-4 top-6 w-9 opacity-60 rotate-12" />
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-stone-900 leading-snug">あなたの<span className="text-purple-600">最初の3日間</span>は、<br />こんな内容です</h2>
              <p className="text-xs text-stone-400 leading-relaxed">回答内容に合わせて、最初は負担の少ないミッションから始まります。（内容の一例です）</p>
            </div>
            <div className="space-y-3">
              {dayPreviews.map((d, i) => {
                const dayIcons = ['/images/icon-write.png', '/images/icon-balance.png', '/images/icon-path.png'];
                return (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-stone-100 flex gap-4 items-start">
                    <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <img src={dayIcons[i]} alt="" className="w-8 h-8 object-contain" />
                    </div>
                    <div className="space-y-1.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-500 text-white text-xs font-bold">Day {i + 1}</span>
                      <p className="text-sm font-bold text-stone-800">{d.title}</p>
                      <p className="text-xs text-stone-500 leading-relaxed">{d.body}</p>
                    </div>
                  </div>
                );
              })}
              <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100 flex gap-4 items-center">
                <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center flex-shrink-0 text-2xl">
                  🔒
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-purple-600">Day 4以降も、あなたの記録に合わせて続きます</p>
                  <p className="text-xs text-stone-500">開始後にすべて確認できます</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── 4. 30日間の流れ ── */}
          <div className="space-y-5 relative">
            <Leaf className="absolute -left-3 top-2 w-10 opacity-60 -rotate-6 scale-x-[-1]" />
            <Leaf className="absolute -right-3 top-10 w-8 opacity-50 rotate-45" />
            <div className="text-center space-y-3">
              <h2 className="text-xl font-bold text-stone-900 leading-snug">いきなり<span className="text-purple-600">変わろうとしなくて</span><br />大丈夫です</h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                ココリフトは、気合いで頑張るためのサービスではありません。考えを整理し、小さく試し、振り返る流れを毎日少しずつ積み上げます。
              </p>
            </div>
            <div className="space-y-3">
              {[
                { icon: '/images/icon-write.png', title: 'まず、頭の中を整理する', body: '不安になった出来事を、事実と思い込みに分けて見ていきます' },
                { icon: '/images/icon-sprout.png', title: '小さく、試してみる', body: 'いきなり大きな挑戦ではなく、できそうな一歩から始めます' },
                { icon: '/images/icon-sparkle.png', title: '変化を、見える形で残す', body: '毎日の記録が積み上がり、変化を言葉とグラフで見返せます' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-stone-100 flex gap-4 items-start">
                  <img src={s.icon} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-stone-800">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-purple-500 text-white text-xs font-bold mr-1.5">{i + 1}</span>
                      {s.title}
                    </p>
                    <p className="text-xs text-stone-500 leading-relaxed mt-1">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 5. アプリ実画面（画像が置かれたら表示される） ── */}
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-stone-900 leading-snug text-center">実際には、<br /><span className="text-purple-600">こんな画面</span>で進めます</h2>
            <div className="space-y-6">
              {screenshots.map((s, i) => (
                <div key={i} className="space-y-3">
                  {/* 上半分だけ見せるクロップ（縦の圧迫感を減らす） */}
                  <div className="w-3/4 mx-auto aspect-[5/4] overflow-hidden">
                    <img
                      src={s.src}
                      alt=""
                      className="w-full object-cover object-top"
                      onError={e => { ((e.currentTarget.parentElement as HTMLElement).parentElement as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <span className="inline-block px-3 py-1 rounded-full bg-purple-500 text-white text-xs font-bold">{s.badge}</span>
                    <p className="text-base font-bold text-stone-800">{s.title}</p>
                    <p className="text-xs text-stone-500 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 6. 向いている人・向いていない人 ── */}
          <div className="space-y-4">
            <div className="relative">
              <Leaf className="absolute -right-3 -top-3 w-9 opacity-60 rotate-12" />
              <h2 className="text-xl font-bold text-stone-900 text-center">こんな方に<span className="text-purple-600">向いています</span></h2>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-3">
              <p className="text-sm font-bold text-stone-800 text-center">向いている方</p>
              <ul className="space-y-2.5">
                {[
                  '考えすぎて動けなくなることがある',
                  '自分のしんどさの原因を、ちゃんと理解したい',
                  '変わりたいけど、何から始めればいいかわからない',
                  'AIと一緒に、自分の気持ちを整理しながら進めたい',
                ].map((t, i) => (
                  <li key={i} className="flex gap-2.5 items-start text-sm text-stone-700">
                    <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-3">
              <p className="text-sm font-bold text-stone-800 text-center">向いていない方</p>
              <ul className="space-y-2.5">
                {[
                  '今すぐ医療的なサポートや専門家との面談が必要な方',
                  'AIとのやりとりに強い抵抗がある方',
                ].map((t, i) => (
                  <li key={i} className="flex gap-2.5 items-start text-sm text-stone-500">
                    <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">−</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-stone-400 text-center leading-relaxed">無理におすすめするものではありません。<br />ご自身に合う形でご検討ください。</p>
          </div>

          {/* ── 7. プランカード ── */}
          <div className="space-y-4">
            {/* スタンダード（推奨） */}
            <div className="bg-white rounded-3xl p-6 border-2 border-purple-400 relative shadow-lg shadow-purple-100">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="bg-purple-500 text-white text-xs font-bold px-4 py-1 rounded-full">✦ おすすめ・まずはこちら</span>
              </div>
              <div className="space-y-4 text-center pt-2">
                <div>
                  <p className="text-xl font-bold text-stone-900">スタンダード</p>
                  <p className="text-xs text-stone-500 mt-1">30日プログラムを一通り進めたい方へ</p>
                </div>
                <div>
                  <p>
                    <span className="text-4xl font-bold text-purple-600">¥3,980</span>
                    <span className="text-sm text-stone-400 ml-1.5">税込</span>
                  </p>
                  <p className="text-xs text-stone-400 mt-1">自動更新なし</p>
                </div>
                <button
                  onClick={() => handleSelectPlan('standard')}
                  disabled={isLoading}
                  className="w-full py-4 rounded-full font-bold text-white text-base transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
                >
                  {isLoading ? '処理中...' : 'スタンダードで始める'}
                </button>
                <p className="text-xs text-stone-400">決済後、すぐに今日のミッションから始められます</p>
                <ul className="space-y-2.5 text-left">
                  {[
                    'あなた専用の30日ミッション',
                    'ミッション後のAI振り返り',
                    '記録・連続日数・変化フィードバック',
                    '詳細な振り返り',
                  ].map((t, i) => (
                    <li key={i} className="flex gap-2.5 items-start text-sm font-medium text-stone-700 border-b border-dashed border-stone-100 pb-2.5 last:border-0 last:pb-0">
                      <span className="w-5 h-5 rounded-full bg-purple-400 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">✓</span>
                      {t}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setPlanDetailOpen(v => !v)}
                  className="w-full py-3 rounded-2xl border border-stone-200 text-sm font-medium text-stone-600 flex items-center justify-center gap-2"
                >
                  含まれる内容を詳しく見る
                  <span className={`transition-transform ${planDetailOpen ? 'rotate-180' : ''}`}>▾</span>
                </button>
                {planDetailOpen && (
                  <div className="text-left space-y-3 bg-purple-50/60 rounded-2xl p-4 border border-purple-100">
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
              </div>
            </div>

            {/* プレミアム */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200">
              <div className="space-y-4 text-center">
                <div>
                  <p className="text-xl font-bold text-stone-900">プレミアム</p>
                  <p className="text-xs text-stone-500 mt-1">ミッション以外でも、いつでもAIに相談したい方へ</p>
                </div>
                <div>
                  <p>
                    <span className="text-4xl font-bold text-stone-900">¥8,980</span>
                    <span className="text-sm text-stone-400 ml-1.5">税込</span>
                  </p>
                  <p className="text-xs text-stone-400 mt-1">自動更新なし</p>
                </div>
                <button
                  onClick={() => handleSelectPlan('premium')}
                  disabled={isLoading}
                  className="w-full py-4 rounded-full font-bold text-stone-700 border-2 border-stone-300 hover:border-purple-300 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? '処理中...' : 'プレミアムで始める'}
                </button>
                <ul className="space-y-2.5 text-left">
                  {[
                    'スタンダードの機能すべて',
                    'いつでもAI相談（無制限）',
                    '月次の総括フィードバック',
                  ].map((t, i) => (
                    <li key={i} className="flex gap-2.5 items-start text-sm font-medium text-stone-700 border-b border-dashed border-stone-100 pb-2.5 last:border-0 last:pb-0">
                      <span className="w-5 h-5 rounded-full bg-stone-300 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">✓</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ── 8. 迷ったら＋FAQ ── */}
          <div className="space-y-5">
            <div className="text-center space-y-3 relative">
              <Leaf className="absolute left-0 top-1 w-9 opacity-60 -rotate-12 scale-x-[-1]" />
              <Leaf className="absolute right-0 top-1 w-9 opacity-60 rotate-12" />
              <h2 className="text-xl font-bold text-stone-900 leading-snug px-10">迷ったら、まずは<span className="text-purple-600">スタンダード</span>で十分です</h2>
              <p className="text-sm text-stone-500 leading-relaxed">
                30日プログラムを進めるための機能は、スタンダードにすべて含まれています。ミッション以外でもいつでもAIに相談したい場合は、プレミアムを選べます。
              </p>
            </div>

            <div className="bg-white rounded-3xl p-5 border border-purple-100 space-y-1">
              <p className="text-base font-bold text-stone-800 text-center pb-2">よくある質問</p>
              {FAQ_ITEMS.map((f, i) => (
                <div key={i} className="border-t border-stone-100">
                  <button
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    className="w-full py-3.5 flex items-center justify-between gap-3 text-left"
                  >
                    <span className="text-sm font-bold text-stone-800">{i + 1}. {f.q}</span>
                    <span className={`text-purple-400 transition-transform flex-shrink-0 ${faqOpen === i ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {faqOpen === i && (
                    <p className="text-xs text-stone-500 leading-relaxed pb-3.5">{f.a}</p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-400 text-center">✦ 気になることがあれば、購入前に確認できます ✦</p>
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
