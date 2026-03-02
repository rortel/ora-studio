import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkAndDeductCredits, saveGeneration } from "@/lib/credits";
import { streamFromModel } from "@/lib/providers";
import type { ChatMessage } from "@/lib/providers";

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

  const { messages, modelId } = await request.json() as {
    messages: ChatMessage[];
    modelId: string;
  };

  const credits = await checkAndDeductCredits(user.id, "chat");
  if (!credits.success) {
    return new Response(JSON.stringify({ error: credits.error }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userPrompt = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";

  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamFromModel(modelId, messages, (chunk) => {
          fullResponse += chunk;
          controller.enqueue(encoder.encode(chunk));
        });
        controller.close();
        // Save generation async (don't await — stream already closed)
        saveGeneration(user.id, "chat", userPrompt, fullResponse, modelId).catch(() => {});
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur de génération";
        controller.enqueue(encoder.encode(`\n\n[Erreur: ${msg}]`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Credits-Remaining": String(credits.remaining),
    },
  });
}
