import { createAdminClient } from "./supabase/server";

export const CREDIT_COSTS = {
  text: 1,
  code: 2,
  image: 5,
  video: 20,
  chat: 1,
} as const;

export type GenerationType = keyof typeof CREDIT_COSTS;

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

  return { success: true, remaining: data as number };
}

export async function checkAndDeductAmount(
  userId: string,
  amount: number
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

  return { success: true, remaining: data as number };
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
