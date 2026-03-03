import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkAndDeductCredits } from "@/lib/credits";
import Replicate from "replicate";

// Vercel Pro: extend timeout to 60s (used as safety net for DALL-E sync path)
export const maxDuration = 60;

async function createReplicatePrediction(prompt: string, size: string): Promise<string> {
  const [width, height] =
    size === "portrait" ? [768, 1024] : size === "square" ? [1024, 1024] : [1024, 768];

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

  // Async — returns immediately with a predictionId instead of blocking
  const prediction = await replicate.predictions.create({
    model: "black-forest-labs/flux-schnell",
    input: { prompt, width, height, num_outputs: 1, output_format: "webp" },
  });

  return prediction.id;
}

async function generateWithOpenAI(prompt: string, size: string): Promise<string> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const dalleSize =
    size === "portrait" ? "1024x1792" : size === "square" ? "1024x1024" : "1792x1024";
  const response = await client.images.generate({
    model: "dall-e-3",
    prompt,
    size: dalleSize as "1024x1024" | "1792x1024" | "1024x1792",
    quality: "standard",
    n: 1,
  });
  const url = response.data?.[0]?.url;
  if (!url) throw new Error("Aucune image retournée par DALL-E");
  return url;
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

  const { prompt, size = "landscape", style } = await request.json() as {
    prompt: string;
    size?: "landscape" | "portrait" | "square";
    style?: string;
  };

  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: "Prompt requis" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const credits = await checkAndDeductCredits(user.id, "image");
  if (!credits.success) {
    return new Response(JSON.stringify({ error: credits.error }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  const enhancedPrompt = style
    ? `${prompt}, style: ${style}, high quality, detailed`
    : prompt;

  // ── Path 1: Replicate (FLUX Schnell) — async prediction ─────────────────
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      const predictionId = await createReplicatePrediction(enhancedPrompt, size);
      return new Response(
        JSON.stringify({
          predictionId,
          model: "black-forest-labs/flux-schnell",
          creditsRemaining: credits.remaining,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      // Replicate failed — fall through to DALL-E if available
      if (!process.env.OPENAI_API_KEY) {
        return new Response(JSON.stringify({ error: `Replicate: ${String(err)}` }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  // ── Path 2: DALL-E 3 (OpenAI) — synchronous ─────────────────────────────
  if (process.env.OPENAI_API_KEY) {
    try {
      const url = await generateWithOpenAI(enhancedPrompt, size);
      return new Response(
        JSON.stringify({
          url,
          model: "dall-e-3",
          creditsRemaining: credits.remaining,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      return new Response(JSON.stringify({ error: `DALL-E: ${String(err)}` }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response(
    JSON.stringify({ error: "Aucune clé API configurée (REPLICATE_API_TOKEN ou OPENAI_API_KEY)" }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  );
}
