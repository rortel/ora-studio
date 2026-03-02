import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Bot, Send } from "lucide-react";
import { getAccessToken } from "../lib/authToken";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
};

const textModels = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", credits: 3 },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", credits: 1 },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "Anthropic", credits: 3 },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "Anthropic", credits: 1 },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", credits: 2 },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "Google", credits: 1 },
  { id: "mistral-large-latest", name: "Mistral Large", provider: "Mistral", credits: 2 },
  { id: "mistral-small-latest", name: "Mistral Small", provider: "Mistral", credits: 1 },
];

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChatPage() {
  const [selectedModel, setSelectedModel] = useState(textModels[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState("");

  const selectedModelMeta = useMemo(() => textModels.find((model) => model.id === selectedModel) || textModels[0], [selectedModel]);
  const modelName = selectedModelMeta.name;

  const postChatLog = async (token: string, latencyMs: number) => {
    try {
      await fetch("/api/generation-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entries: [
            {
              module: "chat",
              category: "text",
              format: "free-prompt",
              modelId: selectedModelMeta.id,
              modelName: selectedModelMeta.name,
              provider: selectedModelMeta.provider,
              credits: selectedModelMeta.credits,
              latencyMs,
              status: "success",
              compliance: 0,
              channel: "chat",
            },
          ],
        }),
      });
    } catch (_error) {
      // no-op
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const userText = input.trim();
    setInput("");
    setChatError("");
    setMessages((prev) => [
      ...prev,
      {
        id: makeId(),
        role: "user",
        text: userText,
        timestamp: nowLabel(),
      },
    ]);
    setIsThinking(true);
    try {
      const token = getAccessToken();
      if (!token) {
        setChatError("Session expired. Please sign in again.");
        return;
      }
      const startedAt = Date.now();

      const response = await fetch("/api/hub-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: "text",
          mode: "single",
          format: "free-prompt",
          prompt: userText,
          models: [selectedModelMeta],
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        const reason = typeof payload?.error === "string" ? payload.error : `HTTP ${response.status}`;
        setChatError(`Generation failed: ${reason}`);
        return;
      }

      const text = typeof payload?.results?.[0]?.text === "string" ? payload.results[0].text.trim() : "";
      if (!text) {
        setChatError("Generation returned an empty answer.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          text,
          timestamp: nowLabel(),
        },
      ]);

      await postChatLog(token, Date.now() - startedAt);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Unable to call model.");
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="max-w-[1080px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-foreground mb-1" style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "-0.03em" }}>
              Chat
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
              Quick conversation with your selected model.
            </p>
          </div>
          <select
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-foreground"
            style={{ fontSize: "13px" }}
          >
            {textModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-card border border-border rounded-xl h-[calc(100vh-220px)] min-h-[420px] flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!messages.length && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-foreground mb-1" style={{ fontSize: "16px", fontWeight: 500 }}>
                    Start a conversation
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                    Choose a model, type your prompt, and get an instant answer.
                  </p>
                </div>
              </div>
            )}
            {messages.map((message) => (
              <motion.div key={message.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                {message.role === "user" ? (
                  <div className="ml-auto max-w-[75%] bg-primary text-primary-foreground px-4 py-3 rounded-xl rounded-br-sm">
                    <p className="whitespace-pre-wrap" style={{ fontSize: "14px", lineHeight: 1.45 }}>
                      {message.text}
                    </p>
                    <p className="opacity-70 mt-1 text-right" style={{ fontSize: "11px" }}>
                      {message.timestamp}
                    </p>
                  </div>
                ) : (
                  <div className="max-w-[75%] border border-border rounded-xl px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot size={13} className="text-ora-signal" />
                      <span className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
                        ORA · {modelName}
                      </span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap" style={{ fontSize: "14px", lineHeight: 1.45 }}>
                      {message.text}
                    </p>
                    <p className="text-muted-foreground mt-1" style={{ fontSize: "11px" }}>
                      {message.timestamp}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
            {isThinking && (
              <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                {modelName} is thinking...
              </p>
            )}
            {chatError && (
              <p className="text-destructive" style={{ fontSize: "12px" }}>
                {chatError}
              </p>
            )}
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder="Ask anything..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/60 resize-none"
                style={{ fontSize: "14px", lineHeight: 1.4 }}
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={isThinking || !input.trim()}
                className="bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:opacity-90 transition-opacity disabled:opacity-70 cursor-pointer"
                style={{ fontSize: "13px", fontWeight: 600 }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
