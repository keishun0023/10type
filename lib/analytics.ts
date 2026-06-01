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
