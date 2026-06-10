import { getSupabase } from '@/lib/supabase';
import { FearAxis, DefenseAxis } from '@/data/questions';
import { DiagType } from '@/data/types';

export type DiagnosticRecord = {
  sessionId: string;
  deviceId: string;
  firstType: DiagType;
  secondType: DiagType;
  fearScores: Record<FearAxis, number>;
  defenseScores: Record<DefenseAxis, number>;
  distressTotal: number;
  answers: Record<string, number>;
  feedbackRating: number | null;
  retypeSelectedName: string | null;
  retypeSelectedNone: boolean;
};

export async function saveDiagnostic(record: DiagnosticRecord): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('diagnostics').insert({
    session_id: record.sessionId,
    device_id: record.deviceId,
    created_at: new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tokyo' }).replace(' ', 'T') + '+09:00',
    first_type_name: record.firstType.name,
    second_type_name: record.secondType.name,
    fear_scores: record.fearScores,
    defense_scores: record.defenseScores,
    distress_total: record.distressTotal,
    answers: record.answers,
    feedback_rating: record.feedbackRating,
    retype_selected_name: record.retypeSelectedName,
    retype_selected_none: record.retypeSelectedNone,
  });
  if (error) console.warn('[analytics] saveDiagnostic failed:', error.message);
}

export async function updateDiagnosticFeedback(
  sessionId: string,
  feedbackRating: number | null,
  retypeSelectedName: string | null,
  retypeSelectedNone: boolean
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error, count } = await sb
    .from('diagnostics')
    .update({
      feedback_rating: feedbackRating,
      retype_selected_name: retypeSelectedName,
      retype_selected_none: retypeSelectedNone,
    }, { count: 'exact' })
    .eq('session_id', sessionId);
  if (error) console.warn('[analytics] updateDiagnosticFeedback failed:', error.message);
  else console.log('[analytics] updateDiagnosticFeedback updated rows:', count, 'session_id:', sessionId);
}

// オンボーディング回答を diagnostics に保存（課金前のAI生成を廃止したため、ここで直接保存する）
export async function updateDiagnosticOnboarding(
  sessionId: string,
  onboarding: Record<string, string>
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb
    .from('diagnostics')
    .update({ onboarding })
    .eq('session_id', sessionId);
  if (error) console.warn('[analytics] updateDiagnosticOnboarding failed:', error.message);
}
