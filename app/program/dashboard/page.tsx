'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { PROGRAM_CONTENT, TYPE_NAMES } from '@/data/program';
import { REPORT_CONTENT } from '@/data/report';
import { FearAxis, DefenseAxis } from '@/data/questions';
import dynamic from 'next/dynamic';

const RadarChartComponent = dynamic(() => import('@/components/RadarChartComponent'), { ssr: false });
const DefenseBarChart = dynamic(() => import('@/components/DefenseBarChart'), { ssr: false });

type Tab = 'home' | 'mission' | 'record' | 'review' | 'report';
type RecordStep = 'question' | 'detail' | 'done';

export default function DashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('home');
  const [userId, setUserId] = useState('');
  const [typeId, setTypeId] = useState('distancer');
  const [username, setUsername] = useState('');
  const [streak, setStreak] = useState(0);
  const [dayCount, setDayCount] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [todayLog, setTodayLog] = useState<{ done: boolean; count: number } | null>(null);
  const [recordStep, setRecordStep] = useState<RecordStep>('question');
  const [recordCount, setRecordCount] = useState(3);
  const [beforeScore, setBeforeScore] = useState(3);
  const [afterScore, setAfterScore] = useState(3);
  const [memo, setMemo] = useState('');
  const [fearScores, setFearScores] = useState<Record<FearAxis, number> | null>(null);
  const [defenseScores, setDefenseScores] = useState<Record<DefenseAxis, number> | null>(null);

  const content = PROGRAM_CONTENT[typeId];
  const typeName = TYPE_NAMES[typeId];
  const todayMissionIndex = (dayCount - 1) % (content?.missionPool.length || 1);
  const todayMission = content?.missionPool[todayMissionIndex];

  useEffect(() => {
    const uid = localStorage.getItem('kokolift_user_id');
    const tid = localStorage.getItem('kokolift_type_id');
    const uname = localStorage.getItem('kokolift_username') || 'あなた';
    if (!uid) { router.push('/program'); return; }
    setUserId(uid);
    if (tid) setTypeId(tid);
    setUsername(uname);
    loadStats(uid);
    loadScores(uid);
  }, []);

  async function loadScores(uid: string) {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.from('users').select('fear_scores, defense_scores').eq('id', uid).single();
    if (data?.fear_scores) setFearScores(data.fear_scores);
    if (data?.defense_scores) setDefenseScores(data.defense_scores);
  }

  async function loadStats(uid: string) {
    const sb = getSupabase();
    if (!sb) return;
    const today = new Date().toISOString().split('T')[0];
    const { data: logs } = await sb.from('daily_logs').select('*').eq('user_id', uid).order('date', { ascending: false });
    if (!logs) return;

    // 今日のログ
    const todayLogData = logs.find(l => l.date === today);
    if (todayLogData) setTodayLog({ done: todayLogData.done, count: todayLogData.count });

    // 累計
    const total = logs.filter(l => l.done).reduce((sum, l) => sum + (l.count || 0), 0);
    setTotalCount(total);

    // 日数
    setDayCount(logs.length + 1);

    // 連続記録
    let s = 0;
    const sortedDates = logs.map(l => l.date).sort().reverse();
    for (let i = 0; i < sortedDates.length; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i - 1);
      if (sortedDates[i] === d.toISOString().split('T')[0]) s++;
      else break;
    }
    setStreak(s);
  }

  async function handleRecord(done: boolean) {
    if (!done) {
      await saveLog(false, 0, 0, 0, '');
      setTodayLog({ done: false, count: 0 });
      setRecordStep('done');
      return;
    }
    setRecordStep('detail');
  }

  async function handleDetailRecord() {
    await saveLog(true, recordCount, beforeScore, afterScore, memo);
    setTodayLog({ done: true, count: recordCount });
    setTotalCount(prev => prev + recordCount);
    setRecordStep('done');
  }

  async function saveLog(done: boolean, count: number, before: number, after: number, m: string) {
    const sb = getSupabase();
    if (!sb || !userId || !todayMission) return;
    const today = new Date().toISOString().split('T')[0];
    await sb.from('daily_logs').upsert({
      user_id: userId,
      date: today,
      mission_id: todayMissionIndex,
      done,
      count,
      before_score: before,
      after_score: after,
      memo: m,
    }, { onConflict: 'user_id,date' });
  }

  const progress = Math.min(dayCount / 30, 1);

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* ヘッダー */}
      <div className="px-5 pt-8 pb-4" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #fafafa 100%)' }}>
        <div className="max-w-sm mx-auto flex justify-between items-center">
          <div>
            <p className="text-xs text-stone-400">おかえりなさい</p>
            <p className="font-bold text-stone-800">{username}さん</p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 bg-orange-50 px-3 py-1.5 rounded-full">
              <span>🔥</span>
              <span className="text-sm font-bold text-orange-500">{streak}日連続</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-sm mx-auto px-5 space-y-5">
        {tab === 'home' && (
          <>
            {/* 今日のミッション */}
            <div className="bg-white rounded-3xl p-5 border border-purple-100 space-y-3">
              <p className="text-xs text-purple-400 font-medium">今日のミッション</p>
              <p className="text-sm font-bold text-stone-800 leading-relaxed">{todayMission?.text}</p>
              {todayLog ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <span>✓</span><span>{todayLog.done ? `完了 (${todayLog.count}回)` : '今日はパス'}</span>
                </div>
              ) : (
                <button
                  onClick={() => setTab('mission')}
                  className="w-full py-3 rounded-full text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
                >
                  今日のミッションを見る
                </button>
              )}
            </div>

            {/* 30日進捗 */}
            <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-3">
              <p className="text-xs text-stone-400 font-medium">30日プログラム</p>
              <div className="w-full bg-stone-100 rounded-full h-2">
                <div className="bg-purple-400 h-2 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="text-sm text-stone-600">{dayCount - 1} / 30日</p>
            </div>

            {/* 可視化 */}
            <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-2">
              <p className="text-xs text-stone-400 font-medium">今週のあなた</p>
              <p className="text-sm text-stone-600">{content?.visualizationLabel}</p>
              <p className="text-2xl font-bold text-purple-500">{totalCount}<span className="text-sm text-stone-400 font-normal ml-1">回</span></p>
              <p className="text-xs text-stone-400">{content?.accumulator}：累計 {totalCount}回</p>
            </div>
          </>
        )}

        {tab === 'mission' && todayMission && (
          <div className="space-y-5 pt-2">
            <h2 className="text-lg font-bold text-stone-900">今日のミッション</h2>
            <div className="bg-white rounded-3xl p-5 border border-purple-100 space-y-4">
              <p className="text-base font-bold text-stone-800 leading-relaxed">「{todayMission.text}」</p>
              <div className="border-t border-stone-100 pt-4">
                <p className="text-xs text-stone-400 mb-2">なぜこれ？</p>
                <p className="text-sm text-stone-600 leading-relaxed">{todayMission.why}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setTab('record'); setRecordStep('question'); }} className="flex-1 py-4 rounded-full font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}>
                やってみる
              </button>
              <button onClick={() => handleRecord(false)} className="flex-1 py-4 rounded-full font-bold text-stone-500 border-2 border-stone-200 text-sm">
                今日はパス
              </button>
            </div>
          </div>
        )}

        {tab === 'record' && (
          <div className="space-y-5 pt-2">
            <h2 className="text-lg font-bold text-stone-900">記録する</h2>
            {recordStep === 'question' && (
              <div className="space-y-4">
                <p className="text-sm text-stone-600">今日はできましたか？</p>
                <div className="flex gap-3">
                  <button onClick={() => handleRecord(true)} className="flex-1 py-4 rounded-full font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}>
                    できた
                  </button>
                  <button onClick={() => handleRecord(false)} className="flex-1 py-4 rounded-full font-bold text-stone-500 border-2 border-stone-200 text-sm">
                    機会がなかった
                  </button>
                </div>
              </div>
            )}
            {recordStep === 'detail' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm text-stone-600">何回できましたか？</p>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setRecordCount(Math.max(1, recordCount - 1))} className="w-10 h-10 rounded-full bg-stone-100 text-xl font-bold">−</button>
                    <span className="text-2xl font-bold text-stone-800 w-8 text-center">{recordCount}</span>
                    <button onClick={() => setRecordCount(recordCount + 1)} className="w-10 h-10 rounded-full bg-stone-100 text-xl font-bold">＋</button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-stone-600">やる前、どれくらい不安でしたか？</p>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setBeforeScore(n)} className={`flex-1 h-8 rounded-full text-sm font-bold transition-colors ${beforeScore >= n ? 'bg-purple-400 text-white' : 'bg-stone-100 text-stone-400'}`}>●</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-stone-600">実際は、どうでしたか？</p>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setAfterScore(n)} className={`flex-1 h-8 rounded-full text-sm font-bold transition-colors ${afterScore >= n ? 'bg-teal-400 text-white' : 'bg-stone-100 text-stone-400'}`}>●</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-stone-600">ひとことメモ（任意）</p>
                  <input type="text" value={memo} onChange={e => setMemo(e.target.value)} placeholder="今日気づいたこと..." className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-purple-400" />
                </div>
                <button onClick={handleDetailRecord} className="w-full py-4 rounded-full font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}>
                  記録する
                </button>
              </div>
            )}
            {recordStep === 'done' && (
              <div className="text-center space-y-4 py-8">
                <div className="text-4xl">{todayLog?.done ? '🎉' : '👍'}</div>
                <p className="font-bold text-stone-800">{todayLog?.done ? '記録しました！' : '今日はパスしました'}</p>
                <p className="text-sm text-stone-500">{todayLog?.done ? `${content?.visualizationLabel}が増えています` : '機会がなかった日もある。それでOKです。'}</p>
                <button onClick={() => setTab('home')} className="w-full py-4 rounded-full font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}>
                  ホームへ
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'review' && (
          <div className="space-y-5 pt-2">
            <h2 className="text-lg font-bold text-stone-900">今週のあなた</h2>
            <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">{content?.visualizationLabel}</span>
                  <span className="font-bold text-purple-500">{totalCount}回</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">{content?.accumulator}</span>
                  <span className="font-bold text-stone-700">累計 {totalCount}回</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">連続記録</span>
                  <span className="font-bold text-orange-500">🔥 {streak}日</span>
                </div>
              </div>
              <div className="border-t border-stone-100 pt-4">
                <p className="text-xs text-stone-400 leading-relaxed">
                  少しずつ積み上がっています。来週は、少しだけ難易度を上げてみましょう。
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === 'report' && (() => {
          const reportContent = REPORT_CONTENT[typeId];
          return (
            <div className="space-y-5 pt-2">
              <h2 className="text-lg font-bold text-stone-900">あなたのレポート</h2>

              {fearScores && (
                <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-3">
                  <p className="text-xs text-stone-400 font-medium">恐れの4軸</p>
                  <RadarChartComponent fearScores={fearScores} />
                </div>
              )}

              {defenseScores && (
                <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-4">
                  <p className="text-xs text-stone-400 font-medium">防衛スタイル</p>
                  <DefenseBarChart defenseScores={defenseScores} />
                </div>
              )}

              {reportContent ? (<>
                <div className="bg-white rounded-3xl p-5 border border-purple-100 space-y-3">
                  <p className="text-xs text-purple-400 font-medium">あなたが消耗しやすい場面</p>
                  <p className="text-sm text-stone-700 leading-relaxed">{reportContent.drainScene}</p>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-3">
                  <p className="text-xs text-stone-400 font-medium">その力は、本来こういうもの</p>
                  <p className="text-sm text-stone-700 leading-relaxed">{reportContent.strengthReframe}</p>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs text-stone-400 font-medium">あなたの30日プログラム</p>
                    <p className="text-xs text-stone-400">まずは「気づく」ことが目標です</p>
                  </div>
                  {reportContent.program.map((step, i) => (
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
                <div className="bg-purple-50 rounded-3xl p-5 border border-purple-100 space-y-2">
                  <p className="text-xs text-purple-400 font-medium">30日後には…</p>
                  <p className="text-sm text-stone-700 leading-relaxed">{reportContent.after}</p>
                </div>
              </>) : (
                <div className="bg-white rounded-3xl p-5 border border-stone-100">
                  <p className="text-xs text-stone-400">準備中です。</p>
                </div>
              )}

              <div className="bg-stone-100 rounded-3xl p-5 space-y-2">
                <p className="text-xs text-stone-500 font-medium">🌿 しんどい時は</p>
                <p className="text-xs text-stone-500 leading-relaxed">
                  しんどさが強いときは、無理せず専門の相談窓口や医療機関へ。あなたの力だけで抱え込まなくていいです。
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-stone-100 flex justify-around items-center h-16 px-2">
        {([
          { key: 'home', label: 'ホーム', icon: '🏠' },
          { key: 'mission', label: 'ミッション', icon: '🎯' },
          { key: 'record', label: '記録', icon: '📝' },
          { key: 'review', label: '振り返り', icon: '📊' },
          { key: 'report', label: 'レポート', icon: '📋' },
        ] as { key: Tab; label: string; icon: string }[]).map(item => (
          <button
            key={item.key}
            onClick={() => { setTab(item.key); if (item.key === 'record') setRecordStep('question'); }}
            className={`flex flex-col items-center gap-1 w-14 transition-colors ${tab === item.key ? 'text-purple-600' : 'text-stone-400'}`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
