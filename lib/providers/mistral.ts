import Mistral from "@mistralai/mistralai";
import type { ChatMessage } from "./index";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });

export async function streamMistral(
  model: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void
): Promise<void> {
  const response = await client.chat.stream({
    model,
    messages,
    maxTokens: 4096,
  });

  for await (const chunk of response) {
    const delta = chunk.data.choices[0]?.delta?.content;
    if (typeof delta === "string" && delta) {
      onChunk(delta);
    }
  }
}
