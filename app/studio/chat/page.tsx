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
    <div className="flex flex-col h-screen" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <Bot size={18} style={{ color: "var(--ora-signal)" }} />
          <h1 style={{ fontSize: "15px", fontWeight: 500, color: "var(--foreground)" }}>Agrégateur IA</h1>
        </div>
        <div className="flex items-center gap-3">
          {creditsLeft !== null && (
            <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{creditsLeft} crédits</span>
          )}
          <button
            onClick={() => setMessages([])}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--secondary)]"
            style={{ color: "var(--muted-foreground)" }}
            title="Effacer la conversation"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Model selector */}
      <div
        className="flex gap-1.5 px-6 py-3 overflow-x-auto shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--card)" }}
      >
        {CHAT_MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedModel(m.id)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all",
            )}
            style={{
              fontSize: "12px",
              fontWeight: selectedModel === m.id ? 500 : 400,
              border: `1px solid ${selectedModel === m.id ? "var(--ora-signal-ring)" : "var(--border)"}`,
              background: selectedModel === m.id ? "var(--ora-signal-light)" : "transparent",
              color: selectedModel === m.id ? "var(--ora-signal)" : "var(--muted-foreground)",
            }}
          >
            <span className={clsx("text-[10px] px-1.5 py-0.5 rounded", PROVIDER_COLORS[m.provider])}>
              {PROVIDER_LABELS[m.provider]}
            </span>
            {m.label}
            {m.badge && (
              <span
                className="px-1.5 py-0.5 rounded"
                style={{ fontSize: "10px", background: "var(--secondary)", color: "var(--muted-foreground)" }}
              >
                {m.badge}
              </span>
            )}
            <span style={{ color: "var(--muted-foreground)" }}>{m.creditCost}cr</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--ora-signal-light)" }}
            >
              <Bot size={28} style={{ color: "var(--ora-signal)" }} />
            </div>
            <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--foreground)", marginBottom: "8px" }}>
              {selectedModelConfig.label}
            </h2>
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", maxWidth: "320px" }}>
              {selectedModelConfig.description}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={clsx("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {msg.role === "assistant" && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: "var(--ora-signal-light)" }}
              >
                <Bot size={13} style={{ color: "var(--ora-signal)" }} />
              </div>
            )}
            <div
              className={clsx("max-w-[75%] rounded-2xl px-4 py-3", msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm")}
              style={{
                fontSize: "14px",
                background: msg.role === "user" ? "var(--primary)" : "var(--card)",
                color: msg.role === "user" ? "var(--primary-foreground)" : "var(--foreground)",
                border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
              }}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none" style={{ color: "var(--foreground)" }}>
                  <ReactMarkdown>{msg.content || (loading && i === messages.length - 1 ? "▋" : "")}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
              {msg.model && (
                <div className="mt-2" style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                  {CHAT_MODELS.find((m) => m.id === msg.model)?.label ?? msg.model}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-6 py-4 shrink-0"
        style={{ background: "var(--card)", borderTop: "1px solid var(--border)" }}
      >
        <div className="flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Écrivez votre message… (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)"
            rows={1}
            className="flex-1 rounded-xl px-4 py-3 outline-none resize-none transition-colors"
            style={{
              fontSize: "14px",
              minHeight: "44px",
              maxHeight: "200px",
              background: "var(--input-background)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--ora-signal)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 200)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-3 rounded-xl transition-all disabled:opacity-40 shrink-0"
            style={{ background: "var(--ora-signal)", color: "#ffffff" }}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
