import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkAndDeductCredits } from "@/lib/credits";
import Replicate from "replicate";

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

  const { prompt, duration = 5 } = await request.json() as {
    prompt: string;
    duration?: number;
  };

  if (!process.env.REPLICATE_API_TOKEN) {
    return new Response(JSON.stringify({ error: "REPLICATE_API_TOKEN non configuré" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const credits = await checkAndDeductCredits(user.id, "video");
  if (!credits.success) {
    return new Response(JSON.stringify({ error: credits.error }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  // Start prediction asynchronously — do NOT await completion (Vercel timeout)
  const prediction = await replicate.predictions.create({
    model: "wavespeedai/wan-2.1-t2v-480p",
    input: {
      prompt,
      num_frames: Math.min(81, duration * 16),
      fps: 16,
    },
  });

  return new Response(
    JSON.stringify({ predictionId: prediction.id, creditsRemaining: credits.remaining }),
    { headers: { "Content-Type": "application/json" } }
  );
}
