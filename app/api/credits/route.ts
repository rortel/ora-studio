import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCredits, CREDIT_COSTS } from "@/lib/credits";

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const credits = await getCredits(user.id);
    return NextResponse.json({ credits, costs: CREDIT_COSTS });
  } catch (err) {
    console.error("[credits/get]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
