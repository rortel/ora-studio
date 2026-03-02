import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkAndDeductCredits, saveGeneration } from "@/lib/credits";

// Support both FAL_API_KEY (Vercel naming) and FAL_KEY
const FAL_KEY = process.env.FAL_API_KEY ?? process.env.FAL_KEY ?? "";

async function generateWithFal(prompt: string, size: string): Promise<string> {
  const [width, height] = size === "portrait" ? [768, 1024] : size === "square" ? [1024, 1024] : [1024, 768];

  const model = process.env.REPLICATE_IMAGE_MODEL ?? "fal-ai/flux/schnell";
  const falModel = model.includes("fal-ai") ? model : "fal-ai/flux/schnell";

  const response = await fetch(`https://fal.run/${falModel}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_size: { width, height },
      num_inference_steps: 4,
      num_images: 1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Fal AI error: ${err}`);
  }

  const data = await response.json() as { images: Array<{ url: string }> };
  return data.images[0].url;
}

async function generateWithOpenAI(prompt: string, size: string): Promise<string> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const dalleSize = size === "portrait" ? "1024x1792" : size === "square" ? "1024x1024" : "1792x1024";

  const response = await client.images.generate({
    model: "dall-e-3",
    prompt,
    size: dalleSize as "1024x1024" | "1792x1024" | "1024x1792",
    quality: "standard",
    n: 1,
  });

  return response.data[0].url!;
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

  const credits = await checkAndDeductCredits(user.id, "image");
  if (!credits.success) {
    return new Response(JSON.stringify({ error: credits.error }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  const enhancedPrompt = style ? `${prompt}, style: ${style}, high quality, detailed` : prompt;

  let imageUrl: string;
  let model: string;

  try {
    if (FAL_KEY) {
      imageUrl = await generateWithFal(enhancedPrompt, size);
      model = process.env.REPLICATE_IMAGE_MODEL ?? "fal-ai/flux-schnell";
    } else if (process.env.OPENAI_API_KEY) {
      imageUrl = await generateWithOpenAI(enhancedPrompt, size);
      model = "dall-e-3";
    } else {
      throw new Error("Aucune clé API image configurée (FAL_API_KEY ou OPENAI_API_KEY)");
    }
  } catch {
    if (process.env.OPENAI_API_KEY && FAL_KEY) {
      try {
        imageUrl = await generateWithOpenAI(enhancedPrompt, size);
        model = "dall-e-3";
      } catch (err2) {
        return new Response(JSON.stringify({ error: String(err2) }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Erreur de génération d'image" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  saveGeneration(user.id, "image", prompt, imageUrl!, model!).catch(() => {});

  return new Response(JSON.stringify({ url: imageUrl, model, creditsRemaining: credits.remaining }), {
    headers: { "Content-Type": "application/json" },
  });
}
