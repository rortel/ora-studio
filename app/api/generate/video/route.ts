import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkAndDeductCredits } from "@/lib/credits";
import Replicate from "replicate";

// Prediction creation is fast (< 5s) — 30s is a safe ceiling
export const maxDuration = 30;

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

  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: "Prompt requis" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    return new Response(
      JSON.stringify({
        error: "REPLICATE_API_TOKEN non configuré dans les variables d'environnement Vercel.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const credits = await checkAndDeductCredits(user.id, "video");
  if (!credits.success) {
    return new Response(JSON.stringify({ error: credits.error }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  try {
    // WAN 2.1 T2V 480p — Replicate model verified March 2025
    const prediction = await replicate.predictions.create({
      model: "wavespeedai/wan-2.1-t2v-480p",
      input: {
        prompt,
        num_frames: Math.min(81, Math.max(17, duration * 16)),
        fps: 16,
        sample_shift: 8,
        sample_steps: 30,
        fast_mode: "Balanced",
      },
    });

    return new Response(
      JSON.stringify({
        predictionId: prediction.id,
        creditsRemaining: credits.remaining,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: `Erreur Replicate : ${String(err)}. Vérifiez que REPLICATE_API_TOKEN est valide dans les settings Vercel.`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
