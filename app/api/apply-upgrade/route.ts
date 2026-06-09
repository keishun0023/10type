import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseServer } from '@/lib/supabase-server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

// 既存ユーザーのプラン変更を反映する。
// Stripeセッションの決済完了を検証してから users.paid_plan を更新する。
export async function POST(req: NextRequest) {
  try {
    const { sessionId, userId } = await req.json();
    if (!sessionId || !userId) {
      return NextResponse.json({ error: 'sessionId and userId required' }, { status: 400 });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe key not configured' }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'payment not completed' }, { status: 400 });
    }
    const plan = session.metadata?.plan;
    if (!plan) return NextResponse.json({ error: 'plan not found in session' }, { status: 400 });

    const sb = getSupabaseServer();
    if (!sb) return NextResponse.json({ error: 'server config error' }, { status: 500 });

    const { error } = await sb
      .from('users')
      .update({ paid_plan: plan, paid_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, plan });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
