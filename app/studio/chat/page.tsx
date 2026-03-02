"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import ReactMarkdown from "react-markdown";
import { CHAT_MODELS, PROVIDER_COLORS, PROVIDER_LABELS } from "@/lib/models";

interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(CHAT_MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedModelConfig = CHAT_MODELS.find((m) => m.id === selectedModel)!;

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const assistantMessage: Message = { role: "assistant", content: "", model: selectedModel };
    setMessages([...updatedMessages, assistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, modelId: selectedModel }),
      });

      if (!response.ok) {
        const err = await response.json();
        setMessages([...updatedMessages, { role: "assistant", content: `Erreur: ${err.error}` }]);
        return;
      }

      const credits = response.headers.get("X-Credits-Remaining");
      if (credits) setCreditsLeft(Number(credits));

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages([...updatedMessages, { role: "assistant", content: text, model: selectedModel }]);
      }
    } catch {
      setMessages([...updatedMessages, { role: "assistant", content: "Erreur de connexion." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-surface shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-primary" />
          <h1 className="text-white font-semibold">Agrégateur IA</h1>
        </div>
        <div className="flex items-center gap-3">
          {creditsLeft !== null && (
            <span className="text-xs text-zinc-500">{creditsLeft} crédits</span>
          )}
          <button
            onClick={() => setMessages([])}
            className="text-zinc-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
            title="Effacer la conversation"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Model selector */}
      <div className="flex gap-2 px-6 py-3 border-b border-border/30 overflow-x-auto shrink-0">
        {CHAT_MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedModel(m.id)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border",
              selectedModel === m.id
                ? "bg-primary/15 border-primary/30 text-primary"
                : "border-border/30 text-zinc-400 hover:text-white hover:border-border"
            )}
          >
            <span className={clsx("text-[10px] px-1.5 py-0.5 rounded", PROVIDER_COLORS[m.provider])}>
              {PROVIDER_LABELS[m.provider]}
            </span>
            {m.label}
            {m.badge && (
              <span className="bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded text-[10px]">
                {m.badge}
              </span>
            )}
            <span className="text-zinc-600">{m.creditCost}cr</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Bot size={32} className="text-primary" />
            </div>
            <h2 className="text-white font-semibold text-lg mb-2">
              Modèle actif : {selectedModelConfig.label}
            </h2>
            <p className="text-zinc-500 text-sm max-w-sm">{selectedModelConfig.description}</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={clsx("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-primary" />
              </div>
            )}
            <div
              className={clsx(
                "max-w-[75%] rounded-2xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-primary text-white rounded-tr-sm"
                  : "bg-surface border border-border/40 text-zinc-200 rounded-tl-sm"
              )}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content || (loading && i === messages.length - 1 ? "▋" : "")}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
              {msg.model && (
                <div className="mt-2 text-[10px] text-zinc-500">
                  {CHAT_MODELS.find((m) => m.id === msg.model)?.label ?? msg.model}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border/50 bg-surface shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre message… (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
            rows={1}
            className="flex-1 bg-surface2 border border-border/40 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary placeholder-zinc-600 resize-none transition-colors"
            style={{ minHeight: "44px", maxHeight: "200px" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 200)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-primary hover:bg-primary/80 disabled:opacity-40 text-white p-3 rounded-xl transition-all shrink-0"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
