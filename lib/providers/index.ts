import { getModel } from "@/lib/models";
import { streamMistral } from "./mistral";
import { streamOpenAI } from "./openai";
import { streamAnthropic } from "./anthropic";
import { streamGoogle } from "./google";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function streamFromModel(
  modelId: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void
): Promise<void> {
  const model = getModel(modelId);
  if (!model) throw new Error(`Unknown model: ${modelId}`);

  switch (model.provider) {
    case "openai":
      return streamOpenAI(modelId, messages, onChunk);
    case "anthropic":
      return streamAnthropic(modelId, messages, onChunk);
    case "google":
      return streamGoogle(modelId, messages, onChunk);
    case "mistral":
      return streamMistral(modelId, messages, onChunk);
    default:
      throw new Error(`Unknown provider: ${model.provider}`);
  }
}
