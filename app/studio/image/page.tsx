"use client";

import { useState } from "react";
import { ImageIcon, Download, Loader2 } from "lucide-react";
import Image from "next/image";
import { clsx } from "clsx";

const STYLES = [
  { id: "photorealistic", label: "Photoréaliste" },
  { id: "digital art", label: "Art Digital" },
  { id: "cinematic", label: "Cinématique" },
  { id: "watercolor painting", label: "Aquarelle" },
  { id: "3D render", label: "3D Render" },
  { id: "minimalist", label: "Minimaliste" },
  { id: "oil painting", label: "Peinture" },
  { id: "anime", label: "Anime" },
];

const SIZES = [
  { id: "landscape", label: "Paysage", ratio: "16:9" },
  { id: "portrait", label: "Portrait", ratio: "9:16" },
  { id: "square", label: "Carré", ratio: "1:1" },
];

export default function ImagePage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(STYLES[0].id);
  const [size, setSize] = useState<"landscape" | "portrait" | "square">("landscape");
  const [imageUrl, setImageUrl] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    setImageUrl("");

    try {
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, size }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Erreur de génération");
        return;
      }

      setImageUrl(data.url);
      setModel(data.model);
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-emerald-500/15">
          <ImageIcon size={20} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="text-white font-bold text-xl">Génération Image</h1>
          <p className="text-zinc-500 text-sm">FLUX via Fal AI · 5 crédits</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          {/* Prompt */}
          <div>
            <label className="text-zinc-400 text-xs mb-2 block">Description de l'image</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Un café parisien au lever du soleil, ambiance chaleureuse, lumière dorée..."
              rows={4}
              className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 placeholder-zinc-600 resize-none transition-colors"
            />
          </div>

          {/* Style */}
          <div>
            <label className="text-zinc-400 text-xs mb-2 block">Style</label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-sm transition-all border",
                    style === s.id
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                      : "border-border/30 text-zinc-400 hover:text-white hover:border-border"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="text-zinc-400 text-xs mb-2 block">Format</label>
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSize(s.id as typeof size)}
                  className={clsx(
                    "flex-1 py-2 rounded-lg text-sm transition-all border text-center",
                    size === s.id
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                      : "border-border/30 text-zinc-400 hover:text-white hover:border-border"
                  )}
                >
                  <div className="font-medium">{s.label}</div>
                  <div className="text-xs text-zinc-500">{s.ratio}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-medium py-3 rounded-xl text-sm transition-all"
          >
            {loading ? (
              <><Loader2 size={15} className="animate-spin" /> Génération en cours...</>
            ) : (
              <><ImageIcon size={15} /> Générer l'image</>
            )}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}
        </div>

        {/* Result */}
        <div>
          <label className="text-zinc-400 text-xs mb-2 block">Résultat</label>
          <div
            className={clsx(
              "relative rounded-xl border border-border/40 overflow-hidden bg-surface2",
              size === "portrait" ? "aspect-[9/16]" : size === "square" ? "aspect-square" : "aspect-video"
            )}
          >
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin text-emerald-400" />
                <p className="text-zinc-400 text-sm">Génération en cours...</p>
                <p className="text-zinc-600 text-xs">Cela peut prendre 10 à 30 secondes</p>
              </div>
            )}
            {!loading && !imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <ImageIcon size={40} className="text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-600 text-sm">L'image apparaîtra ici</p>
                </div>
              </div>
            )}
            {imageUrl && (
              <>
                <Image src={imageUrl} alt={prompt} fill className="object-cover" />
                <div className="absolute bottom-3 right-3">
                  <a
                    href={imageUrl}
                    download="ora-studio-image.png"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-black/70 hover:bg-black/90 text-white text-xs px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Download size={12} />
                    Télécharger
                  </a>
                </div>
                {model && (
                  <div className="absolute top-3 left-3">
                    <span className="bg-black/60 text-zinc-300 text-[10px] px-2 py-1 rounded-md">{model}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
