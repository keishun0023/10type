import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

const PLANS = {
  light: {
    name: 'ライトプラン',
    description: 'プログラム閲覧＋記録機能',
    amount: 1980,
  },
  standard: {
    name: 'スタンダードプラン',
    description: '毎日のミッション提示＋変化の可視化',
    amount: 2980,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { plan, email, typeId, onboarding } = await req.json();

    const planData = PLANS[plan as keyof typeof PLANS];
    if (!planData) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe key not configured' }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: { name: planData.name, description: planData.description },
          unit_amount: planData.amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: email,
      metadata: { plan, typeId, onboarding: JSON.stringify(onboarding) },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/program/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/program`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
