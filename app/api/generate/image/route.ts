import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkAndDeductCredits, saveGeneration } from "@/lib/credits";
import Replicate from "replicate";

async function generateWithReplicate(prompt: string, size: string): Promise<string> {
  const [width, height] = size === "portrait" ? [768, 1024] : size === "square" ? [1024, 1024] : [1024, 768];
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
  const output = await replicate.run("black-forest-labs/flux-schnell", {
    input: { prompt, width, height, num_outputs: 1, output_format: "webp" },
  });
  const url = Array.isArray(output) ? output[0] : String(output);
  if (!url) throw new Error("Aucune image retournée par Replicate");
  return url;
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
    if (process.env.REPLICATE_API_TOKEN) {
      imageUrl = await generateWithReplicate(enhancedPrompt, size);
      model = "black-forest-labs/flux-schnell";
    } else if (process.env.OPENAI_API_KEY) {
      imageUrl = await generateWithOpenAI(enhancedPrompt, size);
      model = "dall-e-3";
    } else {
      return new Response(JSON.stringify({ error: "Aucune clé API image configurée (REPLICATE_API_TOKEN ou OPENAI_API_KEY)" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    if (process.env.OPENAI_API_KEY) {
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
      return new Response(JSON.stringify({ error: String(err) }), {
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
