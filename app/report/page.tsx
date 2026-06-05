'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { FearAxis, DefenseAxis } from '@/data/questions';
import { REPORT_CONTENT, TYPE_ID_MAP } from '@/data/report';

const RadarChartComponent = dynamic(() => import('@/components/RadarChartComponent'), { ssr: false });
const DefenseBarChart = dynamic(() => import('@/components/DefenseBarChart'), { ssr: false });

type ReportData = {
  first_type_name: string;
  second_type_name: string;
  fear_scores: Record<FearAxis, number>;
  defense_scores: Record<DefenseAxis, number>;
  distress_total: number;
  reaction_fit: string | null;
  reaction_want: string | null;
};

function AxisExplainer({ title, items }: { title: string; items: { label: string; desc: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(v => !v)} className="text-xs text-stone-400 underline underline-offset-2">
        {open ? '閉じる' : title}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {items.map(item => (
            <div key={item.label} className="flex gap-2 text-xs">
              <span className="text-stone-500 font-medium min-w-fit">{item.label}</span>
              <span className="text-stone-400">— {item.desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReactionButtons({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-stone-600">{label}</p>
      <div className="flex gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors border ${
              value === opt.value
                ? 'bg-purple-500 text-white border-purple-500'
                : 'bg-white text-stone-600 border-stone-200 hover:border-purple-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReportPageInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [data, setData] = useState<ReportData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reactionFit, setReactionFit] = useState<string | null>(null);
  const [reactionWant, setReactionWant] = useState<string | null>(null);
  const [reactionSaved, setReactionSaved] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); return; }
    fetch(`/api/report?token=${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: ReportData) => {
        setData(d);
        setReactionFit(d.reaction_fit);
        setReactionWant(d.reaction_want);
      })
      .catch(() => setNotFound(true));
  }, [token]);

  async function saveReaction(fit: string | null, want: string | null) {
    await fetch(`/api/report?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction_fit: fit, reaction_want: want }),
    });
    setReactionSaved(true);
  }

  function handleFitChange(v: string) {
    setReactionFit(v);
    saveReaction(v, reactionWant);
  }

  function handleWantChange(v: string) {
    setReactionWant(v);
    saveReaction(reactionFit, v);
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="text-center space-y-3">
          <p className="text-2xl">🔗</p>
          <p className="font-bold text-stone-800">リンクが無効です</p>
          <p className="text-sm text-stone-500">URLをご確認ください。</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  const typeId = TYPE_ID_MAP[data.first_type_name] || '';
  const content = REPORT_CONTENT[typeId];

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {/* ヘッダー */}
      <div className="px-5 pt-10 pb-6" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #fafafa 100%)' }}>
        <div className="max-w-sm mx-auto text-center space-y-2">
          <p className="text-xs text-purple-400 font-medium">あなたの診断レポート</p>
          <h1 className="text-2xl font-bold text-stone-900">
            あなたは<br />
            <span className="text-purple-600">「{data.first_type_name}」</span><br />
            です
          </h1>
          {data.second_type_name && (
            <p className="text-sm text-stone-400">次いで「{data.second_type_name}」の傾向も</p>
          )}
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 space-y-5">

        {/* 恐れの4軸レーダー */}
        <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-3">
          <p className="text-xs text-stone-400 font-medium">恐れの4軸</p>
          <RadarChartComponent fearScores={data.fear_scores} />
          <AxisExplainer title="軸の説明を見る" items={[
            { label: '関係喪失', desc: '大切な人が離れていく怖さ' },
            { label: '評価失墜', desc: '能力を低く見られる怖さ' },
            { label: '不完全性', desc: 'ちゃんとできない自分への怖さ' },
            { label: '制御不能', desc: '先が読めない・思い通りにならない怖さ' },
          ]} />
        </div>

        {/* 防衛スタイル */}
        <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-4">
          <p className="text-xs text-stone-400 font-medium">防衛スタイル</p>
          <DefenseBarChart defenseScores={data.defense_scores} />
          <AxisExplainer title="軸の説明を見る" items={[
            { label: '接近↔回避', desc: '人に近づくか、距離を取るか' },
            { label: '能動↔受動', desc: '自分から動くか、動かず待つか' },
            { label: '抑制↔表出', desc: '感情を抑えるか、出すか' },
          ]} />
        </div>

        {content ? (<>
          {/* 消耗しやすい場面 */}
          <div className="bg-white rounded-3xl p-5 border border-purple-100 space-y-3">
            <p className="text-xs text-purple-400 font-medium">あなたが消耗しやすい場面</p>
            <p className="text-sm text-stone-700 leading-relaxed">{content.drainScene}</p>
          </div>

          {/* 強みリフレーム */}
          <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-3">
            <p className="text-xs text-stone-400 font-medium">その力は、本来こういうもの</p>
            <p className="text-sm text-stone-700 leading-relaxed">{content.strengthReframe}</p>
          </div>

          {/* 30日プログラム */}
          <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-stone-400 font-medium">あなたの30日プログラム</p>
              <p className="text-xs text-stone-400">まずは「気づく」ことが目標です</p>
            </div>
            <div className="space-y-4">
              {content.program.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-16 text-center">
                    <span className="text-xs font-bold text-purple-400">{step.step}</span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-stone-800">{step.title}</p>
                    <p className="text-xs text-stone-500 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 30日後には */}
          <div className="bg-purple-50 rounded-3xl p-5 border border-purple-100 space-y-2">
            <p className="text-xs text-purple-400 font-medium">30日後には…</p>
            <p className="text-sm text-stone-700 leading-relaxed">{content.after}</p>
          </div>
        </>) : (
          <div className="bg-white rounded-3xl p-5 border border-stone-100">
            <p className="text-xs text-stone-400">このタイプの詳細分析は準備中です。</p>
          </div>
        )}

        {/* しんどい時は */}
        <div className="bg-stone-100 rounded-3xl p-5 space-y-2">
          <p className="text-xs text-stone-500 font-medium">🌿 しんどい時は</p>
          <p className="text-xs text-stone-500 leading-relaxed">
            このプログラムは、日常の小さな変化を支援するものです。
            しんどさが強いときは、無理せず専門の相談窓口や医療機関へ。
            あなたの力だけで抱え込まなくていいです。
          </p>
        </div>

        {/* ワンタップ反応 */}
        <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-5">
          <p className="text-xs text-stone-400 font-medium">一言聞かせてください</p>
          <ReactionButtons
            label="この結果、当てはまりましたか？"
            options={[
              { value: 'yes', label: 'すごく' },
              { value: 'maybe', label: 'まあまあ' },
              { value: 'no', label: 'うーん' },
            ]}
            value={reactionFit}
            onChange={handleFitChange}
          />
          <ReactionButtons
            label="このプログラム、やってみたいと思いましたか？"
            options={[
              { value: 'yes', label: '思った' },
              { value: 'maybe', label: 'どちらでも' },
              { value: 'no', label: '思わない' },
            ]}
            value={reactionWant}
            onChange={handleWantChange}
          />
          {reactionSaved && (
            <p className="text-xs text-stone-400 text-center">ありがとうございます ✓</p>
          )}
        </div>

        {/* 有料版の布石 */}
        <div className="bg-white rounded-3xl p-5 border border-purple-100 space-y-2">
          <p className="text-xs text-purple-400 font-medium">ココリフトより</p>
          <p className="text-sm text-stone-600 leading-relaxed">
            この30日プログラムを、毎日そっとガイドして変化を記録できる仕組みを準備しています。
            できあがったら、いちばんにお知らせします。
          </p>
        </div>

        <p className="text-xs text-stone-400 text-center leading-relaxed pb-4">
          ※ ビッグファイブ／CBTの考え方をベースにした自己改善ツールです。医療診断ではありません。効果を保証するものではありません。
        </p>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense>
      <ReportPageInner />
    </Suspense>
  );
}
