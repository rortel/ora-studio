"use client";

import { useState } from "react";
import { Music, Play, Download, Loader2, Volume2, Mic } from "lucide-react";

const VOICES = [
  { id: "alloy", name: "Alloy", desc: "Neutre, équilibré" },
  { id: "echo", name: "Echo", desc: "Chaleureux, masculin" },
  { id: "fable", name: "Fable", desc: "Expressif, britannique" },
  { id: "onyx", name: "Onyx", desc: "Profond, autoritaire" },
  { id: "nova", name: "Nova", desc: "Dynamique, féminin" },
  { id: "shimmer", name: "Shimmer", desc: "Doux, féminin" },
];

const SPEEDS = [
  { val: 0.75, label: "Lent" },
  { val: 1.0, label: "Normal" },
  { val: 1.25, label: "Rapide" },
  { val: 1.5, label: "Très rapide" },
];

export default function AudioPage() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("nova");
  const [speed, setSpeed] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function generate() {
    if (!text.trim()) return;
    setLoading(true);
    setError("");
    setAudioUrl(null);

    const res = await fetch("/api/audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, speed }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Erreur lors de la génération");
      setLoading(false);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setLoading(false);
  }

  const charCount = text.length;
  const estimatedCredits = 4;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "var(--ora-signal-light)" }}>
            <Music size={18} style={{ color: "var(--ora-signal)" }} />
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
            Génération audio
          </h1>
        </div>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
          Texte-vers-parole via OpenAI TTS. 4 crédits par génération.
        </p>
      </div>

      {/* Text input */}
      <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid var(--border)" }}>
        <div className="px-4 py-2.5 flex items-center justify-between"
          style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <Mic size={13} style={{ color: "var(--ora-signal)" }} />
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--foreground)" }}>Texte à lire</span>
          </div>
          <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{charCount} caractères</span>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Écris le texte à transformer en voix…"
          rows={6}
          className="w-full px-4 py-3 outline-none resize-none"
          style={{ fontSize: "14px", background: "var(--card)", color: "var(--foreground)", lineHeight: 1.6 }}
        />
      </div>

      {/* Voice selection */}
      <div className="mb-4">
        <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Voix
        </label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {VOICES.map(v => (
            <button key={v.id} onClick={() => setVoice(v.id)}
              className="p-3 rounded-xl text-left transition-all"
              style={{
                background: voice === v.id ? "var(--ora-signal-light)" : "var(--card)",
                border: `1px solid ${voice === v.id ? "var(--ora-signal)" : "var(--border)"}`,
              }}>
              <div style={{ fontSize: "13px", fontWeight: 500, color: voice === v.id ? "var(--ora-signal)" : "var(--foreground)" }}>
                {v.name}
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: 2 }}>{v.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Speed */}
      <div className="mb-6">
        <label style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Vitesse
        </label>
        <div className="flex gap-2 mt-2">
          {SPEEDS.map(s => (
            <button key={s.val} onClick={() => setSpeed(s.val)}
              className="px-3 py-1.5 rounded-lg transition-all"
              style={{
                fontSize: "12px", fontWeight: 500,
                background: speed === s.val ? "var(--ora-signal)" : "var(--secondary)",
                color: speed === s.val ? "white" : "var(--foreground)",
                border: speed === s.val ? "none" : "1px solid var(--border)",
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={loading || !text.trim()}
        className="w-full py-3 rounded-xl text-white flex items-center justify-center gap-2 transition-all"
        style={{
          background: "var(--ora-signal)",
          fontSize: "14px", fontWeight: 500,
          opacity: loading || !text.trim() ? 0.7 : 1,
        }}>
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Génération en cours…</>
        ) : (
          <><Volume2 size={16} /> Générer l'audio — {estimatedCredits} crédits</>
        )}
      </button>

      {error && (
        <p className="mt-3 text-center" style={{ fontSize: "13px", color: "#ef4444" }}>{error}</p>
      )}

      {/* Audio player */}
      {audioUrl && (
        <div className="mt-6 p-4 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Volume2 size={14} style={{ color: "var(--ora-signal)" }} />
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
                Résultat — voix {voice}
              </span>
            </div>
            <a href={audioUrl} download="ora-audio.mp3"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{ fontSize: "12px", background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
              <Download size={12} />
              Télécharger
            </a>
          </div>
          <audio controls className="w-full" src={audioUrl} />
        </div>
      )}
    </div>
  );
}
