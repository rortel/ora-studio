import { createAdminClient } from "./supabase/server";

export const CREDIT_COSTS = {
  text: 1,
  compare: 3,
  code: 2,
  image: 4,
  audio: 4,
  video: 100,
  chat: 1,
} as const;

export const CREDIT_PACKS = [
  { id: "pack_1000", credits: 1000, price_eur: 10, label: "1 000 crédits" },
  { id: "pack_5000", credits: 5000, price_eur: 45, label: "5 000 crédits" },
  { id: "pack_20000", credits: 20000, price_eur: 160, label: "20 000 crédits" },
] as const;

export type GenerationType = keyof typeof CREDIT_COSTS;

async function logTransaction(
  userId: string,
  amount: number,
  type: string,
  description: string,
  stripePaymentId?: string | null
) {
  try {
    const admin = createAdminClient();
    await admin.from("credit_transactions").insert({
      user_id: userId,
      amount,
      type,
      description,
      stripe_payment_id: stripePaymentId ?? null,
    });
  } catch { /* non-blocking */ }
}

export async function checkAndDeductCredits(
  userId: string,
  type: GenerationType
): Promise<{ success: boolean; remaining: number; error?: string }> {
  const admin = createAdminClient();
  const cost = CREDIT_COSTS[type];

  const { data, error } = await admin.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: cost,
  });

  if (error) {
    if (error.message.includes("Insufficient credits")) {
      return { success: false, remaining: 0, error: "Crédits insuffisants" };
    }
    return { success: false, remaining: 0, error: error.message };
  }

  await logTransaction(userId, -cost, "usage", `Génération ${type}`);

  return { success: true, remaining: data as number };
}

export async function checkAndDeductAmount(
  userId: string,
  amount: number,
  description?: string
): Promise<{ success: boolean; remaining: number; error?: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) {
    if (error.message.includes("Insufficient credits")) {
      return { success: false, remaining: 0, error: "Crédits insuffisants" };
    }
    return { success: false, remaining: 0, error: error.message };
  }

  await logTransaction(userId, -amount, "usage", description ?? `Déduction ${amount} crédits`);

  return { success: true, remaining: data as number };
}

export async function addCredits(
  userId: string,
  amount: number,
  type: "trial" | "subscription" | "purchase" | "product_add",
  description: string,
  stripePaymentId?: string
): Promise<{ success: boolean; credits: number; error?: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("add_credits", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) return { success: false, credits: 0, error: error.message };

  await logTransaction(userId, amount, type, description, stripePaymentId);

  return { success: true, credits: data as number };
}

export async function getCredits(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();
  return data?.credits ?? 0;
}

export async function getProfile(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("credits, plan, role, stripe_customer_id, stripe_subscription_id, onboarding_completed")
    .eq("id", userId)
    .single();
  return data;
}

export async function saveGeneration(
  userId: string,
  type: GenerationType,
  prompt: string,
  result: string,
  model: string
) {
  const admin = createAdminClient();
  await admin.from("generations").insert({
    user_id: userId,
    type,
    prompt,
    result,
    model,
    credits_used: CREDIT_COSTS[type],
    status: "completed",
  });
}
