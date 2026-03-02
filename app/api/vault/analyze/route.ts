import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { urls } = await request.json() as { urls: string[] };
  if (!urls?.length) {
    return new Response(JSON.stringify({ error: "Aucune URL fournie" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch content from all URLs
  const contents: string[] = [];
  for (const url of urls.slice(0, 5)) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; OraStudio/1.0)" },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const html = await res.text();
        // Extract text content (strip HTML tags)
        const text = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 8000);
        contents.push(`--- URL: ${url} ---\n${text}`);
      }
    } catch {
      contents.push(`--- URL: ${url} ---\n[Impossible de charger le contenu]`);
    }
  }

  const combinedContent = contents.join("\n\n");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Analyse ce contenu web et extrait les directives de marque complètes en JSON.

CONTENU À ANALYSER:
${combinedContent}

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte:
{
  "brand_name": "Nom de la marque",
  "brand_summary": "Description courte de la marque (2-3 phrases)",
  "editorial": {
    "tone": "ex: professionnel, chaleureux, innovant, technique, etc.",
    "formality": "ex: formel, semi-formel, informel",
    "language_style": "ex: clair et direct, lyrique, technique, etc.",
    "vocabulary_approved": ["mot1", "mot2", "mot3"],
    "vocabulary_forbidden": ["mot4", "mot5"],
    "key_messages": ["message clé 1", "message clé 2"],
    "tagline": "tagline si trouvé"
  },
  "visual": {
    "primary_colors": ["#hexcode1", "#hexcode2"],
    "secondary_colors": ["#hexcode3"],
    "style": "ex: minimaliste, coloré, premium, etc.",
    "imagery_style": "ex: photos de personnes, produits en gros plan, nature, etc.",
    "avoid": ["éléments visuels à éviter"]
  },
  "audience": {
    "primary": "description du public cible principal",
    "secondary": "description du public secondaire",
    "age_range": "ex: 25-45 ans",
    "values": ["valeur 1", "valeur 2"]
  },
  "content_guidelines": {
    "image_formats": ["format1", "format2"],
    "video_style": "description du style vidéo",
    "do": ["à faire 1", "à faire 2"],
    "dont": ["à éviter 1", "à éviter 2"]
  }
}`,
      },
    ],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";

  // Extract JSON from response
  let guidelines;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      guidelines = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found");
    }
  } catch {
    return new Response(JSON.stringify({ error: "Impossible d'extraire les directives" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ guidelines, sources: urls }), {
    headers: { "Content-Type": "application/json" },
  });
}
