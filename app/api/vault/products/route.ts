import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { checkAndDeductAmount } from "@/lib/credits";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const vaultId = req.nextUrl.searchParams.get("vault_id");
  if (!vaultId) return NextResponse.json({ error: "vault_id requis" }, { status: 400 });

  const admin = createAdminClient();
  const { data: products } = await admin
    .from("brand_products")
    .select("*")
    .eq("vault_id", vaultId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ products: products ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { vault_id, name, description, benefits, objections, is_primary } = body;

  const admin = createAdminClient();

  // Check existing products count
  const { data: existing } = await admin
    .from("brand_products")
    .select("id")
    .eq("vault_id", vault_id)
    .eq("user_id", user.id);

  const hasProducts = (existing?.length ?? 0) > 0;

  // Deduct 500 credits for additional products
  if (hasProducts) {
    const result = await checkAndDeductAmount(user.id, 500, `Produit supplémentaire: ${name}`);
    if (!result.success) {
      return NextResponse.json({ error: "Crédits insuffisants (500 cr requis)" }, { status: 402 });
    }
  }

  const { data: product, error } = await admin
    .from("brand_products")
    .insert({
      vault_id,
      user_id: user.id,
      name,
      description: description ?? "",
      benefits: benefits ?? [],
      objections: objections ?? [],
      is_primary: !hasProducts,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ product });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from("brand_products").delete().eq("id", id).eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
