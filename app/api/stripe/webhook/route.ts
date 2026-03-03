import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { STRIPE_PLANS, STRIPE_CREDIT_PACKS } from "@/lib/stripe";
import { addCredits } from "@/lib/credits";
import { createAdminClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId) break;

      if (session.mode === "subscription") {
        const planKey = session.metadata?.plan as keyof typeof STRIPE_PLANS;
        const plan = STRIPE_PLANS[planKey];
        const creditsOnboarding = Number(session.metadata?.credits_onboarding ?? 0);
        const subscriptionId = session.subscription as string;

        await admin.from("profiles").update({
          plan: planKey,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        }).eq("id", userId);

        if (creditsOnboarding > 0) {
          await addCredits(userId, creditsOnboarding, "subscription",
            `Crédits offerts — ${plan.name}`, subscriptionId);
        }
      }

      if (session.mode === "payment") {
        const packKey = session.metadata?.pack as keyof typeof STRIPE_CREDIT_PACKS;
        const credits = Number(session.metadata?.credits ?? 0);
        const pack = STRIPE_CREDIT_PACKS[packKey];

        if (credits > 0) {
          await addCredits(userId, credits, "purchase",
            `Achat — ${pack.label}`, session.payment_intent as string);
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("stripe_subscription_id", sub.id)
        .single();

      if (profile) {
        await admin.from("profiles").update({
          plan: "trial",
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        }).eq("id", profile.id);
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
      if (!invoice.subscription) break;

      const { data: profile } = await admin
        .from("profiles")
        .select("id, plan")
        .eq("stripe_subscription_id", invoice.subscription)
        .single();

      if (profile && profile.plan === "studio") {
        await addCredits(profile.id, 500, "subscription",
          "Crédits mensuels Studio", invoice.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
