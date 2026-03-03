import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveGeneration } from "@/lib/credits";
import Replicate from "replicate";

// Keep timeout generous — just a lightweight GET to Replicate API
export const maxDuration = 15;

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

// Track which predictions have already been saved (in-memory, per instance)
// This is best-effort dedup — proper dedup would use a DB column
const savedPredictions = new Set<string>();

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const prediction = await replicate.predictions.get(params.id);
    const searchParams = req.nextUrl.searchParams;
    const prompt = searchParams.get("prompt") ?? "";
    const type = searchParams.get("type") ?? ""; // "image" or "video"

    // Save to history once when completed — best-effort dedup
    if (
      prediction.status === "succeeded" &&
      prediction.output &&
      !savedPredictions.has(params.id)
    ) {
      savedPredictions.add(params.id);

      const outputUrl = Array.isArray(prediction.output)
        ? prediction.output[0]
        : String(prediction.output);

      // Determine type from query param or model name
      const generationType =
        type === "image" ||
        (prediction.model ?? "").includes("flux") ||
        (prediction.model ?? "").includes("stable-diffusion")
          ? "image"
          : "video";

      if (prompt && outputUrl) {
        saveGeneration(
          user.id,
          generationType,
          prompt,
          outputUrl,
          prediction.model ?? generationType
        ).catch(() => {}); // fire and forget
      }
    }

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
      model: prediction.model,
    });
  } catch (err) {
    console.error("[predictions/get]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
