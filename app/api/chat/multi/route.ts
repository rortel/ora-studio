import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getModel } from "@/lib/models";
import { streamFromModel, ChatMessage } from "@/lib/providers";
import { checkAndDeductAmount } from "@/lib/credits";

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
      });
    }

    const { prompt, modelIds } = (await req.json()) as {
      prompt: string;
      modelIds: string[];
    };

    if (!prompt?.trim() || !modelIds?.length) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
        status: 400,
      });
    }

    const models = modelIds.map((id) => getModel(id));
    if (models.some((m) => !m)) {
      return new Response(JSON.stringify({ error: "Modèle inconnu" }), {
        status: 400,
      });
    }

    const totalCost = models.reduce((sum, m) => sum + m!.creditCost, 0);
    const { success, error: creditError } = await checkAndDeductAmount(
      user.id,
      totalCost
    );
    if (!success) {
      return new Response(JSON.stringify({ error: creditError }), {
        status: 402,
      });
    }

    const encoder = new TextEncoder();
    const messages: ChatMessage[] = [{ role: "user", content: prompt }];

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        };

        await Promise.allSettled(
          models.map(async (model) => {
            try {
              await streamFromModel(model!.id, messages, (chunk) => {
                send({ model: model!.id, chunk });
              });
              send({ model: model!.id, done: true });
            } catch {
              send({ model: model!.id, error: "Erreur de génération" });
            }
          })
        );

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[chat/multi]", err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
    });
  }
}
