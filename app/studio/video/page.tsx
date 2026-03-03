"use client";

import { useState } from "react";
import { Video, Download, Loader2, Info } from "lucide-react";

export default function VideoPage() {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [videoUrl, setVideoUrl] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  const poll = async (predictionId: string) => {
    const url = `/api/predictions/${predictionId}?prompt=${encodeURIComponent(prompt)}`;
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "succeeded") {
        const vid = Array.isArray(data.output) ? data.output[0] : data.output;
        setVideoUrl(vid);
        setModel("wavespeedai/wan-2.1-t2v-480p");
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
      setStatusMsg(`En cours… (${Math.round((i + 1) * 5)}s)`);
    }
    setError("Timeout : la génération a pris trop de temps");
    setLoading(false);
    setStatusMsg("");
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    setVideoUrl("");
    setModel("");
    setStatusMsg("Démarrage…");

    try {
      const response = await fetch("/api/generate/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, duration }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Erreur de génération");
        setLoading(false);
        setStatusMsg("");
        return;
      }

      setStatusMsg("Génération en cours…");
      await poll(data.predictionId);
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
          <Video size={18} style={{ color: "var(--ora-signal)" }} />
        </div>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 500, color: "var(--foreground)", letterSpacing: "-0.02em" }}>
            Génération Vidéo
          </h1>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>WAN 2.1 via Replicate · 20 crédits</p>
        </div>
      </div>

      <div
        className="flex items-start gap-2 rounded-xl px-4 py-3 mb-6"
        style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.2)", color: "#a16207", fontSize: "13px" }}
      >
        <Info size={14} className="shrink-0 mt-0.5" />
        <p>La génération vidéo prend 1 à 3 minutes. Ne quittez pas la page.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div>
            <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Description de la vidéo
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Une voiture rouge qui roule sur une route côtière au coucher du soleil, plan cinématique, slow motion..."
              rows={5}
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
              Durée cible : {duration}s
            </label>
            <input
              type="range"
              min={3}
              max={5}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "var(--ora-signal)" }}
            />
            <div className="flex justify-between mt-1" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
              <span>3s</span>
              <span>5s</span>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-opacity disabled:opacity-40"
            style={{ fontSize: "14px", fontWeight: 500, background: "var(--ora-signal)", color: "#ffffff" }}
          >
            {loading ? (
              <><Loader2 size={14} className="animate-spin" /> {statusMsg || "Génération en cours…"}</>
            ) : (
              <><Video size={14} /> Générer la vidéo</>
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

        <div>
          <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Résultat
          </label>
          <div
            className="rounded-xl overflow-hidden aspect-video relative"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
          >
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 size={28} className="animate-spin" style={{ color: "var(--ora-signal)" }} />
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{statusMsg || "Génération de la vidéo…"}</p>
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>1 à 3 minutes</p>
              </div>
            )}
            {!loading && !videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Video size={36} className="mx-auto mb-2" style={{ color: "var(--muted-foreground)" }} />
                  <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>La vidéo apparaîtra ici</p>
                </div>
              </div>
            )}
            {videoUrl && (
              <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
            )}
          </div>

          {videoUrl && (
            <div className="flex items-center justify-between mt-3">
              {model && <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{model}</span>}
              <a
                href={videoUrl}
                download="ora-studio-video.mp4"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--secondary)]"
                style={{ fontSize: "12px", color: "var(--muted-foreground)" }}
              >
                <Download size={11} />
                Télécharger
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
