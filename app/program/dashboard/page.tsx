'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { PROGRAM_CONTENT, TYPE_NAMES, ProgramConfig, GeneratedPlan } from '@/data/program';
import { REPORT_CONTENT } from '@/data/report';
import { FearAxis, DefenseAxis } from '@/data/questions';
import { selectTodayMission, FEAR_FOCUS_LABEL, KIND_LABEL } from '@/lib/missionSelect';
import dynamic from 'next/dynamic';

const RadarChartComponent = dynamic(() => import('@/components/RadarChartComponent'), { ssr: false });
const DefenseBarChart = dynamic(() => import('@/components/DefenseBarChart'), { ssr: false });

type Tab = 'home' | 'mission' | 'record' | 'review' | 'report' | 'profile';
type RecordStep = 'question' | 'detail' | 'done';

export default function DashboardPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [loginError, setLoginError] = useState('');
  const [loginView, setLoginView] = useState<'login' | 'reset' | 'reset-sent'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  const [tab, setTab] = useState<Tab>('home');
  const [reportSubtab, setReportSubtab] = useState<'tendency' | 'program'>('tendency');
  const [userId, setUserId] = useState('');
  const [typeId, setTypeId] = useState('distancer');
  const [username, setUsername] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('kokolift_username') || '' : '');
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
  const [programConfig, setProgramConfig] = useState<ProgramConfig | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);

  // profile edit state
  const [profileData, setProfileData] = useState<{
    username: string;
    email: string;
    lifestyle: string;
    daily_time: string;
    best_timing: string;
    distress_level: string;
    change_scene: string;
    type_id: string;
    paid_plan: string;
  } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // 優先順位：AI生成プラン > ProgramConfig（決定論） > 旧タイプ別シム
  const typeName = TYPE_NAMES[typeId];
  const aiMission = generatedPlan?.missions?.find(m => m.day === dayCount)
    ?? generatedPlan?.missions?.[(dayCount - 1) % (generatedPlan?.missions?.length || 1)];
  const todayMissionData = programConfig ? selectTodayMission(programConfig, dayCount) : null;
  const shimContent = PROGRAM_CONTENT[typeId];
  const shimMissionIndex = (dayCount - 1) % (shimContent?.missionPool.length || 1);
  const todayMission = aiMission
    ? { text: aiMission.title, why: aiMission.why }
    : todayMissionData
    ? { text: todayMissionData.level.text, why: todayMissionData.level.why }
    : shimContent?.missionPool[shimMissionIndex];
  const todayComponentId = aiMission?.componentId ?? todayMissionData?.componentId ?? null;
  const todayKind = aiMission?.kind ?? todayMissionData?.component.kind ?? null;
  const vizLabel = todayMissionData
    ? todayMissionData.component.answerCheckLabel
    : shimContent?.visualizationLabel ?? '';
  const currentFocusLabel = programConfig
    ? FEAR_FOCUS_LABEL[programConfig.currentFocus]
    : null;
  const currentKindLabel = todayKind ? KIND_LABEL[todayKind] : null;

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setAuthChecked(true); return; }
    // ハッシュにaccess_tokenがある場合（メール確認リンク経由）はセッションを確立させる
    const hash = window.location.hash;
    if (hash.includes('access_token=')) {
      sb.auth.getSession().then(({ data }) => {
        const user = data.session?.user;
        if (!user) { setAuthChecked(true); return; }
        setIsLoggedIn(true);
        setUserId(user.id);
        localStorage.setItem('kokolift_user_id', user.id);
        loadUserData(user.id);
        loadStats(user.id);
        loadScores(user.id);
        setAuthChecked(true);
        // ハッシュをURLから消す
        window.history.replaceState(null, '', '/program/dashboard');
      });
      return;
    }

    sb.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) { setAuthChecked(true); return; }
      setIsLoggedIn(true);
      setUserId(user.id);
      localStorage.setItem('kokolift_user_id', user.id);
      loadUserData(user.id);
      loadStats(user.id);
      loadScores(user.id);
      setAuthChecked(true);
    });
  }, []);

  // URLの ?tab= で初期タブを指定（ようこそガイドから「あなたについて」へ飛ばす用）
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    const valid: Tab[] = ['home', 'mission', 'record', 'review', 'report', 'profile'];
    if (t && valid.includes(t as Tab)) setTab(t as Tab);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginStatus('loading');
    const sb = getSupabase();
    if (!sb) { setLoginStatus('error'); setLoginError('接続エラー'); return; }
    const { data, error } = await sb.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error || !data.user) {
      setLoginStatus('error');
      setLoginError('メールアドレスまたはパスワードが正しくありません');
      return;
    }
    const uid = data.user.id;
    setUserId(uid);
    localStorage.setItem('kokolift_user_id', uid);
    await loadUserData(uid);
    await loadStats(uid);
    await loadScores(uid);
    setIsLoggedIn(true);
    setLoginStatus('idle');
  }

  async function loadUserData(uid: string) {
    const sb = getSupabase();
    if (!sb) { setProfileData({}  as any); return; }

    let { data, error } = await sb.from('users').select('*').eq('id', uid).single();

    // idで見つからない場合はemailで再検索
    if (!data || error) {
      const { data: { user } } = await sb.auth.getUser();
      if (user?.email) {
        const res = await sb.from('users').select('*').eq('email', user.email).single();
        data = res.data;
        // idを正しいauthのuidで更新
        if (data) {
          await sb.from('users').update({ id: uid }).eq('email', user.email);
        }
      }
    }

    if (!data) {
      setProfileData({ username: '', email: '', lifestyle: '', daily_time: '', best_timing: '', distress_level: '', change_scene: '', type_id: '', paid_plan: '' });
      return;
    }

    const name = data.username || 'あなた';
    setUsername(name);
    localStorage.setItem('kokolift_username', name);
    setTypeId(data.type_id || 'distancer');
    localStorage.setItem('kokolift_type_id', data.type_id || 'distancer');
    if (!data.welcome_completed && data.generated_plan) {
      router.replace('/program/welcome');
      return;
    }
    if (data.program_config) setProgramConfig(data.program_config as ProgramConfig);
    if (data.generated_plan) setGeneratedPlan(data.generated_plan as GeneratedPlan);
    setProfileData({
      username: data.username || '',
      email: data.email || '',
      lifestyle: data.lifestyle || '',
      daily_time: data.daily_time || '',
      best_timing: data.best_timing || '',
      distress_level: data.distress_level || '',
      change_scene: data.change_scene || '',
      type_id: data.type_id || '',
      paid_plan: data.paid_plan || '',
    });
  }

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
    const todayLogData = logs.find(l => l.date === today);
    if (todayLogData) setTodayLog({ done: todayLogData.done, count: todayLogData.count });
    const total = logs.filter(l => l.done).reduce((sum, l) => sum + (l.count || 0), 0);
    setTotalCount(total);
    setDayCount(logs.length + 1);
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
      mission_id: dayCount,
      component_id: todayComponentId,
      done,
      count,
      before_score: before,
      after_score: after,
      memo: m,
    }, { onConflict: 'user_id,date' });
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileData) return;
    setProfileSaving(true);
    const sb = getSupabase();
    if (!sb) { setProfileSaving(false); return; }
    await sb.from('users').update({
      username: profileData.username,
      lifestyle: profileData.lifestyle,
      daily_time: profileData.daily_time,
      best_timing: profileData.best_timing,
      distress_level: profileData.distress_level,
      change_scene: profileData.change_scene,
    }).eq('id', userId);
    setUsername(profileData.username);
    setProfileSaving(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetStatus('loading');
    const sb = getSupabase();
    if (!sb) { setResetStatus('error'); return; }
    const { error } = await sb.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/program/reset-password`,
    });
    if (error) { setResetStatus('error'); setLoginError(error.message); return; }
    setLoginView('reset-sent');
  }

  async function handleLogout() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    localStorage.removeItem('kokolift_user_id');
    localStorage.removeItem('kokolift_user_email');
    localStorage.removeItem('kokolift_type_id');
    setIsLoggedIn(false);
  }

  const progress = Math.min(dayCount / 30, 1);

  // ローディング中
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  // 未ログイン → ログイン / パスワードリセット画面
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 60%)' }}>
        <div className="w-full max-w-sm space-y-8">

          {loginView === 'login' && (<>
            <div className="text-center space-y-2">
              <p className="text-2xl">🔒</p>
              <h1 className="text-xl font-bold text-stone-900">ログイン</h1>
              <p className="text-sm text-stone-500">ダッシュボードにアクセスするにはログインが必要です</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-stone-500">メールアドレス</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-purple-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-stone-500">パスワード</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-purple-400"
                />
              </div>

              {loginStatus === 'error' && (
                <p className="text-xs text-red-500">{loginError}</p>
              )}

              <button
                type="submit"
                disabled={loginStatus === 'loading'}
                className="w-full py-4 rounded-full font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
              >
                {loginStatus === 'loading' ? 'ログイン中...' : 'ログイン'}
              </button>

              <button
                type="button"
                onClick={() => { setResetEmail(loginEmail); setLoginView('reset'); setResetStatus('idle'); }}
                className="w-full text-center text-xs text-stone-400 hover:text-purple-500 transition-colors py-1"
              >
                パスワードを忘れた方はこちら
              </button>
            </form>
          </>)}

          {loginView === 'reset' && (<>
            <div className="text-center space-y-2">
              <p className="text-2xl">📧</p>
              <h1 className="text-xl font-bold text-stone-900">パスワードをリセット</h1>
              <p className="text-sm text-stone-500">登録したメールアドレスに再設定用のリンクを送ります</p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-stone-500">メールアドレス</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-purple-400"
                />
              </div>

              {resetStatus === 'error' && (
                <p className="text-xs text-red-500">送信に失敗しました：{loginError}</p>
              )}

              <button
                type="submit"
                disabled={resetStatus === 'loading'}
                className="w-full py-4 rounded-full font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
              >
                {resetStatus === 'loading' ? '送信中...' : 'リセットメールを送る'}
              </button>

              <button
                type="button"
                onClick={() => setLoginView('login')}
                className="w-full text-center text-xs text-stone-400 hover:text-purple-500 transition-colors py-1"
              >
                ← ログインに戻る
              </button>
            </form>
          </>)}

          {loginView === 'reset-sent' && (
            <div className="text-center space-y-6">
              <p className="text-4xl">✅</p>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-stone-900">メールを送信しました</h1>
                <p className="text-sm text-stone-500 leading-relaxed">
                  <span className="font-medium text-stone-700">{resetEmail}</span> に<br />
                  パスワード再設定用のリンクを送りました。<br />
                  メールを確認してください。
                </p>
              </div>
              <button
                onClick={() => setLoginView('login')}
                className="w-full py-4 rounded-full font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
              >
                ログインに戻る
              </button>
            </div>
          )}

        </div>
      </div>
    );
  }

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
            {/* 現在地 */}
            {currentFocusLabel && (
              <div className="bg-purple-50 rounded-3xl p-4 border border-purple-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-medium">今取り組んでいること</p>
                  <p className="text-sm font-bold text-purple-700 mt-0.5">{currentFocusLabel}</p>
                  {currentKindLabel && (
                    <p className="text-xs text-purple-400 mt-0.5">{currentKindLabel}を中心に</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-stone-400">{dayCount - 1} / 30日</p>
                  <div className="w-16 bg-purple-200 rounded-full h-1.5 mt-1">
                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${progress * 100}%` }} />
                  </div>
                </div>
              </div>
            )}

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

            {!currentFocusLabel && (
              <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-3">
                <p className="text-xs text-stone-400 font-medium">30日プログラム</p>
                <div className="w-full bg-stone-100 rounded-full h-2">
                  <div className="bg-purple-400 h-2 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
                </div>
                <p className="text-sm text-stone-600">{dayCount - 1} / 30日</p>
              </div>
            )}

            <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-2">
              <p className="text-xs text-stone-400 font-medium">積み上げ</p>
              <p className="text-sm text-stone-600">{vizLabel}</p>
              <p className="text-2xl font-bold text-purple-500">{totalCount}<span className="text-sm text-stone-400 font-normal ml-1">回</span></p>
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
                <p className="text-sm text-stone-500">{todayLog?.done ? `${vizLabel}が増えています` : '機会がなかった日もある。それでOKです。'}</p>
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
                {currentFocusLabel && (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">今取り組んでいること</span>
                    <span className="font-bold text-purple-500">{currentFocusLabel}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">{vizLabel}</span>
                  <span className="font-bold text-purple-500">{totalCount}回</span>
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
          const report = generatedPlan?.report;
          const missions = generatedPlan?.missions ?? [];
          // 30日ミッションを週ごとに分割
          const weeks: { label: string; days: typeof missions }[] = [];
          if (missions.length) {
            for (let w = 0; w < Math.ceil(missions.length / 7); w++) {
              weeks.push({
                label: `${w + 1}週目`,
                days: missions.slice(w * 7, w * 7 + 7),
              });
            }
          }
          return (
            <div className="space-y-5 pt-2">
              <h2 className="text-lg font-bold text-stone-900">あなたについて</h2>

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

              {/* チャート下のサブタブ：傾向 / プログラム */}
              <div className="flex gap-1 p-1 bg-stone-100 rounded-full">
                {([
                  { key: 'tendency', label: 'あなたの傾向' },
                  { key: 'program', label: '今後のプログラム' },
                ] as { key: 'tendency' | 'program'; label: string }[]).map(s => (
                  <button
                    key={s.key}
                    onClick={() => setReportSubtab(s.key)}
                    className={`flex-1 py-2 rounded-full text-xs font-bold transition-colors ${reportSubtab === s.key ? 'bg-white text-purple-600 shadow-sm' : 'text-stone-400'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* ── あなたの傾向 ── */}
              {reportSubtab === 'tendency' && (
                report?.currentState ? (<>
                  <div className="bg-white rounded-3xl p-5 border border-purple-100 space-y-3">
                    <p className="text-xs text-purple-400 font-medium">いまのあなたについて</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{report.currentState}</p>
                  </div>
                  <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-3">
                    <p className="text-xs text-stone-400 font-medium">あなたが消耗しやすい場面</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{report.drainScene}</p>
                  </div>
                  <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-3">
                    <p className="text-xs text-stone-400 font-medium">その力は、本来こういうもの</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{report.strengthReframe}</p>
                  </div>
                </>) : reportContent ? (<>
                  <div className="bg-white rounded-3xl p-5 border border-purple-100 space-y-3">
                    <p className="text-xs text-purple-400 font-medium">あなたが消耗しやすい場面</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{reportContent.drainScene}</p>
                  </div>
                  <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-3">
                    <p className="text-xs text-stone-400 font-medium">その力は、本来こういうもの</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{reportContent.strengthReframe}</p>
                  </div>
                </>) : (
                  <div className="bg-white rounded-3xl p-5 border border-stone-100">
                    <p className="text-xs text-stone-400">準備中です。</p>
                  </div>
                )
              )}

              {/* ── 今後のプログラム ── */}
              {reportSubtab === 'program' && (<>
                {report?.direction && (
                  <div className="bg-purple-50 rounded-3xl p-5 border border-purple-100 space-y-2">
                    <p className="text-xs text-purple-400 font-medium">これから30日でやること</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{report.direction}</p>
                  </div>
                )}

                {weeks.length ? (
                  weeks.map((wk, wi) => (
                    <div key={wi} className="bg-white rounded-3xl p-5 border border-stone-100 space-y-3">
                      <p className="text-xs text-purple-400 font-medium">{wk.label}</p>
                      <div className="space-y-3">
                        {wk.days.map(m => {
                          const isToday = m.day === dayCount;
                          return (
                            <div key={m.day} className={`flex gap-3 rounded-2xl p-2.5 -mx-1 ${isToday ? 'bg-purple-50 ring-1 ring-purple-200' : ''}`}>
                              <div className="flex-shrink-0 w-12 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${isToday ? 'bg-purple-500 text-white' : 'bg-stone-100 text-stone-500'}`}>
                                  Day {m.day}
                                </span>
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <p className="text-sm font-medium text-stone-800 leading-snug">{m.title}</p>
                                {m.why && <p className="text-xs text-stone-400 leading-relaxed">{m.why}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : reportContent ? (<>
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
                    <p className="text-xs text-stone-400">プログラムを準備中です。</p>
                  </div>
                )}
              </>)}

              <div className="bg-stone-100 rounded-3xl p-5 space-y-2">
                <p className="text-xs text-stone-500 font-medium">🌿 しんどい時は</p>
                <p className="text-xs text-stone-500 leading-relaxed">
                  しんどさが強いときは、無理せず専門の相談窓口や医療機関へ。あなたの力だけで抱え込まなくていいです。
                </p>
              </div>
            </div>
          );
        })()}

        {tab === 'profile' && (
          <div className="space-y-5 pt-2">
            <h2 className="text-lg font-bold text-stone-900">プロフィール</h2>

            {profileData ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-4">
                  <p className="text-xs text-stone-400 font-medium">基本情報</p>

                  <div className="space-y-1">
                    <label className="text-xs text-stone-500">呼び名</label>
                    <input
                      type="text"
                      value={profileData.username}
                      onChange={e => setProfileData({ ...profileData, username: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-stone-500">メールアドレス</label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full px-4 py-3 rounded-xl border border-stone-100 text-sm bg-stone-50 text-stone-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-stone-500">診断タイプ</label>
                    <input
                      type="text"
                      value={TYPE_NAMES[profileData.type_id] || profileData.type_id}
                      disabled
                      className="w-full px-4 py-3 rounded-xl border border-stone-100 text-sm bg-stone-50 text-stone-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-stone-500">プラン</label>
                    <input
                      type="text"
                      value={profileData.paid_plan === 'standard' ? 'スタンダードプラン' : profileData.paid_plan === 'light' ? 'ライトプラン' : profileData.paid_plan}
                      disabled
                      className="w-full px-4 py-3 rounded-xl border border-stone-100 text-sm bg-stone-50 text-stone-400"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-stone-100 space-y-4">
                  <p className="text-xs text-stone-400 font-medium">プログラム設定</p>

                  {[
                    { label: '生活スタイル', key: 'lifestyle' as const, options: ['社会人', '学生', '主婦・主夫', 'その他'] },
                    { label: '1日に取れる時間', key: 'daily_time' as const, options: ['5分以内', '10〜15分', '30分以上'] },
                    { label: '続けやすいタイミング', key: 'best_timing' as const, options: ['朝', '昼', '夜'] },
                    { label: '今の困り度', key: 'distress_level' as const, options: ['とても困っている', '少し困っている', '知的興味で'] },
                    { label: '変えたい場面', key: 'change_scene' as const, options: ['職場・学校', '家族・パートナー', '友人関係', '自分の思考', '全部'] },
                  ].map(({ label, key, options }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs text-stone-500">{label}</label>
                      <select
                        value={profileData[key]}
                        onChange={e => setProfileData({ ...profileData, [key]: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-purple-400 bg-white"
                      >
                        <option value="">選択してください</option>
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="w-full py-4 rounded-full font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
                >
                  {profileSaving ? '保存中...' : profileSaved ? '✓ 保存しました' : '変更を保存する'}
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
              </div>
            )}

            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-full text-sm font-medium text-stone-400 border border-stone-200"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-stone-100 flex justify-around items-center h-16 px-1">
        {([
          { key: 'home', label: 'ホーム', icon: '🏠' },
          { key: 'mission', label: 'ミッション', icon: '🎯' },
          { key: 'record', label: '記録', icon: '📝' },
          { key: 'review', label: '振り返り', icon: '📊' },
          { key: 'report', label: 'あなたについて', icon: '📋' },
          { key: 'profile', label: 'プロフィール', icon: '👤' },
        ] as { key: Tab; label: string; icon: string }[]).map(item => (
          <button
            key={item.key}
            onClick={() => { setTab(item.key); if (item.key === 'record') setRecordStep('question'); }}
            className={`flex flex-col items-center gap-0.5 w-12 transition-colors ${tab === item.key ? 'text-purple-600' : 'text-stone-400'}`}
          >
            <span className="text-base">{item.icon}</span>
            <span className="text-[10px] font-medium leading-tight">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
