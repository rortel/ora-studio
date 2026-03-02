import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// GET campaigns
export async function GET() {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("campaigns")
    .select("*, brand_vaults(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });

  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
}

// POST: create campaign + generate assets
export async function POST(request: Request) {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { vault_id, name, brief, product_url, asset_types } = await request.json() as {
    vault_id: string;
    name: string;
    brief: string;
    product_url?: string;
    asset_types: string[]; // ["image", "text", "video"]
  };

  const admin = createAdminClient();

  // Fetch vault guidelines
  const { data: vault, error: vaultError } = await admin
    .from("brand_vaults")
    .select("*")
    .eq("id", vault_id)
    .eq("user_id", user.id)
    .single();

  if (vaultError || !vault) {
    return new Response(JSON.stringify({ error: "Vault introuvable" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch product page if URL provided
  let productContent = "";
  if (product_url) {
    try {
      const res = await fetch(product_url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; OraStudio/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const html = await res.text();
        productContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000);
      }
    } catch { /* ignore */ }
  }

  const guidelines = vault.guidelines ?? {};
  const guidelinesStr = JSON.stringify(guidelines, null, 2);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Generate text assets compliant with brand
  const assets: Array<{ type: string; content: string; prompt?: string }> = [];

  if (asset_types.includes("text")) {
    const textResponse = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Tu es un rédacteur expert pour la marque "${vault.brand_name ?? vault.name}".

DIRECTIVES DE MARQUE:
${guidelinesStr}

BRIEF DE CAMPAGNE: ${brief}

${productContent ? `CONTENU PRODUIT:\n${productContent}` : ""}

Génère les assets texte suivants, strictement conformes à la charte éditoriale:

1. POST LINKEDIN (max 1300 caractères)
2. EMAIL MARKETING (objet + corps)
3. DESCRIPTION PRODUIT (50-100 mots)
4. ACCROCHES PUBLICITAIRES (3 variantes courtes)

Format de réponse:
## Post LinkedIn
[contenu]

## Email Marketing
Objet: [objet]
Corps: [corps]

## Description Produit
[contenu]

## Accroches Publicitaires
1. [accroche 1]
2. [accroche 2]
3. [accroche 3]`,
        },
      ],
    });

    const textContent = textResponse.content[0].type === "text" ? textResponse.content[0].text : "";
    assets.push({ type: "text", content: textContent });
  }

  if (asset_types.includes("image_prompt")) {
    // Generate optimized image prompts based on brand guidelines
    const imgResponse = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `Génère 3 prompts d'image optimisés pour la campagne suivante.
Marque: ${vault.brand_name ?? vault.name}
Style visuel: ${guidelines.visual?.style ?? "professionnel"}
Brief: ${brief}
${productContent ? `Produit: ${productContent.slice(0, 500)}` : ""}

Les prompts doivent respecter:
- Couleurs: ${(guidelines.visual?.primary_colors ?? []).join(", ") || "palette marque"}
- Style: ${guidelines.visual?.imagery_style ?? guidelines.visual?.style ?? "professionnel"}
- À éviter: ${(guidelines.visual?.avoid ?? []).join(", ") || "rien de particulier"}

Retourne 3 prompts numérotés en anglais, détaillés, prêts pour FLUX/DALL-E.`,
        },
      ],
    });

    const imgContent = imgResponse.content[0].type === "text" ? imgResponse.content[0].text : "";
    assets.push({ type: "image_prompts", content: imgContent });
  }

  if (asset_types.includes("video_prompt")) {
    const vidResponse = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Génère 2 prompts vidéo pour une campagne.
Marque: ${vault.brand_name ?? vault.name}
Style: ${guidelines.visual?.video_style ?? guidelines.visual?.style ?? "cinématique, professionnel"}
Brief: ${brief}

Les prompts doivent être en anglais, très détaillés (scène, mouvement de caméra, ambiance, lumière).`,
        },
      ],
    });

    const vidContent = vidResponse.content[0].type === "text" ? vidResponse.content[0].text : "";
    assets.push({ type: "video_prompts", content: vidContent });
  }

  // Save campaign
  const { data: campaign, error: campaignError } = await admin
    .from("campaigns")
    .insert({
      user_id: user.id,
      vault_id,
      name,
      brief,
      product_url: product_url ?? null,
      assets,
      status: "draft",
    })
    .select()
    .single();

  if (campaignError) {
    return new Response(JSON.stringify({ error: campaignError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(campaign), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
