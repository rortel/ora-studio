import OpenAI from "openai";
import type { ChatMessage } from "./index";

export async function streamOpenAI(
  model: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void
): Promise<void> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const stream = await client.chat.completions.create({
    model,
    messages,
    stream: true,
    max_tokens: 4096,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      onChunk(delta);
    }
  }
}
