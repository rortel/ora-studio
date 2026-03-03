import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}

// Keep named export for backward compat — resolved lazily
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

export const STRIPE_PLANS = {
  generate: {
    priceId: process.env.STRIPE_GENERATE_PRICE_ID ?? "price_generate",
    name: "Generate",
    credits_onboarding: 200,
    monthly_credits: 0,
    amount_eur: 19,
  },
  studio: {
    priceId: process.env.STRIPE_STUDIO_PRICE_ID ?? "price_studio",
    name: "Studio",
    credits_onboarding: 500,
    monthly_credits: 500,
    amount_eur: 49,
  },
} as const;

export const STRIPE_CREDIT_PACKS = {
  pack_1000: {
    priceId: process.env.STRIPE_PACK_1000_PRICE_ID ?? "price_pack_1000",
    credits: 1000,
    amount_eur: 10,
    label: "1 000 crédits",
  },
  pack_5000: {
    priceId: process.env.STRIPE_PACK_5000_PRICE_ID ?? "price_pack_5000",
    credits: 5000,
    amount_eur: 45,
    label: "5 000 crédits",
  },
  pack_20000: {
    priceId: process.env.STRIPE_PACK_20000_PRICE_ID ?? "price_pack_20000",
    credits: 20000,
    amount_eur: 160,
    label: "20 000 crédits",
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;
export type PackKey = keyof typeof STRIPE_CREDIT_PACKS;
