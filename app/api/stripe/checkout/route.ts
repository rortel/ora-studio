import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, STRIPE_PLANS, STRIPE_CREDIT_PACKS } from "@/lib/stripe";
import type { PlanKey, PackKey } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { type, planKey, packKey } = await req.json() as {
    type: "subscription" | "pack";
    planKey?: PlanKey;
    packKey?: PackKey;
  };

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
    await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (type === "subscription" && planKey) {
    const plan = STRIPE_PLANS[planKey];
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: `${appUrl}/studio?upgraded=1`,
      cancel_url: `${appUrl}/studio/credits`,
      metadata: {
        supabase_user_id: user.id,
        plan: planKey,
        credits_onboarding: String(plan.credits_onboarding),
      },
    });
    return NextResponse.json({ url: session.url });
  }

  if (type === "pack" && packKey) {
    const pack = STRIPE_CREDIT_PACKS[packKey];
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price: pack.priceId, quantity: 1 }],
      success_url: `${appUrl}/studio/credits?purchased=1`,
      cancel_url: `${appUrl}/studio/credits`,
      metadata: {
        supabase_user_id: user.id,
        pack: packKey,
        credits: String(pack.credits),
      },
    });
    return NextResponse.json({ url: session.url });
  }

  return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
}
