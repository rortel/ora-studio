import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkAndDeductCredits, saveGeneration } from "@/lib/credits";
import { streamFromModel } from "@/lib/providers";

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

  const { prompt, language } = await request.json() as { prompt: string; language?: string };

  const credits = await checkAndDeductCredits(user.id, "code");
  if (!credits.success) {
    return new Response(JSON.stringify({ error: credits.error }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = `Tu es un expert en développement logiciel. Génère du code propre, documenté et fonctionnel${language ? ` en ${language}` : ""}. Réponds uniquement avec du code bien formaté en markdown, avec des commentaires clairs.`;

  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamFromModel(
          "mistral-large-latest",
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          (chunk) => {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
        );
        controller.close();
        saveGeneration(user.id, "code", prompt, fullResponse, "mistral-large-latest").catch(() => {});
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
