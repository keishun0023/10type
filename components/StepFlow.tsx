'use client';

import { useState, useEffect } from 'react';
import { DiagType, TYPE_CONTENT } from '@/data/types';
import { FearAxis, DefenseAxis } from '@/data/questions';
import { ChangeOrientation, TYPE_NAMES } from '@/data/program';
import { updateDiagnosticOnboarding } from '@/lib/analytics';
import { fbqEvent, fbqPaywallReached } from '@/lib/pixel';

// ─── Types ───

interface StepFlowProps {
  firstType: DiagType;
  secondType: DiagType;
  fearScores: Record<FearAxis, number>;
  defenseScores: Record<DefenseAxis, number>;
  distressTotal: number;
  sessionId: string;
  onRestart: () => void;
}

interface Onboarding {
  distressLevel: string;
  difficultScene: string;
  difficultDetail: string;
  difficultFreeText: string;
  changeOrientation: string;
}

interface VisionData {
  rootFear: string;
  manifestation: string;
  approach: string;
  future: string;
}

// ─── Constants (from program/page.tsx) ───

const ORIENTATION_MAP: Record<string, ChangeOrientation> = {
  '変わりたい・できるようになりたい': 'change',
  '今の自分を受け入れて、楽になりたい': 'accept',
  'まだよく分からない': 'unknown',
};

const ONBOARDING_QUESTIONS = [
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
    key: 'distressLevel',
    question: '今の困り度を教えてください',
    options: ['とても困っている', '少し困っている', '知的興味で'],
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
];

const BUILDING_STEPS = [
  '診断結果を読み込んでいます',
  'あなたの回答を反映しています',
  'プランの構成を決めています',
];

const TOTAL_STEPS = 15;

// ─── Step enum ───

type StepId =
  | 'difficultScene'
  | 'distressLevel'
  | 'changeOrientation'
  | 'difficultDetail'
  | 'difficultFreeText'
  | 'analysis'
  | 'typeReveal'
  | 'relatable'
  | 'why'
  | 'vision'
  | 'philosophy'
  | 'whatYouGet'
  | 'counselingComparison'
  | 'preview'
  | 'pricing';

const STEP_ORDER: StepId[] = [
  'difficultScene',
  'distressLevel',
  'changeOrientation',
  'difficultDetail',
  'difficultFreeText',
  'analysis',
  'typeReveal',
  'relatable',
  'why',
  'vision',
  'philosophy',
  'whatYouGet',
  'counselingComparison',
  'preview',
  'pricing',
];

// ─── Helpers ───

function renderBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-bold text-stone-900 underline decoration-purple-200 decoration-4 underline-offset-2">
        {part}
      </strong>
    ) : part
  );
}

// ─── Shared CTA button ───

function NextButton({ onClick, label = '次へ' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 rounded-full font-bold text-white text-base transition-all active:scale-[0.98]"
      style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
    >
      {label}
    </button>
  );
}

// ─── Component ───

export default function StepFlow({
  firstType,
  fearScores,
  sessionId,
}: StepFlowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [onboarding, setOnboarding] = useState<Partial<Onboarding>>({});
  const [vision, setVision] = useState<VisionData | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Deepdive state
  const [detailSelected, setDetailSelected] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');

  // Analysis animation
  const [buildingStep, setBuildingStep] = useState(0);

  // FAQ
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  // Fade animation
  const [fadeIn, setFadeIn] = useState(true);

  const content = TYPE_CONTENT[firstType.id];
  const typeName = TYPE_NAMES[firstType.id] || firstType.name;
  const currentStep = STEP_ORDER[currentStepIndex];

  // Fade transition on step change
  useEffect(() => {
    setFadeIn(false);
    const t = setTimeout(() => setFadeIn(true), 50);
    return () => clearTimeout(t);
  }, [currentStepIndex]);

  // Analysis animation + API call
  useEffect(() => {
    if (currentStep !== 'analysis') return;

    // Fire CompleteRegistration
    fbqEvent('CompleteRegistration', { content_name: firstType.name });

    // Save onboarding to diagnostics
    const finalOnboarding = {
      ...onboarding,
      difficultDetail: detailSelected.join('、'),
      difficultFreeText: freeText.trim(),
    };
    if (sessionId) {
      updateDiagnosticOnboarding(sessionId, finalOnboarding as Record<string, string>);
    }

    // Start vision generation in background
    setVisionLoading(true);
    fetch('/api/generate-vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        typeId: firstType.id,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.vision) {
          setVision(data.vision);
        }
      })
      .catch(() => {})
      .finally(() => setVisionLoading(false));

    // Building animation
    let step = 0;
    setBuildingStep(0);
    const interval = setInterval(() => {
      step += 1;
      if (step >= BUILDING_STEPS.length) {
        clearInterval(interval);
        setTimeout(() => {
          setCurrentStepIndex(prev => prev + 1);
        }, 500);
        return;
      }
      setBuildingStep(step);
    }, 900);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Fire ViewContent when entering service explanation phase
  useEffect(() => {
    if (currentStep === 'philosophy') {
      fbqPaywallReached();
      fbqEvent('ViewContent', { content_name: 'service_explanation' });
    }
  }, [currentStep]);

  function goNext() {
    if (currentStepIndex < STEP_ORDER.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }

  function goBack() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }

  function handleOnboardingAnswer(key: string, value: string) {
    setOnboarding(prev => ({ ...prev, [key]: value }));
    goNext();
  }

  function toggleDetail(opt: string) {
    setDetailSelected(prev =>
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    );
  }

  async function handleCheckout() {
    fbqEvent('InitiateCheckout', { content_name: 'standard' });
    setIsLoading(true);
    try {
      const changeOrientation: ChangeOrientation =
        ORIENTATION_MAP[onboarding.changeOrientation ?? ''] ?? 'unknown';
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'standard',
          email: '',
          typeId: firstType.id,
          onboarding: { ...onboarding, changeOrientation },
          session: sessionId,
        }),
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

  if (!content) return null;

  const progress = ((currentStepIndex + 1) / TOTAL_STEPS) * 100;

  // ─── Step renderers ───

  function renderQuestionStep(
    questionKey: string,
    questionText: string,
    options: string[],
    note?: string,
  ) {
    return (
      <div className="w-full max-w-sm mx-auto space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-stone-800 leading-snug">{questionText}</h2>
          {note && <p className="text-xs text-stone-400 leading-relaxed">{note}</p>}
        </div>
        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleOnboardingAnswer(questionKey, opt)}
              className="w-full py-4 px-5 rounded-2xl border-2 border-stone-200 text-left text-sm font-medium text-stone-700 hover:border-purple-400 hover:bg-purple-50 transition-all active:scale-[0.98] leading-snug"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderStep(): React.ReactNode {
    switch (currentStep) {
      // ─── Onboarding Questions ───
      case 'difficultScene':
      case 'distressLevel':
      case 'changeOrientation': {
        const q = ONBOARDING_QUESTIONS.find(oq => oq.key === currentStep)!;
        return renderQuestionStep(q.key, q.question, q.options, q.note);
      }

      case 'difficultDetail': {
        const scene = onboarding.difficultScene ?? '';
        const details = SCENE_DETAILS[scene] ?? [];
        return (
          <div className="w-full max-w-sm mx-auto space-y-7">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-stone-800 leading-snug">具体的に困っていることを教えてください</h2>
              <p className="text-xs text-stone-400 leading-relaxed">
                当てはまるものを選んでください（複数可）
              </p>
            </div>
            {details.length > 0 && (
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
            )}
            <NextButton
              onClick={() => {
                setOnboarding(prev => ({ ...prev, difficultDetail: detailSelected.join('、') }));
                goNext();
              }}
            />
          </div>
        );
      }

      case 'difficultFreeText': {
        return (
          <div className="w-full max-w-sm mx-auto space-y-7">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-stone-800 leading-snug">他にもあれば、自由に書いてください</h2>
              <p className="text-xs text-stone-400 leading-relaxed">任意です。スキップもできます。</p>
            </div>
            <div className="space-y-2">
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
            <NextButton onClick={goNext} />
            <button
              onClick={goNext}
              className="w-full text-center text-xs text-stone-400 hover:text-purple-500 transition-colors"
            >
              スキップして進む
            </button>
          </div>
        );
      }

      // ─── Analysis Animation ───
      case 'analysis': {
        return (
          <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-8">
            <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
            <p className="text-lg font-bold text-purple-600">あなたの回答を分析しています…</p>
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
        );
      }

      // ─── Result Phase ───
      case 'typeReveal': {
        return (
          <div className="w-full max-w-sm mx-auto text-center space-y-4">
            <span className="inline-block px-4 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium tracking-wide">
              診断タイプ
            </span>
            <h1 className="text-2xl font-bold text-stone-900 leading-snug">
              あなたは「<span className="text-purple-600 underline decoration-purple-200 decoration-4 underline-offset-4">{firstType.name}</span>」です
            </h1>
            <div className="relative py-4">
              <div className="absolute inset-0 bg-purple-100/40 rounded-full blur-3xl -z-10 scale-90" />
              <img
                src={`/illustrations/${firstType.id}.png`}
                alt={firstType.name}
                className="w-72 h-72 object-contain mx-auto"
              />
            </div>
            <p className="text-sm text-stone-500 leading-relaxed">{content.subtitle}</p>
            <NextButton onClick={goNext} />
          </div>
        );
      }

      case 'relatable': {
        const items = content.relatable.slice(0, 3);
        return (
          <div className="w-full max-w-sm mx-auto space-y-6">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <img src="/section-relatable-title.png" alt="" className="w-8 h-8 object-contain" />
              こんなこと、ありませんか？
            </h2>
            <ul className="space-y-4">
              {items.map((text, i) => (
                <li key={i} className="flex items-start gap-3 p-4 bg-white/70 rounded-2xl border border-stone-100">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0" />
                  <p className="text-sm text-stone-700 leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
            <NextButton onClick={goNext} />
          </div>
        );
      }

      case 'why': {
        return (
          <div className="w-full max-w-sm mx-auto space-y-6">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <img src="/section-why-title.png" alt="" className="w-8 h-8 object-contain" />
              どうして、こうなるんだろう？
            </h2>
            <div className="space-y-4 text-sm text-stone-700 leading-relaxed">
              {content.why.map((para, i) => {
                if (i === 1) {
                  return (
                    <div key={i} className="bg-white rounded-2xl border border-stone-200 px-5 py-4 italic text-stone-600 leading-relaxed">
                      {renderBold(para)}
                    </div>
                  );
                }
                return <p key={i}>{renderBold(para)}</p>;
              })}
            </div>
            <NextButton onClick={goNext} />
          </div>
        );
      }

      // ─── Vision (AI generated) ───
      case 'vision': {
        if (visionLoading || !vision) {
          return (
            <div className="w-full max-w-sm mx-auto space-y-6">
              <h2 className="text-lg font-bold text-stone-900">あなたに合わせた変化のビジョン</h2>
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-stone-100 rounded-full animate-pulse" style={{ width: `${85 - i * 5}%` }} />
                    <div className="h-4 bg-stone-100 rounded-full animate-pulse" style={{ width: `${75 - i * 3}%` }} />
                    <div className="h-4 bg-stone-100 rounded-full animate-pulse" style={{ width: `${65 + i * 2}%` }} />
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return (
          <div className="w-full max-w-sm mx-auto space-y-6">
            <h2 className="text-lg font-bold text-stone-900">あなたに合わせた変化のビジョン</h2>
            <div className="space-y-5 text-sm text-stone-700 leading-relaxed">
              <p>{vision.rootFear}</p>
              <p>{vision.manifestation}</p>
              <p>{vision.approach}</p>
              <p>{renderBold(vision.future)}</p>
            </div>
            <NextButton onClick={goNext} />
          </div>
        );
      }

      // ─── Service Explanation Phase ───
      case 'philosophy': {
        return (
          <div className="w-full max-w-sm mx-auto space-y-6">
            <h2 className="text-xl font-bold text-stone-900 leading-snug">このプログラムの設計思想</h2>
            <div className="space-y-4">
              {[
                { title: '恐れ(4軸)×防衛(3軸)で構造が違う', body: '同じ「生きづらさ」でも、恐れの種類と防衛のしかたの組み合わせは人によって異なります。' },
                { title: 'だから個別に配合を変える', body: 'あなたの恐れの上位2軸に合わせて、プログラムの中身を組み替えます。' },
                { title: '変わりたい/楽になりたいで比率を変える', body: '行動を変えたい人には行動ワークを、考え方を整理したい人には認知ワークを多く配合します。' },
                { title: 'あなたの30日は、この設計エンジンが組んだもの', body: 'テンプレートではなく、あなたの回答から個別に設計されたプログラムです。' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-stone-100 space-y-1">
                  <p className="text-sm font-bold text-stone-800">{item.title}</p>
                  <p className="text-xs text-stone-500 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
            <NextButton onClick={goNext} />
          </div>
        );
      }

      case 'whatYouGet': {
        return (
          <div className="w-full max-w-sm mx-auto space-y-6">
            <h2 className="text-xl font-bold text-stone-900 leading-snug">毎日届くもの</h2>
            <div className="space-y-4">
              {[
                { label: '毎日1つのワーク（認知 or 行動）', detail: '考え方の整理と、小さな行動実験の2種類' },
                { label: '1日5〜10分', detail: '短い時間で、無理なく続けられます' },
                { label: 'AIがあなた専用に生成', detail: 'あなたの恐れの構造に合わせた内容です' },
                { label: 'ダッシュボードで変化を可視化', detail: '取り組みの記録と変化を振り返れます' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-stone-100 space-y-1">
                  <p className="text-sm font-bold text-stone-800">{item.label}</p>
                  <p className="text-xs text-stone-500 leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
            <NextButton onClick={goNext} />
          </div>
        );
      }

      case 'counselingComparison': {
        const rows = [
          { label: '気づきの方法', old: '週1の対話', neo: '毎日の認知ワーク' },
          { label: '実践', old: '次回まで放置', neo: 'その日のうちに試す' },
          { label: '費用', old: '月1〜2万円', neo: '3,980円・買い切り' },
          { label: 'スタイル', old: '予約して通う', neo: 'スマホで自分のペースで' },
        ];
        return (
          <div className="w-full max-w-sm mx-auto space-y-6">
            <h2 className="text-xl font-bold text-stone-900 leading-snug">カウンセリングとの違い</h2>
            <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
              {rows.map((row, i) => (
                <div key={i} className={`px-4 py-3 ${i > 0 ? 'border-t border-stone-100' : ''}`}>
                  <p className="text-xs text-stone-400 mb-1">{row.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400 line-through">{row.old}</span>
                    <span className="text-purple-400">→</span>
                    <span className="text-sm font-bold text-purple-600">{row.neo}</span>
                  </div>
                </div>
              ))}
            </div>
            <NextButton onClick={goNext} />
          </div>
        );
      }

      case 'preview': {
        const dayPreviews = DAY_PREVIEWS[onboarding.difficultScene ?? ''] ?? DEFAULT_DAY_PREVIEW;
        return (
          <div className="w-full max-w-sm mx-auto space-y-6">
            <h2 className="text-xl font-bold text-stone-900 leading-snug text-center">
              あなたの<span className="text-purple-600">最初の3日間</span>
            </h2>
            <div className="space-y-3">
              {dayPreviews.map((d, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-stone-100 space-y-3">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-500 text-white text-xs font-bold">Day {i + 1}</span>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-stone-800 leading-snug">{d.title}</p>
                    <p className="text-xs text-stone-500 leading-relaxed">{d.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-400 text-center leading-relaxed">
              回答内容に合わせて、最初は負担の少ないミッションから始まります。
            </p>
            <NextButton onClick={goNext} />
          </div>
        );
      }

      // ─── Payment Phase ───
      case 'pricing': {
        return (
          <div className="w-full max-w-sm mx-auto space-y-8">
            {/* Price card */}
            <div className="bg-white rounded-3xl p-6 border-2 border-purple-400 shadow-lg shadow-purple-100 space-y-4 text-center">
              <p className="text-2xl font-bold text-stone-900">スタンダード</p>
              <p className="text-xs text-stone-500">30日プログラム</p>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-lg text-stone-400 line-through">¥4,980</span>
                <span className="text-purple-400 text-xl">→</span>
                <span className="text-4xl font-bold text-purple-600">¥3,980</span>
                <span className="text-sm text-stone-400 self-end mb-1">（税込）</span>
              </div>
              <p className="text-xs text-stone-400">買い切り・自動更新なし</p>
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full py-4 rounded-full font-bold text-white text-base transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
              >
                {isLoading ? '処理中...' : 'このプログラムを始める'}
              </button>
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
            </div>

            {/* FAQ */}
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

            {/* Medical disclaimer */}
            <div className="bg-stone-100 rounded-2xl p-4 text-center">
              <p className="text-xs text-stone-400 leading-relaxed">
                ※本プログラムは医療行為ではありません。<br />
                CBT（認知行動療法）の考え方をベースにした<br />
                セルフケアツールです。効果を保証するものではありません。
              </p>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  }

  // Don't show navigation for analysis step
  const isAnalysis = currentStep === 'analysis';
  const showBackButton = !isAnalysis && currentStepIndex > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
      {/* Progress bar */}
      {!isAnalysis && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="h-1 bg-stone-100">
            <div
              className="h-full bg-purple-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className={`flex-1 flex flex-col items-center justify-center px-5 py-12 transition-opacity duration-300 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
      >
        {renderStep()}
      </div>

      {/* Back button */}
      {showBackButton && (
        <div className="px-5 pb-8 max-w-sm mx-auto w-full">
          <button
            onClick={goBack}
            className="w-full py-3 text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            ← 戻る
          </button>
        </div>
      )}
    </div>
  );
}
