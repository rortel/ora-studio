"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Clapperboard, Plus, Trash2, Globe, Upload, Loader2, Sparkles,
  ImageIcon, Download, Shield, CheckCircle, AlertCircle, Copy,
  Wand2, X, RotateCcw, FileText, ChevronDown,
} from "lucide-react";
import { clsx } from "clsx";

// ─── Types ──────────────────────────────────────────────────────────────────

type SceneStatus = "empty" | "draft" | "generating" | "ready";
type GenSize = "square" | "portrait" | "landscape";

interface Scene {
  id: string;
  order: number;
  title: string;
  script: string;
  caption: string;
  visual_prompt: string;
  image_url?: string;
  status: SceneStatus;
}

interface Vault {
  id: string;
  name: string;
  brand_name?: string;
  guidelines?: {
    editorial?: {
      tone?: string;
      vocabulary_approved?: string[];
      vocabulary_forbidden?: string[];
      key_messages?: string[];
    };
    visual?: {
      style?: string;
      primary_colors?: string[];
      imagery_style?: string;
    };
  };
}

interface BrandCheck {
  score: number;
  warnings: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

function makeScene(order: number): Scene {
  return { id: uid(), order, title: `Scène ${order}`, script: "", caption: "", visual_prompt: "", status: "empty" };
}

function checkBrand(scene: Scene, vault: Vault | null): BrandCheck {
  if (!vault?.guidelines) return { score: 100, warnings: [] };
  const g = vault.guidelines;
  const text = `${scene.caption} ${scene.script}`.toLowerCase();
  const warnings: string[] = [];
  let score = 100;

  for (const w of g.editorial?.vocabulary_forbidden ?? []) {
    if (w && text.includes(w.toLowerCase())) {
      warnings.push(`Mot interdit détecté : "${w}"`);
      score -= 25;
    }
  }

  const approved = g.editorial?.vocabulary_approved ?? [];
  if (approved.length > 0 && !approved.some((w) => w && text.includes(w.toLowerCase()))) {
    warnings.push("Aucun terme du vocabulaire approuvé utilisé");
    score -= 10;
  }

  const style = (g.visual?.style ?? "").split(/[\s,]/)[0];
  if (style.length > 3 && scene.visual_prompt && !scene.visual_prompt.toLowerCase().includes(style.toLowerCase())) {
    warnings.push(`Prompt visuel : intégrer le style "${g.visual?.style}"`);
    score -= 10;
  }

  if (scene.caption && scene.caption.length < 30 && scene.status !== "empty") {
    warnings.push("Caption trop courte pour les réseaux sociaux");
    score -= 5;
  }

  return { score: Math.max(0, score), warnings };
}

function ScoreBar({ score }: { score: number }) {
  const barColor = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";
  const textColor = score >= 80 ? "#16a34a" : score >= 60 ? "#a16207" : "var(--destructive)";
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: "6px", background: "var(--secondary)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: barColor }}
        />
      </div>
      <span
        className="text-xs font-mono font-bold tabular-nums"
        style={{ color: textColor }}
      >
        {score}%
      </span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ProductionPage() {
  // Project state
  const [projectTitle, setProjectTitle] = useState("Nouveau projet");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Vaults
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [vaultId, setVaultId] = useState("");

  // Import state
  const [importTab, setImportTab] = useState<"url" | "doc">("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [docFilename, setDocFilename] = useState("");
  const [sceneCount, setSceneCount] = useState(5);
  const [isParsing, setIsParsing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [importError, setImportError] = useState("");

  // Generation
  const [genSize, setGenSize] = useState<GenSize>("square");
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Derived
  const selectedScene = scenes.find((s) => s.id === selectedId) ?? null;
  const selectedVault = vaults.find((v) => v.id === vaultId) ?? null;
  const brandCheck = selectedScene ? checkBrand(selectedScene, selectedVault) : null;

  useEffect(() => {
    fetch("/api/vault").then((r) => r.json()).then(setVaults).catch(() => {});
  }, []);

  const updateScene = useCallback((id: string, patch: Partial<Scene>) => {
    setScenes((prev) =>
      prev.map((s) => s.id === id ? { ...s, ...patch, status: s.status === "ready" && patch.image_url === undefined ? "draft" : s.status } : s)
    );
  }, []);

  const addScene = () => {
    const s = makeScene(scenes.length + 1);
    setScenes((prev) => [...prev, s]);
    setSelectedId(s.id);
  };

  const deleteScene = (id: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
    if (selectedId === id) setSelectedId(null);
  };

  // ── Parse document ────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setImportError("");
    setDocFilename(file.name);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/production/parse-doc", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExtractedText(data.text);
    } catch (err) {
      setImportError(String(err));
    }
    setIsParsing(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Extract & structure ───────────────────────────────────────────────────
  const handleStructure = async (content?: string) => {
    const text = content ?? extractedText;
    const url = importTab === "url" && !text ? sourceUrl : undefined;
    if (!text && !url) return;
    setIsExtracting(true);
    setImportError("");
    try {
      const res = await fetch("/api/production/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, text: text || undefined, vault_id: vaultId || undefined, scene_count: sceneCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.project_title) setProjectTitle(data.project_title);
      const structured: Scene[] = (data.scenes ?? []).map(
        (s: Omit<Scene, "id" | "order" | "status">, i: number) => ({
          id: uid(), order: i + 1, status: "draft" as SceneStatus,
          title: s.title ?? `Scène ${i + 1}`,
          script: s.script ?? "",
          caption: s.caption ?? "",
          visual_prompt: s.visual_prompt ?? "",
        })
      );
      setScenes(structured);
      setSelectedId(structured[0]?.id ?? null);
    } catch (err) {
      setImportError(String(err));
    }
    setIsExtracting(false);
  };

  // ── Poll Replicate prediction ─────────────────────────────────────────────
  const pollImage = useCallback(async (sceneId: string, predictionId: string, prompt: string) => {
    const encoded = encodeURIComponent(prompt);
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await fetch(`/api/predictions/${predictionId}?prompt=${encoded}&type=image`);
        const data = await res.json();
        if (data.status === "succeeded") {
          const url = Array.isArray(data.output) ? data.output[0] : data.output;
          setScenes((prev) =>
            prev.map((s) => s.id === sceneId ? { ...s, image_url: url, status: "ready" } : s)
          );
          return;
        }
        if (data.status === "failed" || data.error) {
          updateScene(sceneId, { status: "draft" });
          return;
        }
      } catch { /* keep polling on transient errors */ }
    }
    updateScene(sceneId, { status: "draft" });
  }, [updateScene]);

  // ── Generate image for one scene ──────────────────────────────────────────
  const handleGenerate = useCallback(async (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId);
    if (!scene?.visual_prompt) return;
    updateScene(sceneId, { status: "generating" });
    try {
      const res = await fetch("/api/generate/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: scene.visual_prompt, size: genSize }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // DALL-E returns url directly; Replicate returns predictionId
      if (data.url) {
        setScenes((prev) =>
          prev.map((s) => s.id === sceneId ? { ...s, image_url: data.url, status: "ready" } : s)
        );
      } else if (data.predictionId) {
        await pollImage(sceneId, data.predictionId, scene.visual_prompt);
      } else {
        updateScene(sceneId, { status: "draft" });
      }
    } catch {
      updateScene(sceneId, { status: "draft" });
    }
  }, [scenes, genSize, updateScene, pollImage]);

  // ── Generate all ──────────────────────────────────────────────────────────
  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    for (const s of scenes) {
      if (s.visual_prompt && s.status !== "ready" && s.status !== "generating") {
        await handleGenerate(s.id);
      }
    }
    setIsGeneratingAll(false);
  };

  // ── Export as Markdown ────────────────────────────────────────────────────
  const handleExport = () => {
    const md = [
      `# ${projectTitle}\n`,
      ...scenes.map((s) =>
        [
          `## Scène ${s.order} — ${s.title}`,
          `\n### Script\n${s.script}`,
          `\n### Caption\n${s.caption}`,
          `\n### Prompt visuel\n${s.visual_prompt}`,
          s.image_url ? `\n### Visuel généré\n![${s.title}](${s.image_url})` : "",
        ].join("\n")
      ),
    ].join("\n\n---\n\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    a.download = `${projectTitle.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ height: "100vh", overflow: "hidden", background: "var(--background)" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="shrink-0 h-14 flex items-center gap-4 px-5"
        style={{
          background: "var(--card)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2.5 mr-1">
          <div
            className="p-1.5 rounded-lg"
            style={{ background: "var(--ora-signal-light)" }}
          >
            <Clapperboard size={15} style={{ color: "var(--ora-signal)" }} />
          </div>
          <span
            className="font-semibold text-sm whitespace-nowrap"
            style={{ color: "var(--foreground)" }}
          >
            Studio Production
          </span>
        </div>

        <div style={{ width: "1px", height: "16px", background: "var(--border)" }} />

        <input
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          className="flex-1 max-w-sm text-sm px-1 py-0.5 min-w-0 bg-transparent focus:outline-none transition-colors"
          style={{
            color: "var(--foreground)",
            borderBottom: "1px solid transparent",
          }}
          onFocus={(e) => (e.currentTarget.style.borderBottomColor = "var(--ora-signal)")}
          onBlur={(e) => (e.currentTarget.style.borderBottomColor = "transparent")}
          placeholder="Nom du projet"
        />

        <div className="flex items-center gap-3 ml-auto shrink-0">
          {/* Vault selector */}
          <div className="flex items-center gap-2">
            <Shield size={13} style={{ color: "var(--muted-foreground)" }} className="shrink-0" />
            <div className="relative">
              <select
                value={vaultId}
                onChange={(e) => setVaultId(e.target.value)}
                className="appearance-none text-xs rounded-lg pl-3 pr-7 py-1.5 focus:outline-none cursor-pointer"
                style={{
                  background: "var(--secondary)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                }}
              >
                <option value="">Aucun vault</option>
                {vaults.map((v) => (
                  <option key={v.id} value={v.id}>{v.brand_name ?? v.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--muted-foreground)" }} />
            </div>
          </div>

          {scenes.length > 0 && (
            <>
              <button
                onClick={handleGenerateAll}
                disabled={isGeneratingAll}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 whitespace-nowrap"
                style={{
                  background: "var(--ora-signal-light)",
                  color: "var(--ora-signal)",
                  border: "1px solid var(--ora-signal-ring)",
                }}
              >
                {isGeneratingAll ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Tout générer
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
                style={{
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                <Download size={12} />
                Exporter
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left Panel — Import ─────────────────────────────────────── */}
        <aside
          className="w-72 shrink-0 flex flex-col overflow-y-auto"
          style={{
            background: "var(--card)",
            borderRight: "1px solid var(--border)",
          }}
        >
          <div className="p-4 space-y-5">
            <div>
              <h2
                className="mb-3 block"
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                }}
              >
                Importer
              </h2>

              {/* Import tabs */}
              <div
                className="flex rounded-lg p-0.5 mb-3"
                style={{ background: "var(--secondary)" }}
              >
                <button
                  onClick={() => setImportTab("url")}
                  className={clsx("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all")}
                  style={
                    importTab === "url"
                      ? { background: "var(--card)", color: "var(--foreground)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }
                      : { color: "var(--muted-foreground)" }
                  }
                >
                  <Globe size={12} /> URL
                </button>
                <button
                  onClick={() => setImportTab("doc")}
                  className={clsx("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all")}
                  style={
                    importTab === "doc"
                      ? { background: "var(--card)", color: "var(--foreground)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }
                      : { color: "var(--muted-foreground)" }
                  }
                >
                  <FileText size={12} /> Document
                </button>
              </div>

              {/* URL tab */}
              {importTab === "url" && (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleStructure()}
                    placeholder="https://monsite.com/produit"
                    className="w-full text-xs rounded-xl px-3 py-2.5 focus:outline-none transition-colors"
                    style={{
                      background: "var(--input-background)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                  <p style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>Page produit, service, landing page…</p>
                </div>
              )}

              {/* Doc tab */}
              {importTab === "doc" && (
                <div className="space-y-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={isParsing}
                    className="w-full flex flex-col items-center gap-2.5 rounded-xl p-5 text-center transition-all group"
                    style={{
                      border: "1px dashed var(--border)",
                      background: "var(--secondary)",
                    }}
                  >
                    {isParsing ? (
                      <Loader2 size={22} className="animate-spin" style={{ color: "var(--ora-signal)" }} />
                    ) : (
                      <Upload size={22} style={{ color: "var(--muted-foreground)" }} />
                    )}
                    <div>
                      <p
                        className="text-xs font-medium"
                        style={{ color: "var(--foreground)" }}
                      >
                        {isParsing ? "Lecture…" : docFilename || "Glisser ou cliquer"}
                      </p>
                      <p style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: "2px" }}>PDF · PPTX · DOCX · TXT</p>
                    </div>
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.pptx,.docx,.txt,.md"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              )}

              {/* Extracted text preview */}
              {extractedText && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 500,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      Contenu extrait {docFilename && `— ${docFilename}`}
                    </span>
                    <button
                      onClick={() => { setExtractedText(""); setDocFilename(""); }}
                      className="transition-colors"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="rounded-lg p-3 max-h-28 overflow-y-auto" style={{ background: "var(--secondary)" }}>
                    <p className="leading-relaxed" style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {extractedText.slice(0, 500)}{extractedText.length > 500 ? "…" : ""}
                    </p>
                  </div>
                  <p style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                    {extractedText.length.toLocaleString()} caractères extraits
                  </p>
                </div>
              )}

              {/* Error */}
              {importError && (
                <div
                  className="mt-3 rounded-xl px-3 py-2.5 flex items-start gap-2"
                  style={{
                    background: "rgba(212,24,61,0.06)",
                    border: "1px solid rgba(212,24,61,0.15)",
                    color: "var(--destructive)",
                    fontSize: "11px",
                  }}
                >
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  {importError}
                </div>
              )}
            </div>

            {/* ── Options ── */}
            <div className="pt-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between">
                <label className="text-xs" style={{ color: "var(--muted-foreground)" }}>Nombre de scènes</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSceneCount((n) => Math.max(2, n - 1))}
                    className="w-6 h-6 rounded-lg text-sm transition-all flex items-center justify-center"
                    style={{
                      background: "var(--secondary)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                  >
                    −
                  </button>
                  <span
                    className="text-sm font-semibold tabular-nums w-4 text-center"
                    style={{ color: "var(--foreground)" }}
                  >
                    {sceneCount}
                  </span>
                  <button
                    onClick={() => setSceneCount((n) => Math.min(12, n + 1))}
                    className="w-6 h-6 rounded-lg text-sm transition-all flex items-center justify-center"
                    style={{
                      background: "var(--secondary)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleStructure()}
                disabled={(!sourceUrl && !extractedText) || isExtracting}
                className="w-full flex items-center justify-center gap-2 disabled:opacity-40 text-xs font-semibold py-3 rounded-xl transition-all"
                style={{
                  background: "var(--ora-signal)",
                  color: "#ffffff",
                }}
              >
                {isExtracting ? (
                  <><Loader2 size={13} className="animate-spin" />Structuration IA…</>
                ) : (
                  <><Wand2 size={13} />Structurer en scènes</>
                )}
              </button>
            </div>

            {/* ── Add / Reset ── */}
            <div className="pt-4 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={addScene}
                className="w-full flex items-center justify-center gap-2 text-xs py-2 rounded-xl transition-all"
                style={{
                  background: "var(--secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--foreground)",
                }}
              >
                <Plus size={13} /> Ajouter une scène vide
              </button>

              {scenes.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                    {scenes.length} scène{scenes.length > 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={() => { setScenes([]); setSelectedId(null); }}
                    className="transition-colors"
                    style={{ fontSize: "11px", color: "var(--muted-foreground)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
                  >
                    Tout effacer
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Right — Storyboard + Editor ─────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--background)" }}>

          {/* ── Storyboard ─────────────────────────────────────────────── */}
          <div
            className="shrink-0 px-4 py-3"
            style={{
              borderBottom: "1px solid var(--border)",
              background: "var(--card)",
            }}
          >
            {scenes.length === 0 ? (
              <div className="flex items-center gap-3 h-28 text-xs" style={{ color: "var(--muted-foreground)" }}>
                <Clapperboard size={20} className="shrink-0" />
                <div>
                  <p style={{ color: "var(--muted-foreground)" }}>Table de montage vide</p>
                  <p style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>Importez du contenu ou ajoutez des scènes pour démarrer.</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin", scrollbarColor: "var(--border) transparent" }}>
                {scenes.map((scene) => (
                  <SceneCard
                    key={scene.id}
                    scene={scene}
                    selected={scene.id === selectedId}
                    onClick={() => setSelectedId(scene.id)}
                    onDelete={() => deleteScene(scene.id)}
                  />
                ))}
                {/* Add button */}
                <button
                  onClick={addScene}
                  className="w-[7.5rem] shrink-0 h-28 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    border: "1px dashed var(--border)",
                    color: "var(--muted-foreground)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--ora-signal-ring)";
                    e.currentTarget.style.color = "var(--ora-signal)";
                    e.currentTarget.style.background = "var(--ora-signal-light)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--muted-foreground)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Plus size={20} />
                </button>
              </div>
            )}
          </div>

          {/* ── Scene Editor ────────────────────────────────────────────── */}
          <div className="flex-1 overflow-hidden">
            {!selectedScene ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-10">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                  }}
                >
                  <Clapperboard size={22} style={{ color: "var(--muted-foreground)" }} />
                </div>
                <p className="text-sm mb-1" style={{ color: "var(--muted-foreground)" }}>Sélectionnez une scène</p>
                <p className="text-xs max-w-xs" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
                  Cliquez sur une scène dans la table de montage pour éditer son contenu et générer son visuel.
                </p>
              </div>
            ) : (
              <SceneEditor
                scene={selectedScene}
                vault={selectedVault}
                brandCheck={brandCheck}
                genSize={genSize}
                onGenSize={setGenSize}
                onUpdate={(patch) => updateScene(selectedScene.id, patch)}
                onGenerate={() => handleGenerate(selectedScene.id)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Scene Card ──────────────────────────────────────────────────────────────

function SceneCard({
  scene, selected, onClick, onDelete,
}: {
  scene: Scene;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const statusDotColor =
    scene.status === "empty" ? "var(--muted-foreground)" :
    scene.status === "draft" ? "var(--border)" :
    scene.status === "generating" ? "#f59e0b" :
    "#22c55e";

  return (
    <div
      onClick={onClick}
      className="w-[7.5rem] shrink-0 h-28 rounded-xl overflow-hidden cursor-pointer transition-all group relative"
      style={
        selected
          ? {
              border: "1px solid var(--ora-signal-ring)",
              boxShadow: "0 0 0 2px var(--ora-signal-light)",
            }
          : {
              border: "1px solid var(--border)",
            }
      }
    >
      {/* Thumbnail */}
      <div className="h-[4.5rem] relative overflow-hidden" style={{ background: "var(--secondary)" }}>
        {scene.image_url ? (
          <img src={scene.image_url} className="w-full h-full object-cover" alt={scene.title} />
        ) : (
          <div className="flex items-center justify-center h-full">
            {scene.status === "generating" ? (
              <Loader2 size={16} className="animate-spin" style={{ color: "#f59e0b" }} />
            ) : (
              <ImageIcon size={16} style={{ color: "var(--muted-foreground)" }} />
            )}
          </div>
        )}

        {/* Scene number */}
        <span
          className="absolute top-1 left-1 font-mono px-1 py-0.5 rounded"
          style={{
            fontSize: "9px",
            background: "rgba(0,0,0,0.5)",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          {scene.order}
        </span>

        {/* Status dot */}
        <div
          className={clsx("absolute top-1 right-1 w-2 h-2 rounded-full", {
            "animate-pulse": scene.status === "generating",
          })}
          style={{ background: statusDotColor }}
        />

        {/* Delete overlay */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <Trash2 size={14} style={{ color: "#ffffff" }} />
        </button>
      </div>

      {/* Label */}
      <div className="px-2 py-1.5" style={{ background: "var(--card)" }}>
        <p
          className="truncate leading-snug"
          style={{ fontSize: "11px", fontWeight: 500, color: "var(--foreground)" }}
        >
          {scene.title || "Sans titre"}
        </p>
      </div>
    </div>
  );
}

// ─── Scene Editor ────────────────────────────────────────────────────────────

function SceneEditor({
  scene, vault, brandCheck: check, genSize, onGenSize, onUpdate, onGenerate,
}: {
  scene: Scene;
  vault: Vault | null;
  brandCheck: BrandCheck | null;
  genSize: GenSize;
  onGenSize: (s: GenSize) => void;
  onUpdate: (patch: Partial<Scene>) => void;
  onGenerate: () => void;
}) {
  return (
    <div
      className="h-full grid grid-cols-2 overflow-hidden"
      style={{ borderTop: "none" }}
    >
      {/* ── Left: Content ──────────────────────────────────────────────── */}
      <div
        className="overflow-y-auto p-5 space-y-4"
        style={{ borderRight: "1px solid var(--border)" }}
      >
        {/* Scene title */}
        <div>
          <label
            className="mb-1.5 block"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted-foreground)",
            }}
          >
            Titre de la scène
          </label>
          <input
            value={scene.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none transition-colors"
            style={{
              background: "var(--input-background)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>

        {/* Script */}
        <div>
          <label
            className="mb-1.5 block"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted-foreground)",
            }}
          >
            Script / Narration
          </label>
          <textarea
            value={scene.script}
            onChange={(e) => onUpdate({ script: e.target.value })}
            rows={5}
            placeholder="Texte narratif de la scène, voix off, description…"
            className="w-full text-sm rounded-xl px-3 py-3 focus:outline-none resize-none transition-colors leading-relaxed"
            style={{
              background: "var(--input-background)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
        </div>

        {/* Caption */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--muted-foreground)",
              }}
            >
              Caption réseaux sociaux
            </label>
            <button
              onClick={() => navigator.clipboard.writeText(scene.caption)}
              className="flex items-center gap-1 transition-colors"
              style={{ fontSize: "10px", color: "var(--muted-foreground)" }}
            >
              <Copy size={11} /> Copier
            </button>
          </div>
          <textarea
            value={scene.caption}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            rows={5}
            placeholder="Caption avec emojis, saut de lignes, hashtags…"
            className="w-full text-sm rounded-xl px-3 py-3 focus:outline-none resize-none transition-colors"
            style={{
              background: "var(--input-background)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
          <div className="flex justify-between mt-1">
            <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
              Instagram max 2200 · LinkedIn max 3000
            </span>
            <span
              className="tabular-nums"
              style={{
                fontSize: "10px",
                color: scene.caption.length > 2200 ? "#a16207" : "var(--muted-foreground)",
              }}
            >
              {scene.caption.length}
            </span>
          </div>
        </div>

        {/* Visual prompt */}
        <div>
          <label
            className="mb-1.5 block"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted-foreground)",
            }}
          >
            Prompt visuel{" "}
            <span style={{ textTransform: "none", fontWeight: 400, color: "var(--muted-foreground)", opacity: 0.7 }}>
              (anglais — FLUX / DALL·E)
            </span>
          </label>
          <textarea
            value={scene.visual_prompt}
            onChange={(e) => onUpdate({ visual_prompt: e.target.value })}
            rows={5}
            placeholder="Professional photography of… cinematic lighting, 4K, ultra detailed, sharp focus, rule of thirds…"
            className="w-full text-xs rounded-xl px-3 py-3 focus:outline-none resize-none transition-colors font-mono leading-relaxed"
            style={{
              background: "var(--input-background)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
          />
          <p className="mt-1 text-right" style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
            {scene.visual_prompt.length} caractères
          </p>
        </div>
      </div>

      {/* ── Right: Visual ──────────────────────────────────────────────── */}
      <div className="overflow-y-auto p-5 space-y-4 flex flex-col">
        {/* Image preview */}
        <div
          className="aspect-square w-full rounded-xl overflow-hidden flex-shrink-0"
          style={{
            background: "var(--secondary)",
            border: "1px solid var(--border)",
          }}
        >
          {scene.image_url ? (
            <img src={scene.image_url} className="w-full h-full object-cover" alt="Visuel généré" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              {scene.status === "generating" ? (
                <>
                  <Loader2 size={28} className="animate-spin" style={{ color: "var(--ora-signal)" }} />
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Génération en cours…</p>
                </>
              ) : (
                <>
                  <ImageIcon size={36} style={{ color: "var(--muted-foreground)", opacity: 0.4 }} />
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Aucun visuel généré</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Format selector */}
        <div>
          <label
            className="mb-2 block"
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--muted-foreground)",
            }}
          >
            Format
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { value: "square", label: "Carré", desc: "1:1" },
              { value: "portrait", label: "Portrait", desc: "4:5" },
              { value: "landscape", label: "Paysage", desc: "16:9" },
            ] as { value: GenSize; label: string; desc: string }[]).map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => onGenSize(value)}
                className="py-2 rounded-lg text-xs transition-all flex flex-col items-center gap-0.5"
                style={
                  genSize === value
                    ? {
                        background: "var(--ora-signal-light)",
                        color: "var(--ora-signal)",
                        border: "1px solid var(--ora-signal-ring)",
                      }
                    : {
                        background: "var(--secondary)",
                        border: "1px solid var(--border)",
                        color: "var(--muted-foreground)",
                      }
                }
              >
                <span style={{ fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: "10px", opacity: 0.7 }}>{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <div className="space-y-2">
          <button
            onClick={onGenerate}
            disabled={!scene.visual_prompt || scene.status === "generating"}
            className="w-full flex items-center justify-center gap-2 disabled:opacity-40 text-sm font-semibold py-3 rounded-xl transition-all"
            style={{
              background: "var(--ora-signal)",
              color: "#ffffff",
            }}
          >
            {scene.status === "generating" ? (
              <><Loader2 size={15} className="animate-spin" />Génération…</>
            ) : (
              <>
                <Sparkles size={15} />
                {scene.image_url ? "Regénérer" : "Générer l'image"}
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px", fontWeight: 400 }}>(5 cr)</span>
              </>
            )}
          </button>

          {scene.image_url && (
            <a
              href={scene.image_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 text-xs py-2.5 rounded-xl transition-all"
              style={{
                background: "var(--secondary)",
                border: "1px solid var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              <Download size={13} />Télécharger
            </a>
          )}
        </div>

        {/* Brand check */}
        {check && vault && (
          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield
                  size={13}
                  style={{
                    color:
                      check.score >= 80 ? "#16a34a" :
                      check.score >= 60 ? "#a16207" :
                      "var(--destructive)",
                  }}
                />
                <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>Brand Check</span>
                <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>— {vault.brand_name ?? vault.name}</span>
              </div>
            </div>

            <ScoreBar score={check.score} />

            {check.warnings.length === 0 ? (
              <div className="flex items-center gap-2 text-xs" style={{ color: "#16a34a" }}>
                <CheckCircle size={13} />
                <span>Conforme à la charte de marque</span>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {check.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#a16207" }}>
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            )}

            {vault.guidelines?.visual?.primary_colors && vault.guidelines.visual.primary_colors.length > 0 && (
              <div className="flex items-center gap-2 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>Palette marque</span>
                <div className="flex gap-1">
                  {vault.guidelines.visual.primary_colors.slice(0, 4).map((c, i) => (
                    <div
                      key={i}
                      title={c}
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: c, border: "1px solid var(--border)" }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Copy all captions quick action */}
        {scene.caption && (
          <button
            onClick={() => navigator.clipboard.writeText(scene.caption)}
            className="w-full flex items-center justify-center gap-2 text-xs py-2 rounded-xl transition-all"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--muted-foreground)",
            }}
          >
            <Copy size={12} />Copier la caption
          </button>
        )}
      </div>
    </div>
  );
}
