import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAndDeductCredits } from "@/lib/credits";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { text, voice = "nova", speed = 1.0 } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: "Texte requis" }, { status: 400 });
  }

  if (text.length > 4096) {
    return NextResponse.json({ error: "Texte trop long (max 4096 caractères)" }, { status: 400 });
  }

  const deduction = await checkAndDeductCredits(user.id, "audio");
  if (!deduction.success) {
    return NextResponse.json({ error: deduction.error }, { status: 402 });
  }

  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
    input: text,
    speed,
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": "attachment; filename=ora-audio.mp3",
    },
  });
}
