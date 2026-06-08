'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { PROGRAM_CONTENT, TYPE_NAMES, ProgramConfig, GeneratedPlan } from '@/data/program';
import { REPORT_CONTENT } from '@/data/report';
import { FearAxis, DefenseAxis } from '@/data/questions';
import { selectTodayMission, FEAR_FOCUS_LABEL, KIND_LABEL } from '@/lib/missionSelect';
import { PROGRAM_COMPONENTS } from '@/data/program';
import dynamic from 'next/dynamic';
import CognitiveChatSession from '@/components/CognitiveChatSession';

const FEAR_AXIS_LABEL: Record<string, string> = {
  F_REL: '関係喪失', F_EVAL: '評価', F_IMP: '不完全性', F_CTRL: '制御不能',
};

const FEAR_AXIS_DESC: { axis: string; label: string; desc: string }[] = [
  { axis: 'F_REL', label: '関係喪失への恐れ', desc: '大切な人との関係が壊れたり、嫌われたりすることへの不安。人に合わせすぎたり、衝突を避けたりする行動につながりやすい。' },
  { axis: 'F_EVAL', label: '評価への恐れ', desc: '他者に批判されたり、否定的に見られることへの不安。発言を控えたり、完璧に見せようとしたりする行動につながりやすい。' },
  { axis: 'F_IMP', label: '不完全性への恐れ', desc: '失敗したり、できない自分をさらけ出すことへの不安。準備に時間をかけすぎたり、行動を先送りにしたりする行動につながりやすい。' },
  { axis: 'F_CTRL', label: '制御不能への恐れ', desc: '状況がコントロールできなくなることへの不安。見通しを立てようとしすぎたり、決定を先送りにしたりする行動につながりやすい。' },
];

const DEFENSE_AXIS_DESC: { axis: string; label: string; desc: string }[] = [
  { axis: 'D_APP', label: '回避 ↔ 接近', desc: 'しんどい場面から離れるか（回避）、あえて向き合うか（接近）。どちらも状況によって合理的な対処です。' },
  { axis: 'D_ACT', label: '受動 ↔ 能動', desc: '相手や状況に合わせるか（受動）、自分から動くか（能動）。どちらが「良い」ではなく、状況や目的によって使い分けが変わります。' },
  { axis: 'D_EXP', label: '抑制 ↔ 表出', desc: '気持ちを内にためるか（抑制）、外に出すか（表出）。どちらにも消耗しやすい場面と、うまく機能する場面があります。' },
];

// 1日の区切りは日本時間 午前3時（夜型に配慮）。
// JST(UTC+9) で 3時より前は前日扱い → UTCに +6時間 した日付を「論理的な今日」とする。
function logicalDate(daysAgo = 0): string {
  const d = new Date(Date.now() + 6 * 60 * 60 * 1000);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

const RadarChartComponent = dynamic(() => import('@/components/RadarChartComponent'), { ssr: false });
const DefenseBarChart = dynamic(() => import('@/components/DefenseBarChart'), { ssr: false });

type Tab = 'home' | 'mission' | 'record' | 'review' | 'report' | 'profile';
type RecordStep = 'question' | 'detail' | 'done';
type DailyLog = {
  date: string;
  mission_id: number;
  component_id: string | null;
  done: boolean;
  count: number;
  before_score: number;
  after_score: number;
  memo: string;
};

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
  const [fearAxisOpen, setFearAxisOpen] = useState(false);
  const [defenseAxisOpen, setDefenseAxisOpen] = useState(false);
  const [philosophySlide, setPhilosophySlide] = useState(0);
  const [userId, setUserId] = useState('');
  const [typeId, setTypeId] = useState('distancer');
  const [username, setUsername] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('kokolift_username') || '' : '');
  const [streak, setStreak] = useState(0);
  const [dayCount, setDayCount] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [cogCount, setCogCount] = useState(0);
  const [actionCount, setActionCount] = useState(0);
  const [todayLog, setTodayLog] = useState<{ done: boolean; count: number } | null>(null);
  const [recordStep, setRecordStep] = useState<RecordStep>('question');
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [recordCount, setRecordCount] = useState(3);
  const [beforeScore, setBeforeScore] = useState(3);
  const [afterScore, setAfterScore] = useState(3);
  const [memo, setMemo] = useState('');
  const [fearScores, setFearScores] = useState<Record<FearAxis, number> | null>(null);
  const [defenseScores, setDefenseScores] = useState<Record<DefenseAxis, number> | null>(null);
  const [programConfig, setProgramConfig] = useState<ProgramConfig | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [expandedReview, setExpandedReview] = useState<number | null>(null);
  const [paidPlan, setPaidPlan] = useState('');
  const [actionFeedback, setActionFeedback] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [footprintHeroIdx] = useState(() => Math.floor(Math.random() * 5) + 1);
  const [footprintData, setFootprintData] = useState<{
    hero: string;
    beforeNow: string;
    timeline: { day: number; label: string }[];
    next: string;
  } | null>(null);
  const [footprintLoading, setFootprintLoading] = useState(false);

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
  const todayLv = aiMission?.lv ?? todayMissionData?.level.lv ?? 1;
  const vizLabel = todayMissionData
    ? todayMissionData.component.answerCheckLabel
    : shimContent?.visualizationLabel ?? '';
  const currentFocusLabel = programConfig
    ? FEAR_FOCUS_LABEL[programConfig.currentFocus]
    : null;
  const currentKindLabel = todayKind ? KIND_LABEL[todayKind] : null;
  // スタンダード以上はAIサポートあり（ライトは自分で取り組む）
  const hasAISupport = paidPlan === 'standard' || paidPlan === 'premium';

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

  // 足あと生成・DB保存
  async function generateAndSaveFootprint(currentDoneLogs: DailyLog[], currentUserId: string) {
    if (footprintLoading) return;
    const missions = generatedPlan?.missions ?? [];
    const missionByDay = new Map(missions.map(m => [m.day, m]));
    const enriched = currentDoneLogs.map(l => {
      const m = missionByDay.get(l.mission_id);
      const comp = l.component_id ? PROGRAM_COMPONENTS[l.component_id as keyof typeof PROGRAM_COMPONENTS] : null;
      return { day: l.mission_id, title: m?.title ?? '取り組んだミッション', kind: comp?.kind ?? null, date: l.date, memo: l.memo };
    });
    setFootprintLoading(true);
    try {
      const res = await fetch('/api/footprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focusLabel: currentFocusLabel ?? '不安', cogCount, actionCount, dayCount: currentDoneLogs.length, logs: enriched }),
      });
      const data = await res.json();
      if (!data.error) {
        setFootprintData(data);
        const sb = getSupabase();
        if (sb) {
          await sb.from('footprint_cache').upsert({
            user_id: currentUserId,
            log_count: currentDoneLogs.length,
            hero: data.hero,
            before_now: data.beforeNow,
            timeline: data.timeline,
            next: data.next,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        }
      }
    } finally {
      setFootprintLoading(false);
    }
  }

  // 足あとタブを開いた時：DBから読む、log_countが違えば再生成
  useEffect(() => {
    if (tab !== 'review' || footprintLoading) return;
    const doneLogs = logs.filter(l => l.done);
    if (doneLogs.length === 0) return;
    const sb = getSupabase();
    if (!sb || !userId) return;
    sb.from('footprint_cache').select('*').eq('user_id', userId).single().then(({ data }) => {
      if (data && data.log_count === doneLogs.length) {
        setFootprintData({ hero: data.hero, beforeNow: data.before_now, timeline: data.timeline, next: data.next });
      } else {
        generateAndSaveFootprint(doneLogs, userId);
      }
    });
  }, [tab, userId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setPaidPlan(data.paid_plan || '');
    setTypeId(data.type_id || 'distancer');
    localStorage.setItem('kokolift_type_id', data.type_id || 'distancer');
    if (!data.welcome_completed && data.generated_plan) {
      router.replace('/program/welcome');
      return;
    }
    if (data.program_config) setProgramConfig(data.program_config as ProgramConfig);
    if (data.generated_plan) {
      setGeneratedPlan(data.generated_plan as GeneratedPlan);
      // プレビュープランのままならバックグラウンドでフル生成
      if ((data.generated_plan as GeneratedPlan).phase === 'preview' && data.diag_session) {
        upgradeToFullPlan(uid, data.diag_session, data.type_id || 'distancer');
      }
    }
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

  async function upgradeToFullPlan(uid: string, diagSession: string, typeId: string) {
    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagSession, typeId, phase: 'full' }),
      });
      const result = await res.json();
      if (result.plan) {
        setGeneratedPlan(result.plan as GeneratedPlan);
        const sb = getSupabase();
        await sb?.from('users').update({
          generated_plan: result.plan,
          program_config: result.plan.config ?? null,
        }).eq('id', uid);
      }
    } catch (e) {
      console.error('background full plan upgrade failed:', e);
    }
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
    const today = logicalDate();
    const { data: logs } = await sb.from('daily_logs').select('*').eq('user_id', uid).order('date', { ascending: false });
    if (!logs) return;
    setLogs(logs as DailyLog[]);
    const todayLogData = logs.find(l => l.date === today);
    if (todayLogData) setTodayLog({ done: todayLogData.done, count: todayLogData.count });
    const total = logs.filter(l => l.done).reduce((sum, l) => sum + (l.count || 0), 0);
    setTotalCount(total);
    const doneLogs = logs.filter(l => l.done);
    const cog = doneLogs.filter(l => l.component_id && String(l.component_id).includes('COG')).length;
    const act = doneLogs.filter(l => l.component_id && String(l.component_id).includes('ACT')).length;
    setCogCount(cog);
    setActionCount(act);
    setDayCount(logs.length + 1);
    let s = 0;
    const sortedDates = logs.map(l => l.date).sort().reverse();
    for (let i = 0; i < sortedDates.length; i++) {
      if (sortedDates[i] === logicalDate(i + 1)) s++;
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
    await loadStats(userId);
    // ミッション完了時に足あとを再生成・DB保存（バックグラウンド）
    const newDoneLogs = [...logs.filter(l => l.done && l.date !== logicalDate()), { date: logicalDate(), mission_id: dayCount, component_id: todayComponentId, done: true, count: recordCount, before_score: beforeScore, after_score: afterScore, memo }];
    generateAndSaveFootprint(newDoneLogs, userId).catch(() => {});
    // スタンダード以上：AIが変化を言語化
    if (hasAISupport) {
      setFeedbackLoading(true);
      try {
        const res = await fetch('/api/cognitive-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'action-feedback',
            missionTitle: aiMission?.title ?? todayMission?.text ?? '',
            before: beforeScore,
            after: afterScore,
            memo,
          }),
        });
        const data = await res.json();
        if (data.message) setActionFeedback(data.message);
      } catch {
        // フィードバック取得失敗は無視（記録自体は完了している）
      } finally {
        setFeedbackLoading(false);
      }
    }
  }

  async function saveLog(done: boolean, count: number, before: number, after: number, m: string) {
    const sb = getSupabase();
    if (!sb || !userId || !todayMission) return;
    const today = logicalDate();
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
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #fafaf8 40%)' }}>
      <div className="max-w-sm mx-auto px-5 space-y-5">
        {tab === 'home' && (
          <div className="-mx-5 px-3 space-y-4">
            {/* ヘッダー */}
            <div className="flex justify-between items-start pt-8 pb-1 px-2">
              <div>
                <p className="text-xs text-purple-400 font-medium">おかえりなさい</p>
                <p className="text-2xl font-bold text-stone-900">{username}さん</p>
              </div>
              <div className="w-10 h-10 flex items-center justify-center mt-1">
                <img src="/intro-service-icon.png" alt="" className="w-8 h-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            </div>

            {/* 今日の一歩カード */}
            {(() => {
              const missionText = todayMission?.text ?? '';
              const textSize = missionText.length > 45 ? 'text-sm' : missionText.length > 28 ? 'text-base' : 'text-lg';
              const fearAxisKey = todayComponentId ? PROGRAM_COMPONENTS[todayComponentId as keyof typeof PROGRAM_COMPONENTS]?.fearAxis : null;
              const fearLabel = fearAxisKey ? FEAR_AXIS_LABEL[fearAxisKey] : null;
              const kindLabel = todayKind === 'action' ? '行動' : todayKind ? '認知' : null;
              return (
                <button
                  onClick={() => setTab('mission')}
                  className="w-full bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm text-left"
                >
                  <div className="relative h-[230px]">
                    <img
                      src="/images/mission-hero.png"
                      alt=""
                      className="absolute right-0 top-0 h-full w-3/5 object-cover object-center"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="absolute top-0 bottom-0 left-[35%] w-[25%] bg-gradient-to-r from-white to-transparent" />
                    {/* テキストエリア：上部ラベル＋中央テキスト＋下部バッジ、ボタンと被らない高さ */}
                    <div className="relative flex flex-col h-full w-[58%] p-5">
                      <p className="text-xs text-purple-500 font-bold flex items-center gap-1.5 mb-2 flex-shrink-0">
                        <span className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img src="/images/icon-day.png" alt="" className="w-4 h-4 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </span>
                        今日の一歩
                      </p>
                      <p className={`${textSize} font-bold text-stone-900 leading-snug flex-1 overflow-hidden`}>
                        {missionText || 'ミッションを読み込み中...'}
                      </p>
                      {/* バッジ：ボタン（h-10 + bottom-4 = 56px）と被らないよう pb-16 */}
                      <div className="flex gap-1.5 flex-wrap pb-1 flex-shrink-0">
                        {kindLabel && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-600">{kindLabel}</span>}
                        {fearLabel && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-500">{fearLabel}</span>}
                      </div>
                    </div>
                    {/* 右下の丸ボタン */}
                    <div
                      className="absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-md flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
                    >
                      {todayLog?.done
                        ? <span className="text-white text-sm font-bold">✓</span>
                        : <span className="text-white text-base font-bold pl-0.5">▶</span>
                      }
                    </div>
                  </div>
                </button>
              );
            })()}

            {/* 30日の道のり */}
            <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm space-y-3">
              <p className="text-sm font-bold text-stone-700">30日の道のり</p>
              <div className="flex items-center">
                {(() => {
                  const DOTS = 15;
                  const filledDots = Math.round((dayCount - 1) / 30 * DOTS);
                  return Array.from({ length: DOTS }).map((_, i) => {
                    const filled = i < filledDots;
                    const isLast = i === DOTS - 1;
                    return (
                      <div key={i} className="flex items-center" style={{ flex: isLast ? '0 0 auto' : 1 }}>
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${filled ? 'bg-purple-500' : 'bg-stone-200'}`} />
                        {!isLast && <div className={`h-0.5 w-full transition-colors ${filled && i < filledDots - 1 ? 'bg-purple-400' : 'bg-stone-200'}`} />}
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-purple-500">
                  {dayCount - 1}<span className="text-sm text-stone-400 font-normal ml-1">/ 30日</span>
                </p>
                <span className="text-purple-300 text-2xl">♡</span>
              </div>
            </div>

            {/* テーマカード */}
            {currentFocusLabel && (
              <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm">
                <div className="flex gap-4 items-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img
                      src={`/images/fear-${programConfig?.currentFocus?.toLowerCase() ?? 'theme'}.png`}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-stone-400 font-medium mb-0.5">最近向き合っているテーマ</p>
                    <p className="text-lg font-bold text-stone-800">{currentFocusLabel}</p>
                    <p className="text-xs text-stone-500 leading-relaxed mt-0.5">
                      {currentFocusLabel === '評価への恐れ' && '人にどう見られるかが気になる場面で出やすいテーマです。'}
                      {currentFocusLabel === '先への不安' && '予定が決まらない時や、相手の反応が読めない時に出やすいテーマです。'}
                      {currentFocusLabel === '完璧への囚われ' && 'ミスや中途半端さが気になって動けなくなる場面で出やすいテーマです。'}
                      {currentFocusLabel === '関係への恐れ' && '大切な人との距離感や繋がりが不安になる場面で出やすいテーマです。'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 bg-purple-50 rounded-2xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src="/images/icon-write.png" alt="" className="w-5 h-5 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400">気づく</p>
                      <p className="text-lg font-bold text-stone-800">{cogCount}<span className="text-xs font-normal text-stone-400 ml-0.5">回</span></p>
                    </div>
                  </div>
                  <div className="flex-1 bg-purple-50 rounded-2xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src="/images/icon-heart.png" alt="" className="w-5 h-5 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400">試す</p>
                      <p className="text-lg font-bold text-stone-800">{actionCount}<span className="text-xs font-normal text-stone-400 ml-0.5">回</span></p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'mission' && todayMission && (
          <div className="space-y-5 pt-2">
            <h2 className="text-lg font-bold text-stone-900">今日のミッション</h2>

            {/* Badges */}
            {todayComponentId && (
              <div className="flex flex-wrap gap-2">
                {FEAR_AXIS_LABEL[PROGRAM_COMPONENTS[todayComponentId as keyof typeof PROGRAM_COMPONENTS]?.fearAxis ?? ''] && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-600">
                    {FEAR_AXIS_LABEL[PROGRAM_COMPONENTS[todayComponentId as keyof typeof PROGRAM_COMPONENTS]?.fearAxis]}
                  </span>
                )}
                {todayKind && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-600">
                    {todayKind === 'action' ? '行動' : '認知'}
                  </span>
                )}
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-stone-200 text-stone-500">
                  Lv {todayLv}
                </span>
              </div>
            )}

            <div className="bg-white rounded-3xl p-5 border border-purple-100 space-y-4">
              <p className="text-base font-bold text-stone-800 leading-relaxed">「{todayMission.text}」</p>
              <div className="border-t border-stone-100 pt-4">
                <p className="text-xs text-stone-400 mb-2">なぜこれ？</p>
                <p className="text-sm text-stone-600 leading-relaxed">{todayMission.why}</p>
              </div>
            </div>

            <div className="border-t border-stone-100" />

            {/* Inline recording */}
            {recordStep === 'done' ? (
              <div className="text-center space-y-4 py-6">
                <div className="text-4xl">{todayLog?.done ? '🎉' : '👍'}</div>
                <p className="font-bold text-stone-800">{todayLog?.done ? '記録しました！' : '今日はパスしました'}</p>
                <p className="text-sm text-stone-500">{todayLog?.done ? `${vizLabel}が増えています` : '機会がなかった日もある。それでOKです。'}</p>
                {/* スタンダード以上：AIの変化フィードバック */}
                {todayLog?.done && hasAISupport && (feedbackLoading || actionFeedback) && (
                  <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 text-left">
                    <p className="text-[11px] text-purple-500 font-bold mb-1">AIからのフィードバック</p>
                    {feedbackLoading
                      ? <p className="text-sm text-stone-400">読み取っています...</p>
                      : <p className="text-sm text-stone-700 leading-relaxed">{actionFeedback}</p>}
                  </div>
                )}
                <button onClick={() => setTab('home')} className="w-full py-4 rounded-full font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}>
                  ホームへ
                </button>
              </div>
            ) : todayLog?.done ? (
              <div className="bg-green-50 rounded-3xl p-5 border border-green-100 space-y-2">
                <p className="text-sm font-bold text-green-700">今日の記録済み ✓</p>
                <p className="text-xs text-green-600">{todayLog.count}回完了</p>
              </div>
            ) : todayLog?.done === false ? (
              <div className="bg-stone-50 rounded-3xl p-5 border border-stone-100">
                <p className="text-sm font-bold text-stone-500">今日はパス済み</p>
              </div>
            ) : todayKind === 'action' ? (
              /* Action mission recording form */
              <div className="space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-stone-600">どれくらいできましたか？</p>
                    <span className="text-2xl font-bold text-purple-600">{recordCount}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={10}
                    value={recordCount}
                    onChange={e => setRecordCount(Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-stone-300">
                    <span>0%</span><span>50%</span><span>100%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-stone-600">やる前の不安度</p>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setBeforeScore(n)} className={`flex-1 h-8 rounded-full text-sm font-bold transition-colors ${beforeScore >= n ? 'bg-purple-400 text-white' : 'bg-stone-100 text-stone-400'}`}>●</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-stone-600">実際はどうでしたか？</p>
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
                <div className="flex gap-3">
                  <button onClick={handleDetailRecord} className="flex-1 py-4 rounded-full font-bold text-white text-sm" style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}>
                    記録する
                  </button>
                  <button onClick={() => handleRecord(false)} className="flex-1 py-4 rounded-full font-bold text-stone-500 text-sm">
                    今日は機会がなかった
                  </button>
                </div>
              </div>
            ) : hasAISupport ? (
              /* Cognitive mission (スタンダード以上): AI chat session */
              <>
                {/* 開くボタン */}
                <button
                  onClick={() => setChatModalOpen(true)}
                  className="w-full py-4 rounded-full font-bold text-white text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
                >
                  <span>💬</span> AIと対話しながら深めてみる
                </button>
                <button onClick={() => handleRecord(false)} className="w-full text-xs text-stone-400 hover:text-stone-600 transition-colors mt-1">
                  今日は機会がなかった
                </button>

                {/* フルスクリーンモーダル */}
                {chatModalOpen && (
                  <div className="fixed inset-0 z-50 flex flex-col bg-white">
                    {/* ヘッダー */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-100">
                      <button onClick={() => setChatModalOpen(false)} className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 text-lg">
                        ✕
                      </button>
                      <p className="text-sm font-bold text-stone-700 truncate">{aiMission?.title ?? todayMission?.text ?? ''}</p>
                    </div>
                    {/* チャット本体 */}
                    <div className="flex-1 overflow-y-auto px-4 pt-4">
                      <CognitiveChatSession
                        missionTitle={aiMission?.title ?? todayMission?.text ?? ''}
                        missionWhy={aiMission?.why ?? todayMission?.why ?? ''}
                        componentId={todayComponentId ?? ''}
                        day={dayCount}
                        userId={userId}
                        onComplete={async (summary: string) => {
                          const sb = getSupabase();
                          if (sb && userId) {
                            const today = logicalDate();
                            const { error } = await sb.from('daily_logs').upsert({
                              user_id: userId,
                              date: today,
                              mission_id: dayCount,
                              component_id: todayComponentId,
                              done: true,
                              count: 1,
                              before_score: 0,
                              after_score: 0,
                              memo: summary,
                            }, { onConflict: 'user_id,date' });
                            if (error) {
                              console.error('cognitive session save error:', error.message, error.code, error.details, error.hint);
                            } else {
                              await loadStats(userId);
                            }
                          } else {
                            console.error('cognitive session save skipped: sb=', !!getSupabase(), 'userId=', userId);
                          }
                          setTodayLog({ done: true, count: 1 });
                          setChatModalOpen(false);
                          setRecordStep('done');
                        }}
                        onSkip={() => { setChatModalOpen(false); handleRecord(false); }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Cognitive mission (ライト): 自分で書き出す */
              <div className="space-y-5">
                <p className="text-sm font-bold text-stone-700">今日のワークに取り組んでみましょう</p>
                <div className="space-y-2">
                  <p className="text-sm text-stone-600">気づいたこと・考えたこと</p>
                  <textarea
                    value={memo}
                    onChange={e => setMemo(e.target.value)}
                    rows={5}
                    placeholder="今日気づいたこと、考えたことを書き出してみましょう..."
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-purple-400 resize-none leading-relaxed"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-stone-600">取り組む前の重さ</p>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setBeforeScore(n)} className={`flex-1 h-8 rounded-full text-sm font-bold transition-colors ${beforeScore >= n ? 'bg-purple-400 text-white' : 'bg-stone-100 text-stone-400'}`}>●</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-stone-600">取り組んだ後の軽さ</p>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setAfterScore(n)} className={`flex-1 h-8 rounded-full text-sm font-bold transition-colors ${afterScore >= n ? 'bg-teal-400 text-white' : 'bg-stone-100 text-stone-400'}`}>●</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      await saveLog(true, 1, beforeScore, afterScore, memo);
                      setTodayLog({ done: true, count: 1 });
                      setRecordStep('done');
                      await loadStats(userId);
                    }}
                    className="flex-1 py-4 rounded-full font-bold text-white text-sm"
                    style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
                  >
                    記録する
                  </button>
                  <button onClick={() => handleRecord(false)} className="flex-1 py-4 rounded-full font-bold text-stone-500 text-sm">
                    今日は機会がなかった
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        {tab === 'review' && (() => {
          const doneLogs = logs.filter(l => l.done);
          const missions = generatedPlan?.missions ?? [];
          const missionByDay = new Map(missions.map(m => [m.day, m]));
          const enriched = doneLogs.map(l => {
            const m = missionByDay.get(l.mission_id);
            const comp = l.component_id ? PROGRAM_COMPONENTS[l.component_id as keyof typeof PROGRAM_COMPONENTS] : null;
            return {
              day: l.mission_id,
              title: m?.title ?? '取り組んだミッション',
              kind: comp?.kind ?? null,
              memo: l.memo,
            };
          });

          async function loadFootprint() {
            if (footprintLoading || footprintData) return;
            setFootprintLoading(true);
            try {
              const res = await fetch('/api/footprint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  focusLabel: currentFocusLabel ?? '不安',
                  cogCount,
                  actionCount,
                  dayCount: doneLogs.length,
                  logs: enriched,
                }),
              });
              const data = await res.json();
              if (!data.error) setFootprintData(data);
            } finally {
              setFootprintLoading(false);
            }
          }

          // Before/Nowのテキストをパース
          function parseBeforeNow(text: string) {
            const beforeMatch = text.match(/はじめの頃\s*([\s\S]*?)(?=今のあなた|$)/);
            const nowMatch = text.match(/今のあなた\s*([\s\S]*?)$/);
            const parse = (s?: string) =>
              (s ?? '').split('\n').map(l => l.replace(/^[・\-]\s*/, '').trim()).filter(Boolean);
            return {
              before: parse(beforeMatch?.[1]),
              now: parse(nowMatch?.[1]),
            };
          }

          return (
            <div className="space-y-5 pt-2 pb-4">
              {/* ヘッダー */}
              <div className="flex justify-between items-start pt-6 pb-1">
                <div>
                  <p className="text-xs text-purple-400 font-medium">ここまでのあなた</p>
                  <p className="text-2xl font-bold text-stone-900">足あと</p>
                </div>
                <div className="w-10 h-10 flex items-center justify-center mt-1">
                  <img src="/intro-service-icon.png" alt="" className="w-8 h-8 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              </div>

              {/* ① これまでのあなた（ヒーローカード） */}
              <div className="-mx-3 bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm">
                <div className="relative min-h-[180px]">
                  {/* ヒーロー画像（右半分・フル高さ） */}
                  <img
                    src={`/images/footprint-hero-${footprintHeroIdx}.png`}
                    alt=""
                    className="absolute right-0 top-0 h-full w-3/5 object-cover object-center"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  {/* 左から白グラデオーバーレイ */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent" />
                  {/* テキスト */}
                  <div className="relative p-5 w-4/5">
                    <p className="text-xs text-purple-500 font-bold flex items-center gap-1 mb-3">
                      <img src="/images/icon-leaf.png" alt="" className="w-4 h-4 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> これまでのあなた
                    </p>
                    {footprintData ? (
                      <>
                        <p className="text-sm text-stone-800 leading-relaxed">
                          {footprintData.hero}
                        </p>
                        <p className="text-xs text-stone-400 mt-3">ここから、少しずつ変わってきました</p>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-stone-400">
                        <span className="inline-block w-4 h-4 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                        変化を読み取っています...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ② Before/Now 比較 */}
              {footprintData && (() => {
                const { before, now } = parseBeforeNow(footprintData.beforeNow);
                return (
                  <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm space-y-3">
                    <p className="text-sm font-bold text-purple-500 flex items-center gap-1.5">
                      <img src="/images/icon-balance.png" alt="" className="w-4 h-4 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> はじめの頃 → 今のあなた
                    </p>
                    <div className="bg-purple-50 rounded-2xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0"><img src="/images/icon-cloud.png" alt="" className="w-[22px] h-[22px] object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /></div>
                        <p className="text-xs font-bold text-stone-500">はじめの頃</p>
                      </div>
                      <div className="space-y-1 pl-1">
                        {before.map((b, i) => <p key={i} className="text-xs text-stone-600">・{b}</p>)}
                      </div>
                    </div>
                    <div className="text-center text-purple-400">↓</div>
                    <div className="bg-purple-50 rounded-2xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0"><img src="/images/icon-sprout.png" alt="" className="w-[22px] h-[22px] object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /></div>
                        <p className="text-xs font-bold text-purple-500">今のあなた</p>
                      </div>
                      <div className="space-y-1 pl-1">
                        {now.map((n, i) => <p key={i} className="text-xs text-stone-700">・{n}</p>)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ③ 変化のハイライト */}
              <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm space-y-3">
                <div>
                  <p className="text-sm font-bold text-purple-500 flex items-center gap-1.5">
                    <img src="/images/icon-sparkle.png" alt="" className="w-6 h-6 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> 変化のハイライト
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.5 pl-6">小さな変化が、ちゃんと積み重なっています</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-2.5 border-b border-stone-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0"><img src="/images/icon-write.png" alt="" className="w-[22px] h-[22px] object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /></div>
                      <span className="text-sm text-stone-600">書き出せた回数</span>
                    </div>
                    <span className="text-lg font-bold text-purple-500 whitespace-nowrap">0 → {cogCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-stone-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0"><img src="/images/icon-heart.png" alt="" className="w-[22px] h-[22px] object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /></div>
                      <span className="text-sm text-stone-600">試してみた回数</span>
                    </div>
                    <span className="text-lg font-bold text-purple-500 whitespace-nowrap">0 → {actionCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden flex-shrink-0"><img src="/images/icon-calendar.png" alt="" className="w-[22px] h-[22px] object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /></div>
                      <span className="text-sm text-stone-600">向き合った日</span>
                    </div>
                    <span className="text-lg font-bold text-purple-500 whitespace-nowrap">{doneLogs.length} <span className="text-sm font-normal text-stone-400">日</span></span>
                  </div>
                </div>
              </div>

              {/* ④ ここまでの道のり */}
              {footprintData && footprintData.timeline.length > 0 && (
                <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm space-y-4">
                  <p className="text-sm font-bold text-purple-500 flex items-center gap-1.5">
                    <img src="/images/icon-path.png" alt="" className="w-6 h-6 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> ここまでの道のり
                  </p>
                  <div className="space-y-0">
                    {footprintData.timeline.map((t, i) => (
                      <div key={t.day} className="flex gap-3 items-start">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            <img src="/images/icon-day.png" alt="" className="w-[22px] h-[22px] object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                          {i < footprintData.timeline.length - 1 && (
                            <div className="w-px h-8 border-l-2 border-dashed border-purple-100 my-1" />
                          )}
                        </div>
                        <div className="pb-4 pt-1">
                          <span className="text-xs font-bold text-purple-400">Day {t.day}</span>
                          <p className="text-sm text-stone-700 mt-0.5">{t.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ⑤ 次の一歩 */}
              {footprintData && (
                <div className="border-t border-stone-100 pt-4 pb-2 text-center space-y-1">
                  <p className="text-sm text-stone-600 leading-relaxed">{footprintData.next}</p>
                  <span className="text-purple-400 text-sm">🌿</span>
                </div>
              )}

              {/* データなし */}
              {doneLogs.length === 0 && (
                <div className="bg-white rounded-3xl p-6 border border-stone-100 text-center space-y-2">
                  <p className="text-stone-400 text-sm">まだ記録がありません。</p>
                  <p className="text-stone-300 text-xs">最初の一歩を踏み出してみましょう。</p>
                </div>
              )}
            </div>
          );
        })()}

        {tab === 'report' && (() => {
          const reportContent = REPORT_CONTENT[typeId];
          const report = generatedPlan?.report;
          const missions = generatedPlan?.missions ?? [];
          const logsByDay = new Map(logs.filter(l => l.done).map(l => [l.mission_id, l]));
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
              <div className="text-center space-y-1 pt-1">
                <h2 className="text-xl font-bold text-stone-900">あなたについて</h2>
                <p className="text-xs text-stone-400">現在の心の形と、これからの道のり</p>
              </div>

              <div className="bg-purple-50 rounded-3xl p-5 shadow-sm space-y-2">
                <p className="text-xs text-purple-400 font-medium">この分析について</p>
                <p className="text-sm text-stone-700 leading-relaxed">CBT（認知行動療法）とACTの考え方をもとに、あなたが「どんな場面でしんどくなりやすいか」「その時どう対処しがちか」を2つの軸で整理しています。スコアに良い悪いはなく、あなたのパターンを知ることが出発点です。</p>
              </div>

              {fearScores && (
                <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm space-y-3">
                  <p className="text-xs text-stone-400 font-medium">恐れの4軸</p>
                  <div className="rounded-2xl" style={{ background: 'radial-gradient(circle at 50% 45%, #f3effe 0%, #ffffff 70%)' }}>
                    <RadarChartComponent fearScores={fearScores} />
                  </div>
                  <button
                    onClick={() => setFearAxisOpen(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-purple-500 transition-colors mt-1"
                  >
                    <span className={`transition-transform ${fearAxisOpen ? 'rotate-90' : ''}`}>▶</span>
                    各軸の意味を見る
                  </button>
                  {fearAxisOpen && (
                    <div className="space-y-3 pt-1 border-t border-stone-100">
                      {FEAR_AXIS_DESC.map(f => (
                        <div key={f.axis} className="space-y-0.5">
                          <p className="text-xs font-bold text-stone-600">{f.label}</p>
                          <p className="text-xs text-stone-400 leading-relaxed">{f.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {defenseScores && (
                <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm space-y-4">
                  <p className="text-xs text-stone-400 font-medium">防衛スタイル</p>
                  <DefenseBarChart defenseScores={defenseScores} />
                  <button
                    onClick={() => setDefenseAxisOpen(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-purple-500 transition-colors"
                  >
                    <span className={`transition-transform ${defenseAxisOpen ? 'rotate-90' : ''}`}>▶</span>
                    各軸の見方を見る
                  </button>
                  {defenseAxisOpen && (
                    <div className="space-y-3 pt-1 border-t border-stone-100">
                      {DEFENSE_AXIS_DESC.map(d => (
                        <div key={d.axis} className="space-y-0.5">
                          <p className="text-xs font-bold text-stone-600">{d.label}</p>
                          <p className="text-xs text-stone-400 leading-relaxed">{d.desc}</p>
                        </div>
                      ))}
                    </div>
                  )}
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
                  <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm space-y-3">
                    <p className="text-xs text-purple-400 font-medium">いまのあなたについて</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{report.currentState}</p>
                  </div>
                  <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm space-y-3">
                    <p className="text-xs text-stone-400 font-medium">あなたが消耗しやすい場面</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{report.drainScene}</p>
                  </div>
                  <div className="rounded-3xl p-6 space-y-3 shadow-sm border border-purple-100" style={{ background: 'linear-gradient(135deg, #f5f1fe 0%, #ede7fb 100%)' }}>
                    <p className="text-sm font-bold text-purple-600 flex items-center gap-2">💜 その力は、本来こういうもの</p>
                    <p className="text-sm leading-relaxed text-stone-700">{report.strengthReframe}</p>
                  </div>
                </>) : reportContent ? (<>
                  <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm space-y-3">
                    <p className="text-xs text-purple-400 font-medium">あなたが消耗しやすい場面</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{reportContent.drainScene}</p>
                  </div>
                  <div className="rounded-3xl p-6 space-y-3 shadow-sm border border-purple-100" style={{ background: 'linear-gradient(135deg, #f5f1fe 0%, #ede7fb 100%)' }}>
                    <p className="text-sm font-bold text-purple-600 flex items-center gap-2">💜 その力は、本来こういうもの</p>
                    <p className="text-sm leading-relaxed text-stone-700">{reportContent.strengthReframe}</p>
                  </div>
                </>) : (
                  <div className="bg-white rounded-3xl p-5 border border-stone-100">
                    <p className="text-xs text-stone-400">準備中です。</p>
                  </div>
                )
              )}

              {/* ── 今後のプログラム ── */}
              {reportSubtab === 'program' && (<>
                {/* ── プログラム設計の思想カルーセル ── */}
                {(() => {
                  const slides = [
                    {
                      label: 'あなた専用の設計です',
                      body: '不安や緊張が起きやすい場面は人によって違います。「評価されることが怖い人」と「関係が壊れることが怖い人」では、効くトレーニングも変わります。このプログラムは、診断であなたの恐れのパターンを分析し、そこに特化したアプローチだけを選んで組み合わせています。だから、同じアプリを使っていても、人によってまったく違うプログラムになります。',
                    },
                    {
                      label: '認知と行動、両方から崩す',
                      body: '不安には「頭の中の解釈（認知）」と「実際の行動（行動）」の2つが絡み合っています。認知のミッションでは、自分がどんなパターンで考えがちかに気づき、別の見方を試します。行動のミッションでは、実際に小さな行動を試してみて「思ってたほど怖くなかった」を体験します。どちらか一方ではなく、両方を繰り返すことで少しずつパターンが崩れていきます。',
                    },
                    {
                      label: '小さく始めて、少しずつ本番に近づく',
                      body: '最初のミッションは、あえてハードルを低く設定しています。失敗しても何も起きない安全な場面で「やってみたら意外と大丈夫だった」を積み重ねることが目的です。Lvが上がるにつれて、少しずつ現実の場面に近い状況へ移っていきます。いきなり難しい場面に飛び込まず、成功体験を土台にして進むのがこのプログラムの進め方です。',
                    },
                  ];
                  const cur = slides[philosophySlide];
                  return (
                    <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-stone-400 font-medium">このプログラムについて</p>
                        <div className="flex gap-1">
                          {slides.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setPhilosophySlide(i)}
                              className={`w-1.5 h-1.5 rounded-full transition-colors ${i === philosophySlide ? 'bg-purple-500' : 'bg-stone-200'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-stone-800 mb-2">{cur.label}</p>
                        <p className="text-sm text-stone-600 leading-relaxed">{cur.body}</p>
                      </div>
                      <div className="flex justify-between">
                        <button
                          onClick={() => setPhilosophySlide(v => Math.max(0, v - 1))}
                          disabled={philosophySlide === 0}
                          className="text-xs text-stone-400 disabled:opacity-30 px-2 py-1"
                        >
                          ← 前へ
                        </button>
                        <button
                          onClick={() => setPhilosophySlide(v => Math.min(slides.length - 1, v + 1))}
                          disabled={philosophySlide === slides.length - 1}
                          className="text-xs text-stone-400 disabled:opacity-30 px-2 py-1"
                        >
                          次へ →
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {report?.direction && (
                  <div className="bg-purple-50 rounded-3xl p-5 shadow-sm space-y-2">
                    <p className="text-xs text-purple-400 font-medium">これから30日でやること</p>
                    <p className="text-sm text-stone-700 leading-relaxed">{report.direction}</p>
                  </div>
                )}

                {weeks.length ? (
                  <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm space-y-5">
                    <p className="text-sm font-bold text-stone-800">30日間の道のり</p>
                    {weeks.map((wk, wi) => (
                    <div key={wi} className="space-y-2">
                      <p className="text-xs text-purple-400 font-medium pl-1">{wk.label}</p>
                      <div className="space-y-0">
                        {(() => {
                          // 連続する同タイトルのミッションをグルーピング
                          type GroupedMission = { dayLabel: string; days: number[]; title: string; why: string; componentId: string; kind: string; lv: number };
                          const grouped: GroupedMission[] = [];
                          wk.days.forEach(m => {
                            const last = grouped[grouped.length - 1];
                            if (last && last.title === m.title) {
                              last.days.push(m.day);
                              last.dayLabel = `Day ${last.days[0]}〜${m.day}`;
                            } else {
                              grouped.push({ dayLabel: `Day ${m.day}`, days: [m.day], title: m.title, why: m.why, componentId: m.componentId, kind: m.kind, lv: m.lv });
                            }
                          });
                          return grouped.map((g, gi) => {
                            const isToday = g.days.includes(dayCount);
                            const comp = PROGRAM_COMPONENTS[g.componentId as keyof typeof PROGRAM_COMPONENTS];
                            const fearLabel = comp ? FEAR_AXIS_LABEL[comp.fearAxis] : null;
                            // このグループ内で取り組み済みの日（記録あり）を探す
                            const loggedDay = g.days.find(d => logsByDay.has(d));
                            const log = loggedDay != null ? logsByDay.get(loggedDay) : null;
                            const isOpen = loggedDay != null && expandedReview === loggedDay;
                            // ステータス判定：完了 / 現在 / 未来
                            const lastDay = g.days[g.days.length - 1];
                            const isDone = !isToday && (loggedDay != null || lastDay < dayCount);
                            const isFuture = !isToday && !isDone;
                            const isLast = gi === grouped.length - 1;
                            return (
                              <div key={g.dayLabel} className="flex gap-3">
                                {/* タイムラインの軸（バッジ＋縦線） */}
                                <div className="flex flex-col items-center flex-shrink-0">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm ${isToday ? 'bg-purple-500 text-white' : isDone ? 'bg-purple-500 text-white' : 'bg-stone-100 text-stone-300'}`}>
                                    {isToday ? '🚶' : isDone ? '✓' : '🔒'}
                                  </div>
                                  {!isLast && <div className={`w-0.5 flex-1 min-h-[16px] ${isDone ? 'bg-purple-200' : 'bg-stone-100'}`} />}
                                </div>
                                {/* カード本体 */}
                                <div className={`flex-1 min-w-0 mb-3 rounded-2xl p-3 space-y-2 ${isToday ? 'bg-purple-50 ring-1 ring-purple-200' : ''}`}>
                                  <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold leading-tight ${isToday ? 'bg-purple-500 text-white' : isFuture ? 'bg-stone-100 text-stone-400' : 'bg-stone-100 text-stone-500'}`}>
                                        {g.dayLabel}
                                      </span>
                                      {isToday && <span className="text-[10px] font-bold text-purple-500">(現在)</span>}
                                    </div>
                                    <p className={`text-sm font-medium leading-snug ${isFuture ? 'text-stone-400' : 'text-stone-800'}`}>{g.title}</p>
                                    {g.why && <p className={`text-xs leading-relaxed ${isFuture ? 'text-stone-300' : 'text-stone-400'}`}>{g.why}</p>}
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {fearLabel && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-500">{fearLabel}</span>}
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-500">{g.kind === 'action' ? '行動' : '認知'}</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-500">Lv {g.lv}</span>
                                  </div>
                                  {log && (
                                    <div>
                                      <button
                                        onClick={() => setExpandedReview(isOpen ? null : loggedDay!)}
                                        className="flex items-center gap-1 text-[11px] font-bold text-purple-500 hover:text-purple-600"
                                      >
                                        <span className={`transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                                        振り返る
                                      </button>
                                      {isOpen && (
                                        <div className="mt-2 space-y-2">
                                          {log.memo ? (
                                            <div className="bg-purple-50 rounded-2xl p-3">
                                              <p className="text-[11px] text-purple-500 font-bold mb-1">得られた気づき</p>
                                              <p className="text-sm text-stone-700 leading-relaxed">{log.memo}</p>
                                            </div>
                                          ) : (
                                            <p className="text-xs text-stone-400">この日はメモがありません。</p>
                                          )}
                                          {(log.before_score > 0 || log.after_score > 0) && (
                                            <div className="flex gap-4 text-xs text-stone-500">
                                              <span>前：<span className="font-bold text-stone-600">{log.before_score}</span></span>
                                              <span>後：<span className="font-bold text-teal-600">{log.after_score}</span></span>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    ))}
                  </div>
                ) : reportContent ? (<>
                  <div className="bg-white rounded-3xl p-5 border border-stone-100 shadow-sm space-y-4">
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
                  <div className="bg-purple-50 rounded-3xl p-5 shadow-sm space-y-2">
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
                      value={profileData.paid_plan === 'premium' ? 'プレミアムプラン' : profileData.paid_plan === 'standard' ? 'スタンダードプラン' : profileData.paid_plan === 'light' ? 'ライトプラン' : profileData.paid_plan}
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
          { key: 'home', label: 'ホーム' },
          { key: 'mission', label: '今日の一歩' },
          { key: 'review', label: '足あと' },
          { key: 'report', label: '自分の地図' },
          { key: 'profile', label: 'プロフィール' },
        ] as { key: Tab; label: string }[]).map(item => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex flex-col items-center gap-1 w-14 transition-colors ${active ? 'text-purple-500' : 'text-stone-400'}`}
            >
              <span className="relative flex items-center justify-center w-7 h-7">
                <img
                  src={`/icons/${item.key}.png`}
                  alt={item.label}
                  className={`w-full h-full object-contain transition-opacity ${active ? 'opacity-0' : 'opacity-100'}`}
                />
                <img
                  src={`/icons/${item.key}-active.png`}
                  alt=""
                  aria-hidden
                  className={`absolute w-full h-full object-contain transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}
                />
              </span>
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
