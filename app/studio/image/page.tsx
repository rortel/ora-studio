"use client";

import { useState } from "react";
import { ImageIcon, Download, Loader2 } from "lucide-react";
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
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  const pollPrediction = async (predictionId: string) => {
    const encodedPrompt = encodeURIComponent(prompt);
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await fetch(`/api/predictions/${predictionId}?prompt=${encodedPrompt}&type=image`);
        const data = await res.json();
        if (data.status === "succeeded") {
          const url = Array.isArray(data.output) ? data.output[0] : data.output;
          setImageUrl(url);
          setModel(data.model ?? "flux-schnell");
          setLoading(false);
          setStatusMsg("");
          return;
        }
        if (data.status === "failed" || data.error) {
          setError(data.error ?? "La génération a échoué");
          setLoading(false);
          setStatusMsg("");
          return;
        }
        setStatusMsg(`Génération en cours… (${(i + 1) * 2}s)`);
      } catch {
        // transient error — keep polling
      }
    }
    setError("Timeout : la génération a pris trop de temps (> 2 min)");
    setLoading(false);
    setStatusMsg("");
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    setImageUrl("");
    setModel("");
    setStatusMsg("Démarrage…");

    try {
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, size }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Erreur de génération");
        setLoading(false);
        setStatusMsg("");
        return;
      }

      if (data.url) {
        setImageUrl(data.url);
        setModel(data.model ?? "dall-e-3");
        setLoading(false);
        setStatusMsg("");
      } else if (data.predictionId) {
        setStatusMsg("Génération en cours…");
        await pollPrediction(data.predictionId);
      } else {
        setError("Réponse inattendue du serveur");
        setLoading(false);
        setStatusMsg("");
      }
    } catch {
      setError("Erreur de connexion");
      setLoading(false);
      setStatusMsg("");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto" style={{ background: "var(--background)" }}>
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg" style={{ background: "var(--ora-signal-light)" }}>
          <ImageIcon size={18} style={{ color: "var(--ora-signal)" }} />
        </div>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 500, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
            Génération Image
          </h1>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
            FLUX Schnell via Replicate · 5 crédits
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-5">
          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Description
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
              placeholder="Ex: Un café parisien au lever du soleil, ambiance chaleureuse, lumière dorée..."
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

          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Style
            </label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={clsx("px-3 py-1.5 rounded-lg transition-all")}
                  style={{
                    fontSize: "13px",
                    fontWeight: style === s.id ? 500 : 400,
                    border: `1px solid ${style === s.id ? "var(--ora-signal-ring)" : "var(--border)"}`,
                    background: style === s.id ? "var(--ora-signal-light)" : "transparent",
                    color: style === s.id ? "var(--ora-signal)" : "var(--muted-foreground)",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Format
            </label>
            <div className="flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSize(s.id as typeof size)}
                  className="flex-1 py-2 rounded-lg transition-all text-center"
                  style={{
                    border: `1px solid ${size === s.id ? "var(--ora-signal-ring)" : "var(--border)"}`,
                    background: size === s.id ? "var(--ora-signal-light)" : "transparent",
                    color: size === s.id ? "var(--ora-signal)" : "var(--muted-foreground)",
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: size === s.id ? 500 : 400 }}>{s.label}</div>
                  <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{s.ratio}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-opacity disabled:opacity-40"
            style={{ fontSize: "14px", fontWeight: 500, background: "var(--ora-signal)", color: "#ffffff" }}
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" />{statusMsg || "Génération…"}</>
            ) : (
              <><ImageIcon size={14} />Générer l&apos;image</>
            )}
          </button>

          {error && (
            <div
              className="rounded-xl px-4 py-3"
              style={{ background: "rgba(212,24,61,0.06)", border: "1px solid rgba(212,24,61,0.15)", color: "var(--destructive)", fontSize: "13px" }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Result */}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Résultat
          </label>
          <div
            className={clsx(
              "relative rounded-xl overflow-hidden",
              size === "portrait" ? "aspect-[9/16]" : size === "square" ? "aspect-square" : "aspect-video"
            )}
            style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
          >
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 size={28} className="animate-spin" style={{ color: "var(--ora-signal)" }} />
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{statusMsg || "Génération en cours…"}</p>
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>10 à 30 secondes</p>
              </div>
            )}
            {!loading && !imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <ImageIcon size={36} className="mx-auto mb-2" style={{ color: "var(--muted-foreground)" }} />
                  <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>L&apos;image apparaîtra ici</p>
                </div>
              </div>
            )}
            {imageUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt={prompt} className="w-full h-full object-cover" />
                <div className="absolute bottom-3 right-3">
                  <a
                    href={imageUrl}
                    download="ora-studio-image.webp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
                    style={{ fontSize: "12px", background: "rgba(255,255,255,0.9)", color: "var(--foreground)", backdropFilter: "blur(4px)" }}
                  >
                    <Download size={11} />
                    Télécharger
                  </a>
                </div>
                {model && (
                  <div className="absolute top-3 left-3">
                    <span
                      className="px-2 py-1 rounded-md"
                      style={{ fontSize: "10px", background: "rgba(255,255,255,0.85)", color: "var(--muted-foreground)", backdropFilter: "blur(4px)" }}
                    >
                      {model}
                    </span>
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
