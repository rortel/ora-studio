import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Paiement bientôt disponible — Stripe non configuré." },
      { status: 503 }
    );
  }

  const { createClient } = await import("@/lib/supabase/server");
  const { stripe, STRIPE_PLANS, STRIPE_CREDIT_PACKS } = await import("@/lib/stripe");
  const { createAdminClient } = await import("@/lib/supabase/server");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { type, planKey, packKey } = await req.json();

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (type === "subscription" && planKey) {
    const plan = STRIPE_PLANS[planKey as keyof typeof STRIPE_PLANS];
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${appUrl}/studio?upgraded=1`,
      cancel_url: `${appUrl}/studio/credits`,
      metadata: { supabase_user_id: user.id, plan: planKey, credits_onboarding: String(plan.credits_onboarding) },
    });
    return NextResponse.json({ url: session.url });
  }

  if (type === "pack" && packKey) {
    const pack = STRIPE_CREDIT_PACKS[packKey as keyof typeof STRIPE_CREDIT_PACKS];
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: pack.priceId, quantity: 1 }],
      success_url: `${appUrl}/studio/credits?purchased=1`,
      cancel_url: `${appUrl}/studio/credits`,
      metadata: { supabase_user_id: user.id, pack: packKey, credits: String(pack.credits) },
    });
    return NextResponse.json({ url: session.url });
  }

  return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
}
