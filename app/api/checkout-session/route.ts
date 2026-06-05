import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) return NextResponse.json({ error: 'No session_id' }, { status: 400 });

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return NextResponse.json({
    email: session.customer_email,
    plan: session.metadata?.plan,
    typeId: session.metadata?.typeId,
    onboarding: JSON.parse(session.metadata?.onboarding || '{}'),
    diagSession: session.metadata?.session || '',
  });
}
