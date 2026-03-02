import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage } from "./index";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function streamAnthropic(
  model: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void
): Promise<void> {
  const systemMessage = messages.find((m) => m.role === "system");
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const stream = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: chatMessages,
    stream: true,
    ...(systemMessage && { system: systemMessage.content }),
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      onChunk(event.delta.text);
    }
  }
}
