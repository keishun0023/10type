import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' });

const PLANS = {
  light: {
    name: 'ライトプラン（1ヶ月）',
    description: '詳細レポート＋個別プランを見る（1ヶ月アクセス）',
    amount: 980,
  },
  standard: {
    name: 'スタンダードプラン（3ヶ月）',
    description: 'AIと一緒に進める（AI対話＋ヒント＋足あと＋変化FB／3ヶ月アクセス）',
    amount: 3980,
  },
  premium: {
    name: 'プレミアムプラン（半年）',
    description: 'とことん向き合う（いつでもAI相談＋月次総括／半年アクセス）',
    amount: 8980,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { plan, email, typeId, onboarding, session: diagSession, upgrade } = await req.json();

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
      ...(email ? { customer_email: email } : {}),
      // Stripe metadata は1値あたり500文字上限。長文の自由記述（difficultFreeText/difficultDetail）は
      // ここには載せない（フルの onboarding は diagnostics テーブルに保存済みで、register-user はそこから読む）。
      metadata: {
        plan,
        typeId,
        onboarding: JSON.stringify((() => {
          const { difficultFreeText: _ft, difficultDetail: _dd, ...slim } = onboarding ?? {};
          return slim;
        })()),
        session: diagSession || '',
      },
      // アップグレード（既存ユーザーのプラン変更）は登録画面を通さず専用ページへ
      success_url: upgrade
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/program/upgrade-success?session_id={CHECKOUT_SESSION_ID}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/program/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/program/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
