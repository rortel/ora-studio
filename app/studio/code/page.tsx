"use client";

import { useState } from "react";
import { Code2, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { clsx } from "clsx";

const LANGUAGES = [
  "TypeScript", "JavaScript", "Python", "Rust", "Go", "Java", "C#",
  "PHP", "SQL", "Bash", "HTML/CSS", "Swift",
];

export default function CodePage() {
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult("");

    try {
      const response = await fetch("/api/generate/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, language }),
      });

      if (!response.ok) {
        const err = await response.json();
        setError(err.error ?? "Erreur de génération");
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setResult(text);
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto" style={{ background: "var(--background)" }}>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg" style={{ background: "var(--ora-signal-light)" }}>
          <Code2 size={18} style={{ color: "var(--ora-signal)" }} />
        </div>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 500, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
            Génération Code
          </h1>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Mistral Large · 2 crédits</p>
        </div>
      </div>

      <div className="mb-6">
        <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Langage
        </label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={clsx("px-3 py-1.5 rounded-lg transition-all")}
              style={{
                fontSize: "13px",
                fontWeight: language === l ? 500 : 400,
                border: `1px solid ${language === l ? "var(--ora-signal-ring)" : "var(--border)"}`,
                background: language === l ? "var(--ora-signal-light)" : "transparent",
                color: language === l ? "var(--ora-signal)" : "var(--muted-foreground)",
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5">
        <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Décrivez ce que vous voulez coder
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Ex: Une fonction ${language} qui trie un tableau d'objets par date`}
          rows={4}
          className="w-full rounded-xl px-4 py-3 outline-none resize-none transition-colors"
          style={{
            fontSize: "14px",
            background: "var(--input-background)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--ora-signal)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg transition-opacity disabled:opacity-40"
        style={{ fontSize: "14px", fontWeight: 500, background: "var(--ora-signal)", color: "#ffffff" }}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Code2 size={14} />
        )}
        {loading ? "Génération..." : "Générer le code"}
      </button>

      {error && (
        <div
          className="mt-4 rounded-xl px-4 py-3"
          style={{ background: "rgba(212,24,61,0.06)", border: "1px solid rgba(212,24,61,0.15)", color: "var(--destructive)", fontSize: "13px" }}
        >
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Code généré
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors hover:bg-[var(--secondary)]"
              style={{ fontSize: "12px", color: "var(--muted-foreground)" }}
            >
              {copied ? <Check size={12} style={{ color: "#16a34a" }} /> : <Copy size={12} />}
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <div
            className="rounded-xl px-6 py-5 prose prose-sm max-w-none font-mono"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
          >
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
