import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = createAdminClient();
  const { data: transactions } = await admin
    .from("credit_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ transactions: transactions ?? [] });
}
