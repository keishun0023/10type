'use client';

import { useState, useEffect, useRef } from 'react';
import { DiagType } from '@/data/types';
import { FearAxis, DefenseAxis } from '@/data/questions';
import { ChangeOrientation } from '@/data/program';
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
  fears: string;
  consequence: string;
  dailyStruggles: string[];
  outcomes: string[];
}

// ─── 線アイコン（1.6px stroke） ───

type IcoProps = React.SVGProps<SVGSVGElement>;
const Ico = {
  check: (p: IcoProps = {}) => (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5l5 5L20 6.5" /></svg>
  ),
  bloom: (p: IcoProps = {}) => (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
      strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3c.9 2.4.9 4.2 0 6 -.9-1.8-.9-3.6 0-6z" /><path d="M12 21c-.9-2.4-.9-4.2 0-6 .9 1.8.9 3.6 0 6z" />
      <path d="M3 12c2.4-.9 4.2-.9 6 0 -1.8.9-3.6.9-6 0z" /><path d="M21 12c-2.4.9-4.2.9-6 0 1.8-.9 3.6-.9 6 0z" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  chat: (p: IcoProps = {}) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 5.5h16v10H9l-4 3.5v-3.5H4z" /><path d="M8.5 10.2h7M8.5 13h4.5" /></svg>
  ),
  arrow: (p: IcoProps = {}) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
  ),
  chevron: (p: IcoProps = {}) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9l6 6 6-6" /></svg>
  ),
  go: (p: IcoProps = {}) => (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6l6 6-6 6" /></svg>
  ),
  full: (p: IcoProps = {}) => (
    <svg viewBox="0 0 24 24" width="21" height="21" {...p}>
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.14" />
      <path d="M7.5 12.3l3 3 6-6.2" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ),
  partial: (p: IcoProps = {}) => (
    <svg viewBox="0 0 24 24" width="21" height="21" {...p}>
      <circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <path d="M12 8.4v7.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.5" /></svg>
  ),
  none: (p: IcoProps = {}) => (
    <svg viewBox="0 0 24 24" width="21" height="21" {...p}>
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.38" /></svg>
  ),
};
type CompareMark = 'full' | 'partial' | 'none';

// ─── Constants ───

const ORIENTATION_MAP: Record<string, ChangeOrientation> = {
  '変わりたい・できるようになりたい': 'change',
  '今の自分を受け入れて、楽になりたい': 'accept',
  'まだよく分からない': 'unknown',
};

const ONBOARDING_QUESTIONS = [
  {
    key: 'difficultScene',
    question: '一番しんどくなりやすい場面は\nどれですか？',
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
    question: '今の自分に対して、\nどちらに近いですか？',
    options: [
      '変わりたい・できるようになりたい',
      '今の自分を受け入れて、楽になりたい',
      'まだよく分からない',
    ],
    note: 'プログラムの内容の組み立て方が変わります。正解はありません',
  },
] as const;

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
    { title: '決められること・られないことを分ける', body: '自分で決められることと、状況しだいのことを分けて整理します。' },
    { title: '小さく試す準備をする', body: '不安が強すぎない場面を選び、できそうな一歩を一緒に決めます。' },
  ],
  '人に頼んだり、断ったりしないといけないとき': [
    { title: '頭の中の言葉を外に出す', body: '言えなかった場面で浮かんだ考えを、3つだけ書き出します。' },
    { title: '事実と思い込みを分ける', body: '「相手が実際に言ったこと」と「自分が想像したこと」を分けて整理します。' },
    { title: '小さく試す準備をする', body: '負担の少ない相手・場面を選び、できそうな一言を一緒に決めます。' },
  ],
  '大切な人との関係がギクシャクしたとき': [
    { title: '不安になった瞬間を書き出す', body: '「関係がまずいかも」と感じた瞬間の考えを、3つだけ書き出します。' },
    { title: '事実と想像を分ける', body: '「実際に起きたこと」と「頭の中で広がった想像」を分けて整理します。' },
    { title: '小さく試す準備をする', body: '不安が強すぎない相手を選び、できそうな小さな一歩を一緒に決めます。' },
  ],
};
const DEFAULT_DAY_PREVIEW = DAY_PREVIEWS['評価される・見られる場面（発表・提出・ミスなど）'];

// AI生成が失敗した場合でもフローを止めないフォールバック
const FALLBACK_ANALYSIS: VisionData = {
  fears: 'あなたの心の奥には、いくつかの「恐れ」が静かに働いているようです。',
  consequence: 'その結果、無意識のうちに自分を守るパターンが生まれ、**生きづらさ**につながっているのかもしれません。',
  dailyStruggles: [
    '本音を言えずに我慢してしまうことがある',
    '人の評価や反応が必要以上に気になる',
    '頑張っているのに満たされない感覚がある',
  ],
  outcomes: [],
};
const FALLBACK_OUTCOMES = [
  '完璧じゃなくても大丈夫、と思える瞬間が増える',
  '失敗を「学び」として捉え直せるようになる',
  '人に頼ることへの抵抗がやわらぐ',
  'より自然体でいられる時間が増える',
];

const BUILDING_STEPS = [
  'あなたの回答を読み込んでいます',
  '4つの恐れの傾向を分析しています',
  '3つの守り方のパターンを照合しています',
  'あなた特有の組み合わせを特定しています',
  '生きづらさの根を言葉にしています',
  '日常での表れ方を読み解いています',
  '30日後に期待できる変化を描いています',
  '結果をまとめています',
];

const FAQ_ITEMS = [
  { q: 'どれくらい時間がかかりますか？', a: '1日のミッションは5分ほどから始められます。余裕がある日は、AIとの振り返りを長めに行えます。' },
  { q: '毎日できないと意味がありませんか？', a: '毎日続けることを目指しますが、空いた日があっても大丈夫です。記録を見ながら、自分のペースで再開できます。' },
  { q: 'これは治療ですか？', a: '医療行為ではありません。CBTの考え方をベースにした、自己理解と行動のためのセルフケアツールです。効果を保証するものではありません。' },
  { q: '支払いは自動更新ですか？', a: '自動更新ではありません。一度のお支払いで、30日プログラムをご利用いただけます。' },
];

type StepId =
  | 'difficultScene'
  | 'distressLevel'
  | 'changeOrientation'
  | 'difficultDetail'
  | 'difficultFreeText'
  | 'analysis'
  | 'analysisResult'
  | 'whatIsService'
  | 'outcomes'
  | 'deliverables'
  | 'comparison'
  | 'pricing';

const STEP_ORDER: StepId[] = [
  'difficultScene',
  'distressLevel',
  'changeOrientation',
  'difficultDetail',
  'difficultFreeText',
  'analysis',
  'analysisResult',
  'whatIsService',
  'outcomes',
  'deliverables',
  'comparison',
  'pricing',
];
const TOTAL_STEPS = STEP_ORDER.length;

// ─── Helpers ───

function renderBold(text: string) {
  return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} style={{ fontWeight: 700, color: 'var(--ink)', boxShadow: 'inset 0 -0.5em 0 var(--tint-2)' }}>
        {part}
      </strong>
    ) : part
  );
}

function CTA({ onClick, label = '次へ', disabled = false }: { onClick: () => void; label?: string; disabled?: boolean }) {
  return (
    <button className="koko-cta" onClick={onClick} disabled={disabled}>{label}</button>
  );
}
function Eyebrow({ children }: { children: React.ReactNode }) { return <p className="koko-eyebrow">{children}</p>; }
function Hero({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'center' }) {
  return <h2 className="koko-hero" style={{ textAlign: align }}>{children}</h2>;
}
function Q({ children }: { children: React.ReactNode }) { return <h2 className="koko-q">{children}</h2>; }

// ─── Component ───

export default function StepFlow({ firstType, sessionId }: StepFlowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [onboarding, setOnboarding] = useState<Partial<Onboarding>>({});
  const [vision, setVision] = useState<VisionData | null>(null);
  const [visionSettled, setVisionSettled] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detailSelected, setDetailSelected] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [buildingStep, setBuildingStep] = useState(0);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const visionStartedRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const currentStep = STEP_ORDER[currentStepIndex];

  // Scroll to top on step change
  useEffect(() => { window.scrollTo(0, 0); }, [currentStepIndex]);

  // Analysis animation + vision生成（一度だけ起動・ステップ送りでキャンセルしない）
  useEffect(() => {
    if (currentStep !== 'analysis') return;

    fbqEvent('CompleteRegistration', { content_name: firstType.name });

    const finalOnboarding = {
      ...onboarding,
      difficultDetail: detailSelected.join('、'),
      difficultFreeText: freeText.trim(),
    };
    if (sessionId) {
      updateDiagnosticOnboarding(sessionId, finalOnboarding as Record<string, string>);
    }

    if (!visionStartedRef.current) {
      visionStartedRef.current = true;
      setVisionError(null);
      (async () => {
        let lastError = '原因不明（全リトライ失敗）';
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            const res = await fetch('/api/generate-vision', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, typeId: firstType.id }),
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data && data.fears) {
              if (mountedRef.current) { setVision(data as VisionData); setVisionError(null); }
              lastError = '';
              break;
            }
            lastError = `HTTP ${res.status}: ${data?.error ?? (data?.fears ? 'fearsはあるが不正な形' : 'レスポンスにfearsなし')}`;
          } catch (e) {
            lastError = `fetch失敗: ${e instanceof Error ? e.message : String(e)}`;
          }
          await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
        }
        if (mountedRef.current && lastError) {
          console.error('[generate-vision] 生成失敗:', lastError);
          setVisionError(lastError);
        }
        if (mountedRef.current) setVisionSettled(true);
      })();
    }

    let step = 0;
    setBuildingStep(0);
    const interval = setInterval(() => {
      step = Math.min(step + 1, BUILDING_STEPS.length - 1);
      setBuildingStep(step);
    }, 1100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // vision生成が確定したら結果画面へ進む（再shimmerを避ける）
  useEffect(() => {
    if (currentStep !== 'analysis' || !visionSettled) return;
    const t = setTimeout(() => setCurrentStepIndex(prev => prev + 1), 600);
    return () => clearTimeout(t);
  }, [currentStep, visionSettled]);

  // サービス説明フェーズ到達でペイウォール計測
  useEffect(() => {
    if (currentStep === 'whatIsService') {
      fbqPaywallReached();
      fbqEvent('ViewContent', { content_name: 'service_explanation' });
    }
  }, [currentStep]);

  function goNext() {
    if (currentStepIndex < STEP_ORDER.length - 1) setCurrentStepIndex(prev => prev + 1);
  }
  function goBack() {
    if (currentStepIndex > 0) setCurrentStepIndex(prev => prev - 1);
  }
  function handleOnboardingAnswer(key: string, value: string) {
    setOnboarding(prev => ({ ...prev, [key]: value }));
    goNext();
  }
  function toggleDetail(opt: string) {
    setDetailSelected(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);
  }

  async function handleCheckout() {
    fbqEvent('InitiateCheckout', { content_name: 'standard' });
    setIsLoading(true);
    try {
      const changeOrientation: ChangeOrientation = ORIENTATION_MAP[onboarding.changeOrientation ?? ''] ?? 'unknown';
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

  const progress = ((currentStepIndex + 1) / TOTAL_STEPS) * 100;
  const isAnalysis = currentStep === 'analysis';

  function renderStep(): React.ReactNode {
    switch (currentStep) {
      // ─── オンボ質問 ───
      case 'difficultScene':
      case 'distressLevel':
      case 'changeOrientation': {
        const q = ONBOARDING_QUESTIONS.find(oq => oq.key === currentStep)!;
        return (
          <div className="koko-col" style={{ gap: 34 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Q>{q.question}</Q>
              {'note' in q && q.note && <p className="koko-note">{q.note}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {q.options.map(opt => (
                <button key={opt} className="koko-choice" onClick={() => handleOnboardingAnswer(q.key, opt)}>
                  <span>{opt}</span><span className="ch">{Ico.go()}</span>
                </button>
              ))}
            </div>
          </div>
        );
      }

      case 'difficultDetail': {
        const details = SCENE_DETAILS[onboarding.difficultScene ?? ''] ?? SCENE_DETAILS['評価される・見られる場面（発表・提出・ミスなど）'];
        return (
          <div className="koko-col" style={{ gap: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Q>{'具体的に困っていることを\n教えてください'}</Q>
              <p className="koko-note">当てはまるものを選んでください（複数可）</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {details.map(opt => {
                const on = detailSelected.includes(opt);
                return (
                  <button key={opt} className={'koko-check' + (on ? ' on' : '')} onClick={() => toggleDetail(opt)}>
                    <span className="koko-box">{on && Ico.check()}</span><span>{opt}</span>
                  </button>
                );
              })}
            </div>
            <CTA onClick={() => { setOnboarding(prev => ({ ...prev, difficultDetail: detailSelected.join('、') })); goNext(); }} />
          </div>
        );
      }

      case 'difficultFreeText':
        return (
          <div className="koko-col" style={{ gap: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Q>{'他にもあれば、\n自由に書いてください'}</Q>
              <p className="koko-note">任意です。スキップもできます。</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea className="koko-textarea" rows={4} maxLength={500} value={freeText}
                onChange={e => setFreeText(e.target.value)}
                placeholder="例：会議で意見を求められると頭が真っ白になって、後から『なんで言えなかったんだ』と落ち込む…" />
              <p style={{ fontSize: 10, color: 'var(--ink-faint)', textAlign: 'right', margin: 0 }}>{freeText.length} / 500</p>
            </div>
            <CTA onClick={goNext} />
            <button className="koko-skip" onClick={goNext}>スキップして進む</button>
          </div>
        );

      case 'analysis':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, paddingTop: 20 }}>
            <div className="koko-ring" />
            <p style={{ fontFamily: 'var(--font-editorial)', fontSize: 17, fontWeight: 700, color: 'var(--accent-deep)', margin: 0, letterSpacing: '.02em' }}>あなたの回答を分析しています</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'center', minHeight: 200 }}>
              {BUILDING_STEPS.map((m, i) => (
                <p key={i} style={{
                  margin: 0, fontSize: i === buildingStep ? 14.5 : 13, transition: 'all .4s', fontWeight: i === buildingStep ? 700 : 400,
                  color: i < buildingStep ? 'var(--ink-faint)' : i === buildingStep ? 'var(--accent-deep)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                  {i < buildingStep && <span style={{ color: 'var(--accent)', display: 'inline-flex' }}>{Ico.check({ width: 12, height: 12 })}</span>}{m}
                </p>
              ))}
            </div>
          </div>
        );

      case 'analysisResult': {
        const d = vision ?? FALLBACK_ANALYSIS;
        return (
          <div className="koko-col" style={{ gap: 26 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="koko-illus koko-bloom" src={`/illustrations/${firstType.id}.png`} alt="" />
              <Eyebrow>Analysis</Eyebrow>
              <Hero align="center">分析が完了しました</Hero>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontSize: 14.5, lineHeight: 2, color: 'var(--ink-soft)' }}>
              <p style={{ margin: 0 }}>{renderBold(d.fears)}</p>
              <p style={{ margin: 0 }}>{renderBold(d.consequence)}</p>
              <ul className="koko-tintcard" style={{ listStyle: 'none', margin: 0, padding: 20, display: 'flex', flexDirection: 'column', gap: 13 }}>
                {d.dailyStruggles.map((s, i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', marginTop: 9, flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5, lineHeight: 1.7 }}>{s}</span>
                  </li>
                ))}
              </ul>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-mute)', lineHeight: 1.85 }}>こうした日常の悩みも、もしかしたらこの恐れが根っこにあるのかもしれません。</p>
            </div>
            <CTA onClick={goNext} />
          </div>
        );
      }

      case 'whatIsService':
        return (
          <div className="koko-col" style={{ gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <Eyebrow>About</Eyebrow>
              <Hero>{'ココリフトは、\nどんなサービス？'}</Hero>
            </div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.95, color: 'var(--ink-soft)' }}>
              ココリフトは、<strong style={{ fontWeight: 700, color: 'var(--ink)' }}>4つの恐れ × 3つの守り方</strong>からあなたの心の構造を読み解き、2つを毎日セットで届けます。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {[{ n: '1', icon: Ico.chat(), t: 'AIとの対話', b: 'その日の出来事から「気づき」を深める' },
                { n: '2', icon: Ico.bloom({ width: 20, height: 20 }), t: '毎日のミッション', b: '恐れに合わせた「実践」を積み重ねる' }].map((it, i) => (
                <div key={i} className="koko-card" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 17 }}>
                  <span className="koko-numchip">{it.n}</span>
                  <span style={{ color: 'var(--accent)', display: 'inline-flex', flexShrink: 0 }}>{it.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>{it.t}</p>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-mute)', lineHeight: 1.65 }}>{it.b}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 14, lineHeight: 1.95, color: 'var(--ink-soft)' }}>
              <hr className="koko-rule" />
              <p style={{ margin: 0 }}>一般的なカウンセリングや自己分析では、「自分のことがわかった」気がしても、日常に戻るとまた同じパターンを繰り返してしまいがちです。{renderBold('**気づきだけでは、行動は変わらない**')}から。</p>
              <p style={{ margin: 0 }}>ですがココリフトは、気づきと実践を{renderBold('**毎日セットで**')}積み重ねます。本当の変化は日々の小さな実践でしか起きない——だから、{renderBold('**変わるところまで毎日伴走する**')}サービスです。</p>
            </div>
            <CTA onClick={goNext} />
          </div>
        );

      case 'outcomes': {
        const outcomes = vision?.outcomes?.length ? vision.outcomes : FALLBACK_OUTCOMES;
        return (
          <div className="koko-col" style={{ gap: 26 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, alignItems: 'center' }}>
              <Eyebrow>Your 30 days</Eyebrow>
              <Hero align="center">{'30日後、あなたに\n訪れる変化'}</Hero>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {outcomes.map((t, i) => (
                <div key={i} className="koko-card" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '16px 17px' }}>
                  <span className="koko-checkchip">{Ico.check()}</span>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: 'var(--ink-soft)' }}>{t}</p>
                </div>
              ))}
            </div>
            <CTA onClick={goNext} />
          </div>
        );
      }

      case 'deliverables': {
        const days = DAY_PREVIEWS[onboarding.difficultScene ?? ''] ?? DEFAULT_DAY_PREVIEW;
        return (
          <div className="koko-col" style={{ gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <Eyebrow>First 3 days</Eyebrow>
              <Hero>{'最初の3日間は、\nこんな体験から'}</Hero>
            </div>
            <div className="koko-timeline">
              {days.map((d, i) => (
                <div key={i} className="koko-tl-row">
                  <span className="koko-daychip"><em>DAY</em>{i + 1}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 2 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.45 }}>{d.title}</p>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-mute)', lineHeight: 1.7 }}>{d.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, color: 'var(--ink-faint)' }}>
              <span style={{ height: 1, width: 26, background: 'var(--line)' }} />
              <span style={{ fontFamily: 'var(--font-editorial)', fontSize: 13, color: 'var(--ink-mute)', fontStyle: 'italic' }}>and</span>
              <span style={{ height: 1, width: 26, background: 'var(--line)' }} />
            </div>
            <div className="koko-card" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 17 }}>
              <span style={{ color: 'var(--accent)', display: 'inline-flex', flexShrink: 0 }}>{Ico.chat()}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>AIによる個別カウンセリング</p>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-mute)', lineHeight: 1.7 }}>24時間いつでも相談OK。やりとりは積み重なり、あなたを理解していきます。</p>
              </div>
            </div>
            <CTA onClick={goNext} />
          </div>
        );
      }

      case 'comparison': {
        const cols = ['生成AI', '対面\nカウンセリング', 'ココリフト'];
        const rows: { label: string; v: CompareMark[] }[] = [
          { label: '個別最適化', v: ['partial', 'full', 'full'] },
          { label: 'いつでも相談', v: ['full', 'none', 'full'] },
          { label: '認知＋行動の実践', v: ['none', 'partial', 'full'] },
          { label: '継続的な伴走', v: ['none', 'full', 'full'] },
        ];
        const priceRow = ['—', '高め', '手頃'];
        return (
          <div className="koko-col" style={{ gap: 26 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, alignItems: 'center' }}>
              <Eyebrow>Why kokolift</Eyebrow>
              <Hero align="center">{'ここにしかない、\n毎日の伴走'}</Hero>
            </div>
            <div className="koko-compare">
              <div className="koko-compare-head">
                <span />
                {cols.map((c, i) => <span key={i} className={'koko-compare-col' + (i === 2 ? ' koko-me' : '')} style={{ whiteSpace: 'pre-line' }}>{c}</span>)}
              </div>
              {rows.map((r, ri) => (
                <div key={ri} className="koko-compare-row">
                  <span className="koko-compare-label">{r.label}</span>
                  {r.v.map((mark, ci) => (
                    <span key={ci} className={'koko-compare-cell' + (ci === 2 ? ' koko-me' : '')} style={{ color: ci === 2 ? 'var(--accent-deep)' : 'var(--ink-faint)' }}>{Ico[mark]()}</span>
                  ))}
                </div>
              ))}
              <div className="koko-compare-row">
                <span className="koko-compare-label">費用のめやす</span>
                {priceRow.map((p, ci) => (
                  <span key={ci} className={'koko-compare-cell' + (ci === 2 ? ' koko-me' : '')} style={{ fontSize: 12.5, fontWeight: ci === 2 ? 700 : 500, color: ci === 2 ? 'var(--accent-deep)' : 'var(--ink-mute)' }}>{p}</span>
                ))}
              </div>
            </div>
            <CTA onClick={goNext} />
          </div>
        );
      }

      case 'pricing':
        return (
          <div className="koko-col" style={{ gap: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, alignItems: 'center' }}>
              <Eyebrow>Plan</Eyebrow>
              <Hero align="center">{'まずは30日、\n試してみませんか'}</Hero>
            </div>
            <div className="koko-price">
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-mute)', letterSpacing: '.04em' }}>一般のカウンセリング</p>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-faint)', textDecoration: 'line-through' }}>¥10,000〜¥20,000 / 月</p>
                <span style={{ color: 'var(--accent-soft)', display: 'inline-flex', justifyContent: 'center', margin: '3px 0' }}>{Ico.arrow()}</span>
              </div>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-editorial)', fontSize: 14, fontWeight: 700, color: 'var(--accent-deep)', letterSpacing: '.03em' }}>ココリフト</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
                  <span className="koko-bignum">¥3,980</span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-mute)', marginBottom: 5 }}>（税込）</span>
                </div>
                <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-mute)' }}>買い切りお試し・自動更新なし</p>
              </div>
              <hr className="koko-rule" />
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 13 }}>
                {['常時相談できるAIカウンセリング', 'あなた専用に最適化された30日ミッション', '認知＆行動の両面からのアプローチ', '記録・連続日数・変化フィードバック'].map((t, i) => (
                  <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13.5, fontWeight: 500, color: 'var(--ink-soft)' }}>
                    <span className="koko-checkchip sm">{Ico.check({ width: 11, height: 11 })}</span>{t}
                  </li>
                ))}
              </ul>
              <CTA onClick={handleCheckout} disabled={isLoading} label={isLoading ? '処理中...' : 'まずはお得に体験'} />
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-mute)', textAlign: 'center', lineHeight: 1.7 }}>効果を実感できたら、来月以降も続けられます。</p>
            </div>

            <div>
              <p style={{ fontFamily: 'var(--font-editorial)', fontSize: 15, fontWeight: 700, color: 'var(--ink)', textAlign: 'center', margin: '0 0 6px' }}>よくある質問</p>
              {FAQ_ITEMS.map((f, i) => (
                <div key={i} style={{ borderTop: '1px solid var(--hairline)' }}>
                  <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '15px 2px', textAlign: 'left' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{f.q}</span>
                    <span style={{ color: 'var(--accent)', display: 'inline-flex', flexShrink: 0, transition: 'transform .25s', transform: faqOpen === i ? 'rotate(180deg)' : 'none' }}>{Ico.chevron()}</span>
                  </button>
                  {faqOpen === i && <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-mute)', lineHeight: 1.85, padding: '0 2px 15px' }}>{f.a}</p>}
                </div>
              ))}
            </div>

            <p style={{ margin: 0, fontSize: 10.5, color: 'var(--ink-faint)', textAlign: 'center', lineHeight: 1.85 }}>
              ※本プログラムは医療行為ではありません。CBT（認知行動療法）の考え方をベースにしたセルフケアツールです。効果を保証するものではありません。
            </p>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="koko-stage">
      {!isAnalysis && (
        <div className="koko-progress"><div className="koko-progress-fill" style={{ width: `${progress}%` }} /></div>
      )}
      <div className="koko-inner">
        <div key={currentStepIndex} className="koko-fade">{renderStep()}</div>
        {!isAnalysis && currentStepIndex > 0 && (
          <button className="koko-back" onClick={goBack}>← 戻る</button>
        )}
      </div>

      {/* 開発時のみ：vision生成エラーを可視化 */}
      {process.env.NODE_ENV !== 'production' && visionError && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#d4615a', color: '#fff', fontSize: 12, padding: '8px 16px', textAlign: 'center' }}>
          ⚠️ vision生成失敗: {visionError}（フォールバック表示中）
        </div>
      )}
    </div>
  );
}
