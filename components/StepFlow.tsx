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

// 画面1のフォールバック（AI生成が失敗した場合でもフローを止めない）
const FALLBACK_ANALYSIS = {
  fears: 'あなたの心の奥には、いくつかの「恐れ」が静かに働いているようです。',
  consequence: 'その結果、無意識のうちに自分を守るパターンが生まれ、生きづらさにつながっているのかもしれません。',
  dailyStruggles: [
    '本音を言えずに我慢してしまうことがある',
    '人の評価や反応が必要以上に気になる',
    '頑張っているのに満たされない感覚がある',
  ],
  outcomes: [] as string[],
};

// 30日後の効果のフォールバック（AI生成が間に合わなかった場合）
const FALLBACK_OUTCOMES = [
  '完璧じゃなくても大丈夫、と思える瞬間が増える',
  '失敗を「学び」として捉え直せるようになる',
  '人に頼ることへの抵抗がやわらぐ',
  'より自然体でいられる時間が増える',
];

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
  'あなたの回答を読み込んでいます',
  '4つの恐れの傾向を分析しています',
  '3つの守り方のパターンを照合しています',
  'あなた特有の組み合わせを特定しています',
  '生きづらさの根を言葉にしています',
  '日常での表れ方を読み解いています',
  '30日後に期待できる変化を描いています',
  '結果をまとめています',
];

const TOTAL_STEPS = 12;

// ─── Step enum ───

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
  sessionId,
}: StepFlowProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [onboarding, setOnboarding] = useState<Partial<Onboarding>>({});
  const [vision, setVision] = useState<VisionData | null>(null);
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionSettled, setVisionSettled] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
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

  const currentStep = STEP_ORDER[currentStepIndex];

  // vision生成は一度だけ起動。ステップ送りのcleanupでキャンセルされないよう、effectから独立させる。
  const visionStartedRef = useRef(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

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

    // Start vision generation in background.
    // 診断行の保存(saveDiagnostic/updateDiagnosticOnboarding)がfire-and-forgetなので、
    // 行が書かれる前に呼ぶと404になりうる。数回リトライして取り切る。
    // ※ このfetchはステップ送りのcleanupでキャンセルしない（生成はアニメより長くかかるため）。
    //    一度だけ起動し、結果はアンマウント時以外は必ず反映する。
    if (!visionStartedRef.current) {
      visionStartedRef.current = true;
      setVisionLoading(true);
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
              if (mountedRef.current) {
                setVision(data as VisionData);
                setVisionError(null);
              }
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
        if (mountedRef.current) {
          setVisionLoading(false);
          setVisionSettled(true);
        }
      })();
    }

    // Building animation（生成完了まで進行を続け、最後のステップで待機）
    let step = 0;
    setBuildingStep(0);
    const interval = setInterval(() => {
      step = Math.min(step + 1, BUILDING_STEPS.length - 1);
      setBuildingStep(step);
    }, 1100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // vision生成が確定したら結果画面へ進む（再shimmerを避け、完成した状態で見せる）
  useEffect(() => {
    if (currentStep !== 'analysis' || !visionSettled) return;
    const t = setTimeout(() => setCurrentStepIndex(prev => prev + 1), 600);
    return () => clearTimeout(t);
  }, [currentStep, visionSettled]);

  // Fire ViewContent when entering service explanation phase
  useEffect(() => {
    if (currentStep === 'whatIsService') {
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

      // ─── 画面1：分析完了・恐れの提示（AI生成） ───
      case 'analysisResult': {
        // 生成中のみshimmer。生成が終わったら、失敗していてもフォールバックで必ず進めるようにする。
        const data = vision ?? FALLBACK_ANALYSIS;
        return (
          <div className="w-full max-w-sm mx-auto space-y-6">
            <div className="text-center space-y-1">
              <div className="text-3xl">✨</div>
              <h2 className="text-xl font-bold text-stone-900">分析が完了しました</h2>
            </div>
            {visionLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-stone-100 rounded-full animate-pulse" style={{ width: `${88 - i * 6}%` }} />
                    <div className="h-4 bg-stone-100 rounded-full animate-pulse" style={{ width: `${72 + i * 4}%` }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5 text-sm text-stone-700 leading-relaxed">
                <p>{renderBold(data.fears)}</p>
                <p>{renderBold(data.consequence)}</p>
                <ul className="space-y-2.5 bg-white/70 rounded-2xl border border-stone-100 p-4">
                  {data.dailyStruggles.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-stone-500">こうした日常の悩みも、もしかしたらこの恐れが根っこにあるのかもしれません。</p>
              </div>
            )}
            {!visionLoading && <NextButton onClick={goNext} />}
          </div>
        );
      }

      // ─── 画面2：ココリフトは、どんなサービス？ ───
      case 'whatIsService': {
        return (
          <div className="w-full max-w-sm mx-auto space-y-6">
            <h2 className="text-xl font-bold text-stone-900 leading-snug">ココリフトは、どんなサービス？</h2>
            <p className="text-sm text-stone-700 leading-relaxed">
              ココリフトは、<strong className="font-bold text-stone-900">4つの恐れ × 3つの守り方</strong>からあなたの心の構造を読み解き、2つを毎日セットで届けます。
            </p>
            <div className="space-y-3">
              {[
                { num: '①', title: 'AIとの対話', body: 'その日の出来事から「気づき」を深める' },
                { num: '②', title: '毎日のミッション', body: '恐れに合わせた「実践」を積み重ねる' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-stone-100 flex items-start gap-3">
                  <span className="text-purple-500 font-bold text-lg leading-none mt-0.5">{item.num}</span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-stone-800">{item.title}</p>
                    <p className="text-xs text-stone-500 leading-relaxed">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-stone-200 pt-5 space-y-4 text-sm text-stone-700 leading-relaxed">
              <p>
                一般的なカウンセリングや自己分析では、「自分のことがわかった」気がしても、日常に戻るとまた同じパターンを繰り返してしまいがちです。{renderBold('**気づきだけでは、行動は変わらない**')}から。
              </p>
              <p>
                ですがココリフトは、気づきと実践を{renderBold('**毎日セットで**')}積み重ねます。本当の変化は、日々の小さな実践でしか起きない——だから、{renderBold('**変わるところまで毎日伴走する**')}サービスです。
              </p>
            </div>
            <NextButton onClick={goNext} />
          </div>
        );
      }

      // ─── 画面3：30日後の変化（AI生成） ───
      case 'outcomes': {
        const outcomes = vision?.outcomes?.length ? vision.outcomes : FALLBACK_OUTCOMES;
        return (
          <div className="w-full max-w-sm mx-auto space-y-6">
            <h2 className="text-xl font-bold text-stone-900 leading-snug text-center">
              30日後、あなたにはこんな<span className="text-purple-600">変化</span>が期待できます
            </h2>
            <ul className="space-y-3">
              {outcomes.map((text, i) => (
                <li key={i} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-stone-100">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-sm flex items-center justify-center flex-shrink-0">○</span>
                  <p className="text-sm text-stone-700 leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
            <NextButton onClick={goNext} />
          </div>
        );
      }

      // ─── 画面4：届く内容（最初の3日間プレビュー） ───
      case 'deliverables': {
        const dayPreviews = DAY_PREVIEWS[onboarding.difficultScene ?? ''] ?? DEFAULT_DAY_PREVIEW;
        return (
          <div className="w-full max-w-sm mx-auto space-y-6">
            <h2 className="text-xl font-bold text-stone-900 leading-snug">最初の3日間で、こんな体験が始まります</h2>

            <div className="space-y-3">
              {dayPreviews.map((d, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-stone-100 flex items-start gap-3">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-500 text-white text-xs font-bold flex-shrink-0">Day {i + 1}</span>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-stone-800 leading-snug">{d.title}</p>
                    <p className="text-xs text-stone-500 leading-relaxed">{d.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center text-purple-400 font-bold text-lg">＆</div>

            <div className="bg-white rounded-2xl p-4 border border-stone-100 space-y-1">
              <p className="text-sm font-bold text-stone-800">🤖 AIによる個別カウンセリング</p>
              <p className="text-xs text-stone-500 leading-relaxed">24時間いつでも相談OK。やりとりは積み重なり、あなたを理解していきます。</p>
            </div>
            <NextButton onClick={goNext} />
          </div>
        );
      }

      // ─── 画面5：比較表 ───
      case 'comparison': {
        const rows = [
          { label: '個別最適化', ai: '△', counsel: '○', koko: '○' },
          { label: 'いつでも相談', ai: '○', counsel: '✕', koko: '○' },
          { label: '認知＋行動の実践', ai: '✕', counsel: '△', koko: '○' },
          { label: '継続的な伴走', ai: '✕', counsel: '○', koko: '○' },
          { label: '費用', ai: '—', counsel: '高い', koko: '手頃' },
        ];
        return (
          <div className="w-full max-w-sm mx-auto space-y-6">
            <h2 className="text-xl font-bold text-stone-900 leading-snug text-center">ここにしかない体験です</h2>
            <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] text-center text-[11px] font-bold bg-stone-50 border-b border-stone-100">
                <div className="px-2 py-2.5 text-left text-stone-400"></div>
                <div className="px-1 py-2.5 text-stone-500">生成AI</div>
                <div className="px-1 py-2.5 text-stone-500">対面<br />カウンセリング</div>
                <div className="px-1 py-2.5 text-purple-600">ココリフト</div>
              </div>
              {rows.map((row, i) => (
                <div key={i} className={`grid grid-cols-[1.4fr_1fr_1fr_1fr] text-center text-xs items-center ${i > 0 ? 'border-t border-stone-100' : ''}`}>
                  <div className="px-2 py-3 text-left text-stone-600 font-medium">{row.label}</div>
                  <div className="px-1 py-3 text-stone-400">{row.ai}</div>
                  <div className="px-1 py-3 text-stone-400">{row.counsel}</div>
                  <div className="px-1 py-3 font-bold text-purple-600 bg-purple-50/50">{row.koko}</div>
                </div>
              ))}
            </div>
            <NextButton onClick={goNext} />
          </div>
        );
      }

      // ─── 画面6：価格・オファー ───
      case 'pricing': {
        return (
          <div className="w-full max-w-sm mx-auto space-y-8">
            <h2 className="text-xl font-bold text-stone-900 leading-snug text-center">まずは30日、試してみませんか</h2>

            {/* Price card */}
            <div className="bg-white rounded-3xl p-6 border-2 border-purple-400 shadow-lg shadow-purple-100 space-y-4 text-center">
              <div className="space-y-0.5">
                <p className="text-xs text-stone-400">一般のカウンセリング</p>
                <p className="text-base text-stone-400 line-through">¥10,000〜¥20,000 / 月</p>
                <p className="text-purple-400 text-xl">↓</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-purple-600">ココリフト</p>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-4xl font-bold text-purple-600">¥3,980</span>
                  <span className="text-sm text-stone-400 self-end mb-1">（税込）</span>
                </div>
                <p className="text-xs text-stone-400">買い切りお試し・自動更新なし</p>
              </div>
              <ul className="space-y-2.5 text-left">
                {[
                  '常時相談できるAIカウンセリング',
                  'あなた専用に最適化された30日ミッション',
                  '認知＆行動の両面からのアプローチ',
                  '記録・連続日数・変化フィードバック',
                ].map((t, i) => (
                  <li key={i} className="flex gap-2.5 items-start text-sm font-medium text-stone-700 border-b border-dashed border-stone-100 pb-2.5 last:border-0 last:pb-0">
                    <span className="w-5 h-5 rounded-full bg-purple-400 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full py-4 rounded-full font-bold text-white text-base transition-all active:scale-[0.98] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)' }}
              >
                {isLoading ? '処理中...' : 'まずはお得に体験'}
              </button>
              <p className="text-xs text-stone-500 leading-relaxed pt-1">効果を実感できたら、来月以降も続けられます。</p>
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

      {/* 開発時のみ：vision生成エラーを可視化 */}
      {process.env.NODE_ENV !== 'production' && visionError && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-red-600 text-white text-xs px-4 py-2 text-center">
          ⚠️ vision生成失敗: {visionError}（フォールバック表示中）
        </div>
      )}
    </div>
  );
}
