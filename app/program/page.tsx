'use client';

import { useState, useEffect } from 'react';
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

const BUILDING_STEPS = [
  '診断結果を読み込んでいます',
  'あなたの回答を反映しています',
  'プランの構成を決めています',
];

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
            <div className="flex gap-1 mb-6">
              {ONBOARDING_QUESTIONS.map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= questionIndex ? 'bg-purple-500' : 'bg-stone-200'}`} />
              ))}
            </div>
            {questionIndex === 0 && (
              <p className="text-xs text-purple-500 font-medium leading-relaxed">
                {typeName}のあなた専用の30日プランを作るために、少しだけ教えてください（約1分）
              </p>
            )}
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
    const orientation = ORIENTATION_MAP[onboarding.changeOrientation ?? ''] ?? 'unknown';
    const orientationLine =
      orientation === 'change'
        ? '「変わりたい」というあなたの気持ちに合わせて、少しずつ行動の幅を広げていく構成にしました。'
        : orientation === 'accept'
          ? '「今の自分を受け入れて楽になりたい」というあなたの気持ちに合わせて、自分を追い込まずに楽になっていく構成にしました。'
          : 'まずは頭の中を整理することから始めて、無理なく進められる構成にしました。';

    const screenshots = [
      { src: '/paywall-shot-1.png', caption: '毎日ひとつ届く、あなた専用のミッション' },
      { src: '/paywall-shot-2.png', caption: 'AIとの対話で、考え方のクセを一緒にほぐす' },
      { src: '/paywall-shot-3.png', caption: '小さな変化が、足あととして積み上がっていく' },
    ];

    return (
      <div className="min-h-screen px-5 py-12" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm mx-auto space-y-8">

          {/* 個別化ヘッダー */}
          <div className="text-center space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-purple-100 text-purple-600 text-xs font-medium">
              あなた専用のプランができました
            </span>
            <h1 className="text-2xl font-bold text-stone-900 leading-snug">
              <span className="text-purple-600">{typeName}</span>のあなたのための<br />30日プログラム
            </h1>
            <p className="text-sm text-stone-500 leading-relaxed">
              {sceneShort
                ? <>{sceneShort}でしんどくなりやすいあなたに合わせています。<br /></>
                : null}
              {orientationLine}
            </p>
          </div>

          {/* プランの中身（30日で何が起きるか） */}
          <div className="bg-white rounded-3xl p-5 border border-purple-100 space-y-4">
            <p className="text-xs text-purple-400 font-medium">30日間の流れ</p>
            <div className="space-y-3">
              {[
                { icon: '/images/icon-write.png', title: 'まず、頭の中を整理する', body: 'しんどさの正体（事実と思い込みのズレ）に、書き出しながら気づいていきます' },
                { icon: '/images/icon-sprout.png', title: '小さく、試してみる', body: '不安な場面を小さく再現して「思ってたより大丈夫だった」を少しずつ集めます' },
                { icon: '/images/icon-path.png', title: '変化が、目に見えて残る', body: '毎日の記録が積み上がり、自分の変化がグラフと言葉で見えるようになります' },
              ].map((s, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <img src={s.icon} alt="" className="w-8 h-8 object-contain flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-stone-800">{s.title}</p>
                    <p className="text-xs text-stone-500 leading-relaxed mt-0.5">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* アプリ実画面（画像が置かれたら表示される） */}
          <div className="space-y-4">
            {screenshots.map((s, i) => (
              <div key={i} className="space-y-1.5">
                <img
                  src={s.src}
                  alt=""
                  className="w-full rounded-2xl border border-stone-100 shadow-sm"
                  onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }}
                />
                <p className="text-xs text-stone-500 text-center">{s.caption}</p>
              </div>
            ))}
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-stone-900">一人でやるのは、難しい。<br />だから、毎日となりにいます。</h2>
            <p className="text-xs text-stone-500">登録すると、すぐにプログラムが始まります。</p>
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
                  <p className="text-xs text-stone-500 mt-1">AIと一緒に進める</p>
                </div>
                <ul className="space-y-2.5 text-sm font-bold text-stone-700">
                  <li className="flex gap-2"><span className="text-purple-400 mt-0.5">✓</span>あなた専用の個別プラン（診断結果から生成）</li>
                  <li className="flex gap-2"><span className="text-purple-400 mt-0.5">✓</span>毎日のミッション</li>
                  <li className="flex gap-2"><span className="text-purple-400 mt-0.5">✓</span>取り組みの記録（回数・連続日数）</li>
                  <li className="flex flex-col gap-1">
                    <span className="flex gap-2"><span className="text-purple-400 mt-0.5">✓</span>AI対話セッション</span>
                    <span className="text-xs font-normal text-stone-500 pl-6 leading-relaxed">不安になった出来事をAIと対話。事実と思い込みのズレに気づき、考え方のクセを一緒にほぐす</span>
                  </li>
                  <li className="flex flex-col gap-1">
                    <span className="flex gap-2"><span className="text-purple-400 mt-0.5">✓</span>AIの変化フィードバック</span>
                    <span className="text-xs font-normal text-stone-500 pl-6 leading-relaxed">取り組み前後の不安の変化をAIが読み取り、あなたの進歩を言葉にして返す</span>
                  </li>
                  <li className="flex flex-col gap-1">
                    <span className="flex gap-2"><span className="text-purple-400 mt-0.5">✓</span>振り返り（詳細）</span>
                    <span className="text-xs font-normal text-stone-500 pl-6 leading-relaxed">恐れ軸別・認知/行動別の統計と気づきの蓄積。変化がグラフと言葉の両方で見える</span>
                  </li>
                  <li className="flex gap-2"><span className="text-purple-400 mt-0.5">✓</span>3ヶ月間ずっと使える</li>
                </ul>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-stone-900">¥3,980</span>
                  <span className="text-stone-400 text-sm mb-1">／ 3ヶ月</span>
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

            {/* プレミアム */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200">
              <div className="space-y-4">
                <div>
                  <p className="font-bold text-stone-900">プレミアムプラン</p>
                  <p className="text-xs text-stone-500 mt-1">とことん向き合う</p>
                </div>
                <ul className="space-y-2.5 text-sm font-bold text-stone-700">
                  <li className="flex gap-2"><span className="text-purple-400 mt-0.5">✓</span>スタンダードの機能すべて</li>
                  <li className="flex gap-2"><span className="text-purple-400 mt-0.5">✓</span>半年間ずっと使える</li>
                  <li className="flex flex-col gap-1">
                    <span className="flex gap-2"><span className="text-purple-400 mt-0.5">✓</span>いつでもAI相談（無制限）</span>
                    <span className="text-xs font-normal text-stone-500 pl-6 leading-relaxed">あなたの記録をふまえて、何でもいつでもAIに相談できる</span>
                  </li>
                  <li className="flex flex-col gap-1">
                    <span className="flex gap-2"><span className="text-purple-400 mt-0.5">✓</span>月次の総括フィードバック</span>
                    <span className="text-xs font-normal text-stone-500 pl-6 leading-relaxed">1ヶ月の歩みをAIが総括し、次の一歩を提案</span>
                  </li>
                </ul>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold text-stone-900">¥8,980</span>
                  <span className="text-stone-400 text-sm mb-1">／ 半年</span>
                </div>
                <button
                  onClick={() => handleSelectPlan('premium')}
                  disabled={isLoading}
                  className="w-full py-4 rounded-full font-bold text-stone-700 border-2 border-stone-300 hover:border-purple-300 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isLoading ? '処理中...' : 'プレミアムで始める'}
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
