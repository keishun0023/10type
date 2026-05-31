import { getSupabase } from '@/lib/supabase';
import { Axis } from '@/data/questions';
import { RootType } from '@/data/types';

export type SavedResult = {
  sessionId: string;
  deviceId: string;
  firstType: RootType;
  secondType: RootType;
  axisScores: Record<Axis, number>;
  distressTotal: number;
  answers: Record<string, number>;
};

export async function saveResult(data: SavedResult): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('diagnostics').insert({
    session_id: data.sessionId,
    device_id: data.deviceId,
    first_type_name: data.firstType.name,
    second_type_name: data.secondType.name,
    axis_scores: data.axisScores,
    distress_total: data.distressTotal,
    answers: data.answers,
  });
  if (error) console.warn('[analytics] saveResult failed:', error.message);
}

export async function saveFeedbackRating(sessionId: string, rating: number): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb
    .from('diagnostics')
    .update({ feedback_rating: rating })
    .eq('session_id', sessionId)
    .select('id');
  if (error) console.warn('[analytics] saveFeedbackRating failed:', error.message);
  else if (!data?.length) console.warn('[analytics] saveFeedbackRating: 0 rows updated — RLS with check missing?');
}

export async function saveRetypeSelection(
  sessionId: string,
  selectedTypeId: string | null
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb
    .from('diagnostics')
    .update({
      retype_selected_name: selectedTypeId,
      retype_selected_none: selectedTypeId === null,
    })
    .eq('session_id', sessionId)
    .select('id');
  if (error) console.warn('[analytics] saveRetypeSelection failed:', error.message);
  else if (!data?.length) console.warn('[analytics] saveRetypeSelection: 0 rows updated — RLS with check missing?');
}
