import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { saveGeneration } from "@/lib/credits";
import Replicate from "replicate";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const prediction = await replicate.predictions.get(params.id);
    const { prompt } = req.nextUrl.searchParams
      ? Object.fromEntries(req.nextUrl.searchParams)
      : {};

    // Save to history when completed
    if (prediction.status === "succeeded" && prediction.output) {
      const videoUrl = Array.isArray(prediction.output)
        ? prediction.output[0]
        : prediction.output;
      if (prompt) {
        await saveGeneration(
          user.id,
          "video",
          prompt,
          videoUrl,
          prediction.model ?? "video"
        );
      }
    }

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
      logs: prediction.logs,
    });
  } catch (err) {
    console.error("[predictions/get]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
