import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Anthropic from "@anthropic-ai/sdk";

const HEADERS = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" };

function resolveUrl(href: string, base: string): string {
  try { return new URL(href, base).href; } catch { return href; }
}

interface PageAssets {
  title: string;
  description: string;
  logoUrl: string | null;
  heroImage: string | null;
  socialLinks: Record<string, string>;
  text: string;
}

function extractAssets(html: string, baseUrl: string): PageAssets {
  // Title
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) ?? [])[1]?.trim() ?? "";

  // Meta description
  const description = (
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,})["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']{10,})["'][^>]+name=["']description["']/i)
  )?.[1]?.trim() ?? "";

  // OG image → hero
  const ogImage = (
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  )?.[1];
  const heroImage = ogImage ? resolveUrl(ogImage, baseUrl) : null;

  // Logo: priorité apple-touch-icon > icon > img[class/alt*=logo] > JSON-LD
  const appleIcon = (
    html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i) ??
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i)
  )?.[1];

  const favicon = (
    html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"'\.]+\.(png|svg|jpg|ico))["']/i) ??
    html.match(/<link[^>]+href=["']([^"'\.]+\.(png|svg|jpg|ico))["'][^>]+rel=["'](?:shortcut )?icon["']/i)
  )?.[1];

  const imgLogo = (
    html.match(/<img[^>]+(?:id|class|alt)=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i) ??
    html.match(/<img[^>]+src=["']([^"']*\/logo[^"']*)["']/i)
  )?.[1];

  // JSON-LD logo
  let jsonLdLogo: string | null = null;
  const jsonLdBlocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of jsonLdBlocks) {
    try {
      const content = block.replace(/<script[^>]*>|<\/script>/gi, "");
      const parsed = JSON.parse(content);
      const logo = parsed?.logo?.url ?? parsed?.logo ?? parsed?.image?.url;
      if (typeof logo === "string" && logo.startsWith("http")) { jsonLdLogo = logo; break; }
    } catch { /* ignore */ }
  }

  const logoUrl = appleIcon
    ? resolveUrl(appleIcon, baseUrl)
    : jsonLdLogo
    ?? (favicon ? resolveUrl(favicon, baseUrl) : null)
    ?? (imgLogo ? resolveUrl(imgLogo, baseUrl) : null);

  // Social media links
  const socialPatterns: Record<string, RegExp> = {
    instagram: /instagram\.com\/([A-Za-z0-9_.]+)/,
    linkedin: /linkedin\.com\/(?:company|in)\/([A-Za-z0-9_-]+)/,
    twitter: /(?:twitter|x)\.com\/([A-Za-z0-9_]+)/,
    facebook: /facebook\.com\/([A-Za-z0-9_.]+)/,
    youtube: /youtube\.com\/(?:channel|c|@)([A-Za-z0-9_-]+)/,
    tiktok: /tiktok\.com\/@([A-Za-z0-9_.]+)/,
  };
  const socialLinks: Record<string, string> = {};
  for (const [network, pattern] of Object.entries(socialPatterns)) {
    const match = html.match(pattern);
    if (match) socialLinks[network] = `https://${network === "twitter" ? "x" : network}.com/${match[1]}`;
  }

  // Clean text for Claude
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10000);

  return { title, description, logoUrl, heroImage, socialLinks, text };
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

  // Fetch and extract assets from all URLs in parallel
  const pageResults = await Promise.all(
    urls.slice(0, 5).map(async (url) => {
      try {
        const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12000) });
        if (!res.ok) return { url, assets: null };
        const html = await res.text();
        return { url, assets: extractAssets(html, url) };
      } catch {
        return { url, assets: null };
      }
    })
  );

  // Aggregate: first page wins for logo/hero, merge socials
  let logoUrl: string | null = null;
  let heroImage: string | null = null;
  const socialLinks: Record<string, string> = {};
  const contentBlocks: string[] = [];

  for (const { url, assets } of pageResults) {
    if (!assets) { contentBlocks.push(`--- URL: ${url} ---\n[Non accessible]`); continue; }
    if (!logoUrl && assets.logoUrl) logoUrl = assets.logoUrl;
    if (!heroImage && assets.heroImage) heroImage = assets.heroImage;
    Object.assign(socialLinks, assets.socialLinks);
    const meta = [assets.title, assets.description].filter(Boolean).join(" — ");
    contentBlocks.push(`--- URL: ${url} ---\n${meta ? `[META: ${meta}]\n` : ""}${assets.text}`);
  }

  const combinedContent = contentBlocks.join("\n\n");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `Tu es un expert en stratégie de marque et communication. Analyse ce contenu web et extrait une charte de marque complète, précise, et exploitable par une agence de communication.

CONTENU À ANALYSER:
${combinedContent}

Retourne UNIQUEMENT un objet JSON valide avec cette structure exacte (sans markdown, sans commentaires):
{
  "brand_name": "Nom exact de la marque",
  "brand_summary": "Positionnement clair en 2-3 phrases : qui ils sont, ce qu'ils font, leur différenciation",
  "industry": "Secteur d'activité précis (ex: SaaS B2B, Mode Luxe, Agroalimentaire Bio...)",
  "products_services": ["Produit/service 1", "Produit/service 2", "Produit/service 3"],
  "competitors": ["Concurrent direct 1", "Concurrent direct 2", "Concurrent direct 3"],
  "editorial": {
    "tone": "Description précise du ton (ex: expert et accessible, premium et chaleureux...)",
    "formality": "formel | semi-formel | informel",
    "language_style": "Style rédactionnel précis",
    "vocabulary_approved": ["terme spécifique 1", "terme 2", "terme 3", "terme 4", "terme 5"],
    "vocabulary_forbidden": ["mot 1", "mot 2", "mot 3"],
    "key_messages": ["Message différenciateur 1", "Message 2", "Message 3"],
    "tagline": "Tagline ou slogan exact si trouvé, sinon null"
  },
  "visual": {
    "primary_colors": ["#hexcode1", "#hexcode2"],
    "secondary_colors": ["#hexcode3"],
    "style": "Style visuel global précis (ex: minimaliste épuré, vibrant et dynamique...)",
    "imagery_style": "Type d'images utilisées (ex: photos lifestyle en lumière naturelle, illustrations vectorielles...)",
    "typography_style": "Style typographique si visible (ex: serif élégant, sans-serif moderne...)",
    "avoid": ["Élément visuel à éviter 1", "Élément 2"]
  },
  "audience": {
    "primary": "Description précise du persona principal",
    "secondary": "Persona secondaire",
    "age_range": "ex: 28-45 ans",
    "values": ["Valeur 1", "Valeur 2", "Valeur 3"],
    "pain_points": ["Problème client 1", "Problème 2"]
  },
  "content_guidelines": {
    "do": ["Bonne pratique 1", "Bonne pratique 2", "Bonne pratique 3"],
    "dont": ["À éviter 1", "À éviter 2"],
    "image_formats": ["Format recommandé 1", "Format 2"],
    "video_style": "Description du style vidéo adapté à la marque",
    "posting_frequency": "Fréquence de publication recommandée"
  }
}`,
      },
    ],
  });

  const responseText = message.content[0].type === "text" ? message.content[0].text : "";

  let guidelines: Record<string, unknown>;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    guidelines = JSON.parse(jsonMatch[0]);
  } catch {
    return new Response(JSON.stringify({ error: "Impossible d'extraire les directives de marque" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Enrich guidelines with extracted assets
  if (logoUrl) guidelines.logo_url = logoUrl;
  if (heroImage) guidelines.hero_image = heroImage;
  if (Object.keys(socialLinks).length > 0) guidelines.social_media = { ...((guidelines.social_media as object) ?? {}), ...socialLinks };

  return new Response(JSON.stringify({ guidelines, sources: urls, logo_url: logoUrl, hero_image: heroImage }), {
    headers: { "Content-Type": "application/json" },
  });
}
