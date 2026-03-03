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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-rose-500/15">
          <Video size={20} className="text-rose-400" />
        </div>
        <div>
          <h1 className="text-white font-bold text-xl">Génération Vidéo</h1>
          <p className="text-zinc-500 text-sm">WAN 2.1 via Replicate · 20 crédits</p>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm rounded-xl px-4 py-3 mb-6">
        <Info size={15} className="shrink-0 mt-0.5" />
        <p>La génération vidéo prend 1 à 3 minutes. Ne quittez pas la page.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-zinc-400 text-xs mb-2 block">Description de la vidéo</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Une voiture rouge qui roule sur une route côtière au coucher du soleil, plan cinématique, slow motion..."
              rows={5}
              className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-rose-500/50 placeholder-zinc-600 resize-none transition-colors"
            />
          </div>

          <div>
            <label className="text-zinc-400 text-xs mb-2 block">
              Durée cible : {duration}s
            </label>
            <input
              type="range"
              min={3}
              max={5}
              step={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-rose-500"
            />
            <div className="flex justify-between text-zinc-600 text-xs mt-1">
              <span>3s</span>
              <span>5s</span>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-medium py-3 rounded-xl text-sm transition-all"
          >
            {loading ? (
              <><Loader2 size={15} className="animate-spin" /> {statusMsg || "Génération en cours…"}</>
            ) : (
              <><Video size={15} /> Générer la vidéo</>
            )}
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}
        </div>

        <div>
          <label className="text-zinc-400 text-xs mb-2 block">Résultat</label>
          <div className="rounded-xl border border-border/40 overflow-hidden bg-surface2 aspect-video relative">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Loader2 size={32} className="animate-spin text-rose-400" />
                <p className="text-zinc-400 text-sm">{statusMsg || "Génération de la vidéo…"}</p>
                <p className="text-zinc-600 text-xs">1 à 3 minutes</p>
              </div>
            )}
            {!loading && !videoUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Video size={40} className="text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-600 text-sm">La vidéo apparaîtra ici</p>
                </div>
              </div>
            )}
            {videoUrl && (
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {videoUrl && (
            <div className="flex items-center justify-between mt-3">
              {model && <span className="text-zinc-600 text-xs">{model}</span>}
              <a
                href={videoUrl}
                download="ora-studio-video.mp4"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
              >
                <Download size={12} />
                Télécharger
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
