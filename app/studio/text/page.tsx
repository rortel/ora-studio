"use client";

import { useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { clsx } from "clsx";

const FORMATS = [
  "Article de blog",
  "Email professionnel",
  "Post LinkedIn",
  "Résumé exécutif",
  "Communiqué de presse",
  "Description produit",
  "Pitch de vente",
  "Newsletter",
];

export default function TextPage() {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState(FORMATS[0]);
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
      const response = await fetch("/api/generate/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, format }),
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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-violet-500/15">
          <Sparkles size={20} className="text-violet-400" />
        </div>
        <div>
          <h1 className="text-white font-bold text-xl">Génération Texte</h1>
          <p className="text-zinc-500 text-sm">Mistral Large · 1 crédit</p>
        </div>
      </div>

      {/* Format selector */}
      <div className="mb-4">
        <label className="text-zinc-400 text-xs mb-2 block">Format</label>
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                format === f
                  ? "bg-violet-500/15 border-violet-500/30 text-violet-300"
                  : "border-border/30 text-zinc-400 hover:text-white hover:border-border"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div className="mb-4">
        <label className="text-zinc-400 text-xs mb-2 block">Votre demande</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Ex: Rédigez un ${format.toLowerCase()} sur les avantages de l'IA pour les PME`}
          rows={4}
          className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500/50 placeholder-zinc-600 resize-none transition-colors"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 disabled:opacity-40 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-all"
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Sparkles size={15} />
        )}
        {loading ? "Génération..." : "Générer"}
      </button>

      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-zinc-400 text-xs">Résultat</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copied ? "Copié" : "Copier"}
            </button>
          </div>
          <div className="bg-surface border border-border/40 rounded-xl px-6 py-5 prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
