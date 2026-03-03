import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ChatMessage } from "./index";

export async function streamGoogle(
  model: string,
  messages: ChatMessage[],
  onChunk: (text: string) => void
): Promise<void> {
  const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const genModel = client.getGenerativeModel({ model });

  const systemMessage = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  const history = chatMessages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const lastMessage = chatMessages[chatMessages.length - 1];

  const chat = genModel.startChat({
    history,
    ...(systemMessage && {
      systemInstruction: systemMessage.content,
    }),
  });

  const result = await chat.sendMessageStream(lastMessage.content);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      onChunk(text);
    }
  }
}
