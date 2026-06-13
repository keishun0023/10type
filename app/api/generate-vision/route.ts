import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { buildVisionPrompt } from '@/lib/prompt';
import { callClaude, parseJSONFromText, isAIConfigured } from '@/lib/ai';
import { FearAxis, FEAR_AXES } from '@/data/questions';
import { ChangeOrientation } from '@/data/program';
import { TYPES } from '@/data/types';

export const maxDuration = 60;

type VisionResult = {
  vision: {
    rootFear: string;
    manifestation: string;
    approach: string;
    future: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const { sessionId, typeId: requestTypeId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });

    if (!isAIConfigured()) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    const sb = getSupabaseServer();
    if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

    const { data: diag, error: dbError } = await sb
      .from('diagnostics')
      .select('fear_scores, defense_scores, onboarding')
      .eq('session_id', sessionId)
      .single();

    if (dbError || !diag) {
      return NextResponse.json({ error: 'diagnostics not found' }, { status: 404 });
    }

    const fearScores = diag.fear_scores as Record<FearAxis, number> | undefined;
    if (!fearScores) {
      return NextResponse.json({ error: 'fear_scores not found' }, { status: 400 });
    }

    const onboarding = (diag.onboarding as Record<string, string>) ?? {};
    const typeId = (requestTypeId as string) || 'distancer';

    // Determine topFear: highest scoring fear axis
    const topFear = FEAR_AXES.reduce<FearAxis>((top, axis) =>
      (fearScores[axis] ?? 0) > (fearScores[top] ?? 0) ? axis : top,
      FEAR_AXES[0],
    );

    // Determine orientation
    const ORIENTATION_MAP: Record<string, ChangeOrientation> = {
      'change': 'change',
      'accept': 'accept',
      '変わりたい・できるようになりたい': 'change',
      '今の自分を受け入れて、楽になりたい': 'accept',
    };
    const orientation: ChangeOrientation = ORIENTATION_MAP[onboarding?.changeOrientation ?? ''] ?? 'unknown';

    const type = TYPES.find(t => t.id === typeId);
    const typeName = type?.name ?? typeId;

    const { system, user } = buildVisionPrompt({
      typeId,
      fearScores,
      topFear,
      orientation,
      difficultScene: onboarding.difficultScene ?? '',
      difficultFreeText: onboarding.difficultFreeText,
      typeName,
    });

    const raw = await callClaude({ system, user, maxTokens: 1500, temperature: 0.7 });
    const result = parseJSONFromText<VisionResult>(raw);

    // Save vision to diagnostics (store in generated_plan JSON alongside existing data)
    const { data: current } = await sb
      .from('diagnostics')
      .select('generated_plan')
      .eq('session_id', sessionId)
      .single();

    const existingPlan = (current?.generated_plan as Record<string, unknown>) ?? {};
    await sb
      .from('diagnostics')
      .update({ generated_plan: { ...existingPlan, vision: result.vision } })
      .eq('session_id', sessionId);

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
