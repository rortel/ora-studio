import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const SCRAPE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

async function scrapeUrl(url: string): Promise<string> {
  const res = await fetch(url, { headers: SCRAPE_HEADERS, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { url, text, vault_id, scene_count = 5 } = await request.json() as {
    url?: string;
    text?: string;
    vault_id?: string;
    scene_count?: number;
  };

  let content = text ?? "";

  if (url && !content) {
    try {
      content = await scrapeUrl(url);
    } catch (err) {
      return new Response(JSON.stringify({ error: `Impossible de charger la page : ${String(err)}` }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  if (!content.trim()) {
    return new Response(JSON.stringify({ error: "Aucun contenu à structurer" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Load brand vault guidelines if provided
  let brandContext = "";
  let vaultName = "";
  let promptColorHint = "";
  let promptStyleHint = "";
  if (vault_id) {
    try {
      const admin = createAdminClient();
      const { data: vault } = await admin
        .from("brand_vaults")
        .select("guidelines, brand_name, name")
        .eq("id", vault_id)
        .single();

      if (vault?.guidelines) {
        vaultName = vault.brand_name ?? vault.name ?? "";
        const g = vault.guidelines as Record<string, unknown>;
        const ed = g.editorial as Record<string, unknown> | undefined;
        const vis = g.visual as Record<string, unknown> | undefined;
        const primaryColors = (vis?.primary_colors as string[] | undefined) ?? [];
        const approvedVocab = (ed?.vocabulary_approved as string[] | undefined) ?? [];
        const keyMessages = (ed?.key_messages as string[] | undefined) ?? [];

        promptColorHint = primaryColors.length > 0 ? ` incluant ${primaryColors[0]}` : "";
        promptStyleHint = vis?.style ? ` (${String(vis.style)})` : "";

        brandContext = `
CHARTE DE MARQUE — ${vaultName}:
- Ton: ${ed?.tone ?? "professionnel"}
- Style visuel: ${vis?.style ?? "moderne"} — ${vis?.imagery_style ?? ""}
- Couleurs: ${primaryColors.join(", ") || "à définir"}
- Vocabulaire approuvé: ${approvedVocab.join(", ") || "aucun défini"}
- Vocabulaire interdit: ${((ed?.vocabulary_forbidden as string[] | undefined) ?? []).join(", ") || "aucun"}
- Messages clés: ${keyMessages.join(" | ") || "aucun"}
- Tagline: ${String(ed?.tagline ?? "")}

Pour chaque scène, les captions DOIVENT utiliser le ton "${ed?.tone ?? "professionnel"}" et le vocabulaire approuvé.
Les prompts visuels DOIVENT intégrer le style "${vis?.style ?? "professionnel"}" et les couleurs ${primaryColors.slice(0, 2).join(" et ") || "de la marque"}.`;
      }
    } catch { /* vault not found, continue without */ }
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `Tu es un expert en stratégie de contenu pour les réseaux sociaux et la communication de marque. Structure le contenu suivant en exactement ${scene_count} scènes pour une série de posts Instagram/LinkedIn/TikTok.
${brandContext}

CONTENU SOURCE:
${content}

Retourne UNIQUEMENT ce JSON valide, sans markdown ni commentaire :
{
  "project_title": "Titre court et accrocheur du projet (5-7 mots max)",
  "scenes": [
    {
      "title": "Titre de la scène (2-4 mots, ex: Introduction, Le Problème, Notre Solution, Résultats, Appel à l'Action)",
      "script": "Narration détaillée de 3-5 phrases. Doit être engageant, factuel, et utiliser ${vaultName ? `le ton de ${vaultName}` : "un ton professionnel"}.",
      "caption": "Caption réseaux sociaux PRÊT À PUBLIER avec emojis pertinents, saut de ligne, et 3-5 hashtags métier. Max 2200 caractères.",
      "visual_prompt": "Prompt image en ANGLAIS uniquement. Ultra détaillé (80-100 mots): décris la scène précise, composition (rule of thirds/centered/etc.), type de plan, lumière (golden hour/studio/etc.), ambiance, palette de couleurs${promptColorHint}, style photographique${promptStyleHint}, qualité (4K, professional photography, sharp focus), et ce qu'il faut éviter."
    }
  ]
}

IMPORTANT: Génère EXACTEMENT ${scene_count} scènes. Les captions doivent être prêtes à copier-coller. Les prompts visuels doivent être exploitables directement dans FLUX/DALL-E/Midjourney.`,
      },
    ],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);

    // Ensure exactly scene_count scenes
    if (!Array.isArray(data.scenes) || data.scenes.length === 0) {
      throw new Error("Invalid scenes structure");
    }

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Impossible de structurer le contenu en scènes" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
