import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkAndDeductCredits, saveGeneration } from "@/lib/credits";
import Replicate from "replicate";

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

  const { prompt, duration = 5 } = await request.json() as {
    prompt: string;
    duration?: number;
  };

  const credits = await checkAndDeductCredits(user.id, "video");
  if (!credits.success) {
    return new Response(JSON.stringify({ error: credits.error }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    return new Response(JSON.stringify({ error: "REPLICATE_API_TOKEN non configuré" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  try {
    // Use minimax/video-01 for text-to-video generation
    const output = await replicate.run(
      "minimax/video-01" as `${string}/${string}`,
      {
        input: {
          prompt,
          prompt_optimizer: true,
        },
      }
    );

    const videoUrl = Array.isArray(output) ? output[0] : String(output);
    saveGeneration(user.id, "video", prompt, videoUrl, "minimax/video-01").catch(() => {});

    return new Response(JSON.stringify({ url: videoUrl, model: "minimax/video-01", creditsRemaining: credits.remaining }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    // Fallback: try wan-i2v
    try {
      const output = await replicate.run(
        "wavespeedai/wan-2.1-t2v-480p" as `${string}/${string}`,
        {
          input: {
            prompt,
            num_frames: duration * 8,
          },
        }
      );
      const videoUrl = Array.isArray(output) ? output[0] : String(output);
      saveGeneration(user.id, "video", prompt, videoUrl, "wan-2.1-t2v").catch(() => {});

      return new Response(JSON.stringify({ url: videoUrl, model: "wan-2.1-t2v", creditsRemaining: credits.remaining }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err2) {
      return new Response(JSON.stringify({ error: String(err2) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
}
