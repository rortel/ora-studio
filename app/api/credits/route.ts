import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { CREDIT_COSTS } from "@/lib/credits";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("credits, plan, stripe_customer_id, stripe_subscription_id")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      credits: profile?.credits ?? 0,
      plan: profile?.plan ?? "trial",
      stripe_customer_id: profile?.stripe_customer_id,
      stripe_subscription_id: profile?.stripe_subscription_id,
      costs: CREDIT_COSTS,
    });
  } catch (err) {
    console.error("[credits/get]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
