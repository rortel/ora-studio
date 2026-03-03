"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send, ImageIcon, Video, Code2, Sparkles, Bot, Download,
  Copy, Check, Loader2, Shield, ChevronDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// ─── Types ───────────────────────────────────────────────────────────────────

type Intent = "text" | "image" | "video" | "code" | "chat";

interface BrandVault {
  id: string;
  name: string;
  brand_name?: string;
  guidelines?: {
    editorial?: {
      tone?: string;
      formality?: string;
      tagline?: string;
      vocabulary_approved?: string[];
      vocabulary_forbidden?: string[];
      key_messages?: string[];
    };
  };
}

interface Message {
  id: string;
  type: "user" | "result";
  content: string;
  intent?: Intent;
  imageUrl?: string;
  videoUrl?: string;
  model?: string;
  loading?: boolean;
  error?: string;
  multiResults?: Record<string, string>; // modelId → accumulated text (for compare)
  brandApplied?: string; // vault name used
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COMPARE_MODELS = ["gpt-4o", "claude-3-5-sonnet-20241022", "gemini-1.5-pro"];
const COMPARE_LABELS: Record<string, string> = {
  "gpt-4o": "GPT-4o",
  "claude-3-5-sonnet-20241022": "Claude 3.5",
  "gemini-1.5-pro": "Gemini Pro",
};

const INTENT_ICONS: Record<Intent, React.ElementType> = {
  text: Sparkles, image: ImageIcon, video: Video, code: Code2, chat: Bot,
};
const INTENT_LABELS: Record<Intent, string> = {
  text: "Texte", image: "Image", video: "Vidéo", code: "Code", chat: "Comparaison",
};

const SUGGESTIONS = [
  { label: "Rédige un email de lancement produit", intent: "text" as Intent },
  { label: "Génère une image photoréaliste d'un café parisien", intent: "image" as Intent },
  { label: "Post LinkedIn percutant sur l'IA en 2026", intent: "text" as Intent },
  { label: "Compare GPT-4o, Claude et Gemini pour cet email", intent: "chat" as Intent },
  { label: "Crée une vidéo d'une voiture sur route côtière", intent: "video" as Intent },
  { label: "Fonction TypeScript pour valider un email", intent: "code" as Intent },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectIntent(input: string): Intent {
  const t = input.toLowerCase();
  if (/\b(image|photo|visuel|illustration|dessine|picture|génère.{0,20}image|crée.{0,20}image|flux|dall.?e)\b/i.test(t)) return "image";
  if (/\b(vidéo|video|film|clip|animation|wan|sora|kling|veo)\b/i.test(t)) return "video";
  if (/\b(code|script|fonction|function|programme|classe|composant|component|typescript|javascript|python|rust|sql|bash)\b/i.test(t)) return "code";
  if (/\b(compare|vs\b|versus|quel modèle|quelle ia|gpt|claude|gemini|mistral|agrégat|3 modèles|trois modèles)\b/i.test(t)) return "chat";
  return "text";
}

function buildBrandContext(vault: BrandVault): string {
  const ed = vault.guidelines?.editorial;
  if (!ed) return "";
  const parts = [
    vault.brand_name && `Marque: ${vault.brand_name}`,
    ed.tone && `Ton: ${ed.tone}`,
    ed.formality && `Registre: ${ed.formality}`,
    ed.tagline && `Tagline: "${ed.tagline}"`,
    ed.key_messages?.length && `Messages clés: ${ed.key_messages.join(" / ")}`,
    ed.vocabulary_approved?.length && `Vocabulaire approuvé: ${ed.vocabulary_approved.join(", ")}`,
    ed.vocabulary_forbidden?.length && `À éviter: ${ed.vocabulary_forbidden.join(", ")}`,
  ].filter(Boolean);
  if (!parts.length) return "";
  return `[Brand Vault — ${vault.name}]\n${parts.join("\n")}\n\n`;
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function StudioPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Brand Vault
  const [vaults, setVaults] = useState<BrandVault[]>([]);
  const [activeVault, setActiveVault] = useState<BrandVault | null>(null);
  const [vaultMenuOpen, setVaultMenuOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch user's vaults on mount
  useEffect(() => {
    fetch("/api/vault")
      .then(r => r.ok ? r.json() : [])
      .then((data: BrandVault[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setVaults(data);
          setActiveVault(data[0]); // auto-activate most recent
        }
      })
      .catch(() => {});
  }, []);

  const uid = () => Math.random().toString(36).slice(2);

  // ── Poll Replicate prediction ──
  const pollPrediction = async (predictionId: string, msgId: string, type: "image" | "video", prompt: string) => {
    for (let i = 0; i < (type === "video" ? 120 : 60); i++) {
      await new Promise(r => setTimeout(r, type === "video" ? 5000 : 2000));
      try {
        const res = await fetch(`/api/predictions/${predictionId}?prompt=${encodeURIComponent(prompt)}&type=${type}`);
        const data = await res.json();
        if (data.status === "succeeded") {
          const url = Array.isArray(data.output) ? data.output[0] : data.output;
          setMessages(prev => prev.map(m => m.id === msgId
            ? { ...m, loading: false, imageUrl: type === "image" ? url : undefined, videoUrl: type === "video" ? url : undefined, model: data.model }
            : m));
          return;
        }
        if (data.status === "failed" || data.error) {
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, loading: false, error: data.error ?? "Génération échouée" } : m));
          return;
        }
        setMessages(prev => prev.map(m => m.id === msgId
          ? { ...m, content: type === "image" ? `Génération en cours… (${(i + 1) * 2}s)` : `Génération vidéo… (${Math.round((i + 1) * 5)}s)` }
          : m));
      } catch { /* keep polling */ }
    }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, loading: false, error: "Timeout" } : m));
  };

  // ── Send handler ──
  const handleSend = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || isLoading) return;

    const intent = detectIntent(value);
    const resultMsgId = uid();
    const brandCtx = activeVault ? buildBrandContext(activeVault) : "";

    setInput("");
    setIsLoading(true);

    setMessages(prev => [
      ...prev,
      { id: uid(), type: "user", content: value },
      {
        id: resultMsgId, type: "result", content: "", intent, loading: true,
        brandApplied: activeVault?.name,
        ...(intent === "chat" ? { multiResults: Object.fromEntries(COMPARE_MODELS.map(id => [id, ""])) } : {}),
      },
    ]);

    try {
      // ── Image ──
      if (intent === "image") {
        const res = await fetch("/api/generate/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: value, style: "photorealistic", size: "landscape" }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessages(prev => prev.map(m => m.id === resultMsgId ? { ...m, loading: false, error: data.error ?? "Erreur" } : m));
        } else if (data.url) {
          setMessages(prev => prev.map(m => m.id === resultMsgId ? { ...m, loading: false, imageUrl: data.url, model: data.model } : m));
        } else if (data.predictionId) {
          await pollPrediction(data.predictionId, resultMsgId, "image", value);
        }
        setIsLoading(false);
        return;
      }

      // ── Video ──
      if (intent === "video") {
        const res = await fetch("/api/generate/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: value, duration: 5 }),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessages(prev => prev.map(m => m.id === resultMsgId ? { ...m, loading: false, error: data.error ?? "Erreur" } : m));
        } else if (data.predictionId) {
          await pollPrediction(data.predictionId, resultMsgId, "video", value);
        }
        setIsLoading(false);
        return;
      }

      // ── Compare (multi-model) ──
      if (intent === "chat") {
        const enrichedPrompt = brandCtx ? `${brandCtx}${value}` : value;
        const res = await fetch("/api/chat/multi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: enrichedPrompt, modelIds: COMPARE_MODELS }),
        });
        if (!res.ok) {
          const err = await res.json();
          setMessages(prev => prev.map(m => m.id === resultMsgId ? { ...m, loading: false, error: err.error ?? "Erreur" } : m));
          setIsLoading(false);
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value: chunk } = await reader.read();
          if (done) break;
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") continue;
            try {
              const event = JSON.parse(raw);
              if (event.chunk) {
                setMessages(prev => prev.map(m => m.id === resultMsgId ? {
                  ...m, loading: false,
                  multiResults: { ...m.multiResults, [event.model]: (m.multiResults?.[event.model] ?? "") + event.chunk },
                } : m));
              }
            } catch { /* ignore */ }
          }
        }
        setIsLoading(false);
        return;
      }

      // ── Text / Code (streaming, brand-enriched) ──
      const endpoint = intent === "code" ? "/api/generate/code" : "/api/generate/text";
      const enrichedPrompt = brandCtx ? `${brandCtx}${value}` : value;
      const body = intent === "code"
        ? { prompt: enrichedPrompt, language: "TypeScript" }
        : { prompt: enrichedPrompt, format: "Post LinkedIn" };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages(prev => prev.map(m => m.id === resultMsgId ? { ...m, loading: false, error: err.error ?? "Erreur" } : m));
        setIsLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let txt = "";

      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        txt += decoder.decode(chunk, { stream: true });
        setMessages(prev => prev.map(m => m.id === resultMsgId ? { ...m, loading: false, content: txt } : m));
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === resultMsgId ? { ...m, loading: false, error: "Erreur de connexion" } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--background)" }}>

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-6 pb-8">
            <div className="mb-8 text-center">
              <h1
                className="mb-2"
                style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 500, letterSpacing: "-0.035em", color: "var(--foreground)", lineHeight: 1.15 }}
              >
                Que voulez-vous créer ?
              </h1>
              <p style={{ fontSize: "15px", color: "var(--muted-foreground)" }}>
                Texte, image, vidéo, code — décrivez en une phrase.
              </p>
              {activeVault && (
                <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full" style={{ background: "var(--ora-signal-light)", border: "1px solid var(--ora-signal-ring)" }}>
                  <Shield size={11} style={{ color: "var(--ora-signal)" }} />
                  <span style={{ fontSize: "12px", color: "var(--ora-signal)", fontWeight: 500 }}>
                    {activeVault.name} actif
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-[600px]">
              {SUGGESTIONS.map((s) => {
                const Icon = INTENT_ICONS[s.intent];
                return (
                  <button
                    key={s.label}
                    onClick={() => handleSend(s.label)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all"
                    style={{ fontSize: "13px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ora-signal-ring)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                  >
                    <Icon size={13} style={{ color: "var(--ora-signal)", flexShrink: 0 }} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-w-[800px] mx-auto px-4 py-8 space-y-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} copied={copied} onCopy={handleCopy} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ── */}
      <div className="shrink-0 px-4 py-3" style={{ background: "var(--card)", borderTop: "1px solid var(--border)" }}>
        <div className="max-w-[800px] mx-auto">
          {/* Vault selector row */}
          {vaults.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <div className="relative">
                <button
                  onClick={() => setVaultMenuOpen(!vaultMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors"
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    background: activeVault ? "var(--ora-signal-light)" : "var(--secondary)",
                    border: `1px solid ${activeVault ? "var(--ora-signal-ring)" : "var(--border)"}`,
                    color: activeVault ? "var(--ora-signal)" : "var(--muted-foreground)",
                  }}
                >
                  <Shield size={11} />
                  {activeVault ? activeVault.name : "Aucun vault"}
                  <ChevronDown size={10} />
                </button>
                {vaultMenuOpen && (
                  <div
                    className="absolute bottom-full left-0 mb-1 rounded-xl overflow-hidden z-10 min-w-[180px]"
                    style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                  >
                    <button
                      onClick={() => { setActiveVault(null); setVaultMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 transition-colors hover:bg-[var(--secondary)]"
                      style={{ fontSize: "13px", color: "var(--muted-foreground)" }}
                    >
                      Aucun vault
                    </button>
                    {vaults.map(v => (
                      <button
                        key={v.id}
                        onClick={() => { setActiveVault(v); setVaultMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 transition-colors hover:bg-[var(--secondary)]"
                        style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: activeVault?.id === v.id ? 500 : 400 }}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                {activeVault ? "Brand Vault actif — contenu brand-compliant" : "Sans Brand Vault"}
              </span>
            </div>
          )}

          <div
            className="flex items-end gap-2 rounded-2xl px-4 py-2"
            style={{ background: "var(--input-background)", border: "1px solid var(--border)" }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Décrivez ce que vous voulez créer…"
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent outline-none resize-none"
              style={{ fontSize: "15px", color: "var(--foreground)", minHeight: "24px", maxHeight: "120px", lineHeight: "1.5" }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="p-2 rounded-xl transition-all disabled:opacity-40 shrink-0"
              style={{ background: "var(--ora-signal)", color: "#ffffff" }}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-center mt-2" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg, copied, onCopy,
}: {
  msg: Message;
  copied: string | null;
  onCopy: (content: string, id: string) => void;
}) {
  if (msg.type === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3"
          style={{ fontSize: "15px", background: "var(--primary)", color: "var(--primary-foreground)", lineHeight: 1.5 }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  const Icon = msg.intent ? INTENT_ICONS[msg.intent] : Sparkles;
  const label = msg.intent ? INTENT_LABELS[msg.intent] : "Génération";

  return (
    <div className="flex gap-3 justify-start">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "var(--ora-signal-light)" }}
      >
        <Icon size={14} style={{ color: "var(--ora-signal)" }} />
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="uppercase" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--ora-signal)" }}>
            {label}
          </span>
          {msg.model && <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{msg.model}</span>}
          {msg.brandApplied && (
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ fontSize: "10px", background: "var(--ora-signal-light)", color: "var(--ora-signal)", border: "1px solid var(--ora-signal-ring)" }}
            >
              <Shield size={9} /> {msg.brandApplied}
            </span>
          )}
        </div>

        {/* Loading */}
        {msg.loading && (
          <div
            className="rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <Loader2 size={14} className="animate-spin" style={{ color: "var(--ora-signal)" }} />
            <span style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
              {msg.content || "Génération en cours…"}
            </span>
          </div>
        )}

        {/* Error */}
        {msg.error && !msg.loading && (
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: "rgba(212,24,61,0.06)", border: "1px solid rgba(212,24,61,0.15)", color: "var(--destructive)", fontSize: "14px" }}
          >
            {msg.error}
          </div>
        )}

        {/* Multi-model comparison */}
        {msg.multiResults && !msg.loading && !msg.error && (
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${COMPARE_MODELS.length}, 1fr)` }}>
            {COMPARE_MODELS.map(modelId => (
              <div
                key={modelId}
                className="rounded-xl flex flex-col"
                style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
              >
                <div
                  className="px-3 py-2 flex items-center justify-between"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
                    {COMPARE_LABELS[modelId]}
                  </span>
                  {msg.multiResults![modelId] && (
                    <button
                      onClick={() => onCopy(msg.multiResults![modelId], `${msg.id}-${modelId}`)}
                      className="transition-colors"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {copied === `${msg.id}-${modelId}`
                        ? <Check size={11} style={{ color: "#16a34a" }} />
                        : <Copy size={11} />}
                    </button>
                  )}
                </div>
                <div className="px-3 py-3 flex-1">
                  {msg.multiResults![modelId] ? (
                    <div className="prose prose-sm max-w-none" style={{ color: "var(--foreground)", fontSize: "13px" }}>
                      <ReactMarkdown>{msg.multiResults![modelId]}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" style={{ color: "var(--ora-signal)" }} />
                      <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>En cours…</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image result */}
        {msg.imageUrl && !msg.loading && (
          <div
            className="rounded-2xl rounded-tl-sm overflow-hidden"
            style={{ border: "1px solid var(--border)", maxWidth: "480px" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={msg.imageUrl} alt="Generated" className="w-full object-cover" />
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ borderTop: "1px solid var(--border)", background: "var(--card)" }}
            >
              <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{msg.model ?? "flux-schnell"}</span>
              <a
                href={msg.imageUrl} download="ora-image.webp" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1" style={{ fontSize: "12px", color: "var(--ora-signal)" }}
              >
                <Download size={11} /> Télécharger
              </a>
            </div>
          </div>
        )}

        {/* Video result */}
        {msg.videoUrl && !msg.loading && (
          <div
            className="rounded-2xl rounded-tl-sm overflow-hidden"
            style={{ border: "1px solid var(--border)", maxWidth: "480px" }}
          >
            <video src={msg.videoUrl} controls autoPlay loop className="w-full" />
            <div
              className="flex items-center justify-between px-3 py-2"
              style={{ borderTop: "1px solid var(--border)", background: "var(--card)" }}
            >
              <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{msg.model ?? "wan-2.1"}</span>
              <a
                href={msg.videoUrl} download="ora-video.mp4" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1" style={{ fontSize: "12px", color: "var(--ora-signal)" }}
              >
                <Download size={11} /> Télécharger
              </a>
            </div>
          </div>
        )}

        {/* Text / code result */}
        {!msg.loading && !msg.error && !msg.imageUrl && !msg.videoUrl && !msg.multiResults && msg.content && (
          <div className="rounded-2xl rounded-tl-sm" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="px-5 py-4 prose prose-sm max-w-none" style={{ color: "var(--foreground)" }}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
            <div className="flex justify-end px-4 py-2" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => onCopy(msg.content, msg.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors hover:bg-[var(--secondary)]"
                style={{ fontSize: "12px", color: "var(--muted-foreground)" }}
              >
                {copied === msg.id
                  ? <><Check size={11} style={{ color: "#16a34a" }} /> Copié</>
                  : <><Copy size={11} /> Copier</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
