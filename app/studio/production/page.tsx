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
  const color = score >= 80 ? "bg-emerald-400" : score >= 60 ? "bg-amber-400" : "bg-red-400";
  const textColor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={clsx("h-full rounded-full transition-all duration-500", color)} style={{ width: `${score}%` }} />
      </div>
      <span className={clsx("text-xs font-mono font-bold tabular-nums", textColor)}>{score}%</span>
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

  // ── Generate image for one scene ──────────────────────────────────────────
  const handleGenerate = async (sceneId: string) => {
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
      setScenes((prev) =>
        prev.map((s) => s.id === sceneId ? { ...s, image_url: data.url, status: "ready" } : s)
      );
    } catch {
      updateScene(sceneId, { status: "draft" });
    }
  };

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
    <div className="flex flex-col" style={{ height: "100vh", overflow: "hidden" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 h-14 border-b border-border/30 bg-surface/60 backdrop-blur-sm flex items-center gap-4 px-5">
        <div className="flex items-center gap-2.5 mr-1">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <Clapperboard size={15} className="text-primary" />
          </div>
          <span className="text-white font-semibold text-sm whitespace-nowrap">Studio Production</span>
        </div>

        <div className="h-4 w-px bg-border/50" />

        <input
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          className="flex-1 max-w-sm bg-transparent text-white text-sm border-b border-transparent hover:border-border/50 focus:border-primary focus:outline-none px-1 py-0.5 transition-colors min-w-0"
          placeholder="Nom du projet"
        />

        <div className="flex items-center gap-3 ml-auto shrink-0">
          {/* Vault selector */}
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-zinc-500 shrink-0" />
            <div className="relative">
              <select
                value={vaultId}
                onChange={(e) => setVaultId(e.target.value)}
                className="appearance-none bg-surface2 text-zinc-300 text-xs border border-border/40 rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="">Aucun vault</option>
                {vaults.map((v) => (
                  <option key={v.id} value={v.id}>{v.brand_name ?? v.name}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          {scenes.length > 0 && (
            <>
              <button
                onClick={handleGenerateAll}
                disabled={isGeneratingAll}
                className="flex items-center gap-1.5 text-xs bg-primary/15 hover:bg-primary/25 text-primary border border-primary/25 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 whitespace-nowrap"
              >
                {isGeneratingAll ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Tout générer
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-border/30 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
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
        <aside className="w-72 shrink-0 border-r border-border/30 flex flex-col overflow-y-auto bg-surface/20">
          <div className="p-4 space-y-5">
            <div>
              <h2 className="text-zinc-400 text-[10px] font-semibold uppercase tracking-widest mb-3">Importer</h2>

              {/* Import tabs */}
              <div className="flex bg-surface2 rounded-lg p-0.5 mb-3">
                <button
                  onClick={() => setImportTab("url")}
                  className={clsx("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all",
                    importTab === "url" ? "bg-surface text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
                >
                  <Globe size={12} /> URL
                </button>
                <button
                  onClick={() => setImportTab("doc")}
                  className={clsx("flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all",
                    importTab === "doc" ? "bg-surface text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300")}
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
                    className="w-full bg-surface border border-border/40 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary placeholder-zinc-600 transition-colors"
                  />
                  <p className="text-zinc-700 text-[10px]">Page produit, service, landing page…</p>
                </div>
              )}

              {/* Doc tab */}
              {importTab === "doc" && (
                <div className="space-y-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={isParsing}
                    className="w-full flex flex-col items-center gap-2.5 border border-dashed border-border/50 hover:border-primary/40 bg-surface/50 hover:bg-primary/5 rounded-xl p-5 text-center transition-all group"
                  >
                    {isParsing ? (
                      <Loader2 size={22} className="text-primary animate-spin" />
                    ) : (
                      <Upload size={22} className="text-zinc-600 group-hover:text-primary transition-colors" />
                    )}
                    <div>
                      <p className="text-white text-xs font-medium group-hover:text-primary transition-colors">
                        {isParsing ? "Lecture…" : docFilename || "Glisser ou cliquer"}
                      </p>
                      <p className="text-zinc-600 text-[10px] mt-0.5">PDF · PPTX · DOCX · TXT</p>
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
                    <span className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">
                      Contenu extrait {docFilename && `— ${docFilename}`}
                    </span>
                    <button
                      onClick={() => { setExtractedText(""); setDocFilename(""); }}
                      className="text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="bg-surface2 rounded-lg p-3 max-h-28 overflow-y-auto">
                    <p className="text-zinc-400 text-[11px] leading-relaxed">{extractedText.slice(0, 500)}{extractedText.length > 500 ? "…" : ""}</p>
                  </div>
                  <p className="text-zinc-700 text-[10px] mt-1">{extractedText.length.toLocaleString()} caractères extraits</p>
                </div>
              )}

              {/* Error */}
              {importError && (
                <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] rounded-xl px-3 py-2.5 flex items-start gap-2">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  {importError}
                </div>
              )}
            </div>

            {/* ── Options ── */}
            <div className="border-t border-border/20 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-zinc-500 text-xs">Nombre de scènes</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSceneCount((n) => Math.max(2, n - 1))}
                    className="w-6 h-6 rounded-lg bg-surface2 hover:bg-surface text-zinc-400 hover:text-white text-sm transition-all flex items-center justify-center"
                  >−</button>
                  <span className="text-white text-sm font-semibold tabular-nums w-4 text-center">{sceneCount}</span>
                  <button
                    onClick={() => setSceneCount((n) => Math.min(12, n + 1))}
                    className="w-6 h-6 rounded-lg bg-surface2 hover:bg-surface text-zinc-400 hover:text-white text-sm transition-all flex items-center justify-center"
                  >+</button>
                </div>
              </div>

              <button
                onClick={() => handleStructure()}
                disabled={(!sourceUrl && !extractedText) || isExtracting}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 disabled:opacity-40 text-white text-xs font-semibold py-3 rounded-xl transition-all"
              >
                {isExtracting ? (
                  <><Loader2 size={13} className="animate-spin" />Structuration IA…</>
                ) : (
                  <><Wand2 size={13} />Structurer en scènes</>
                )}
              </button>
            </div>

            {/* ── Add / Reset ── */}
            <div className="border-t border-border/20 pt-4 space-y-2">
              <button
                onClick={addScene}
                className="w-full flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-white bg-white/5 hover:bg-white/8 border border-border/30 hover:border-border/50 py-2 rounded-xl transition-all"
              >
                <Plus size={13} /> Ajouter une scène vide
              </button>

              {scenes.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-zinc-700 text-[11px]">{scenes.length} scène{scenes.length > 1 ? "s" : ""}</span>
                  <button
                    onClick={() => { setScenes([]); setSelectedId(null); }}
                    className="text-zinc-700 hover:text-red-400 text-[11px] transition-colors"
                  >
                    Tout effacer
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Right — Storyboard + Editor ─────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Storyboard ─────────────────────────────────────────────── */}
          <div className="shrink-0 border-b border-border/30 bg-bg/50 px-4 py-3">
            {scenes.length === 0 ? (
              <div className="flex items-center gap-3 h-28 text-zinc-700 text-xs">
                <Clapperboard size={20} className="shrink-0" />
                <div>
                  <p className="text-zinc-500">Table de montage vide</p>
                  <p>Importez du contenu ou ajoutez des scènes pour démarrer.</p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" }}>
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
                  className="w-[7.5rem] shrink-0 h-28 rounded-xl border border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/5 flex items-center justify-center text-zinc-700 hover:text-primary transition-all"
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
                <div className="w-16 h-16 rounded-2xl bg-surface border border-border/30 flex items-center justify-center mb-4">
                  <Clapperboard size={22} className="text-zinc-700" />
                </div>
                <p className="text-zinc-400 text-sm mb-1">Sélectionnez une scène</p>
                <p className="text-zinc-700 text-xs max-w-xs">
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
  return (
    <div
      onClick={onClick}
      className={clsx(
        "w-[7.5rem] shrink-0 h-28 rounded-xl border overflow-hidden cursor-pointer transition-all group relative",
        selected ? "border-primary ring-1 ring-primary/30" : "border-border/40 hover:border-primary/30"
      )}
    >
      {/* Thumbnail */}
      <div className="h-[4.5rem] bg-surface2 relative overflow-hidden">
        {scene.image_url ? (
          <img src={scene.image_url} className="w-full h-full object-cover" alt={scene.title} />
        ) : (
          <div className="flex items-center justify-center h-full">
            {scene.status === "generating" ? (
              <Loader2 size={16} className="text-amber-400 animate-spin" />
            ) : (
              <ImageIcon size={16} className="text-zinc-700" />
            )}
          </div>
        )}

        {/* Scene number */}
        <span className="absolute top-1 left-1 text-[9px] font-mono bg-black/50 text-zinc-400 px-1 py-0.5 rounded">
          {scene.order}
        </span>

        {/* Status dot */}
        <div className={clsx("absolute top-1 right-1 w-2 h-2 rounded-full", {
          "bg-zinc-700": scene.status === "empty",
          "bg-zinc-500": scene.status === "draft",
          "bg-amber-400 animate-pulse": scene.status === "generating",
          "bg-emerald-400": scene.status === "ready",
        })} />

        {/* Delete overlay */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} className="text-white" />
        </button>
      </div>

      {/* Label */}
      <div className="px-2 py-1.5 bg-surface">
        <p className="text-white text-[11px] font-medium truncate leading-snug">{scene.title || "Sans titre"}</p>
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
    <div className="h-full grid grid-cols-2 divide-x divide-border/30 overflow-hidden">

      {/* ── Left: Content ──────────────────────────────────────────────── */}
      <div className="overflow-y-auto p-5 space-y-4">
        {/* Scene title */}
        <div>
          <label className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider mb-1.5 block">Titre de la scène</label>
          <input
            value={scene.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Script */}
        <div>
          <label className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider mb-1.5 block">Script / Narration</label>
          <textarea
            value={scene.script}
            onChange={(e) => onUpdate({ script: e.target.value })}
            rows={5}
            placeholder="Texte narratif de la scène, voix off, description…"
            className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-3 py-3 focus:outline-none focus:border-primary placeholder-zinc-600 resize-none transition-colors leading-relaxed"
          />
        </div>

        {/* Caption */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">Caption réseaux sociaux</label>
            <button
              onClick={() => navigator.clipboard.writeText(scene.caption)}
              className="flex items-center gap-1 text-zinc-600 hover:text-zinc-300 text-[10px] transition-colors"
            >
              <Copy size={11} /> Copier
            </button>
          </div>
          <textarea
            value={scene.caption}
            onChange={(e) => onUpdate({ caption: e.target.value })}
            rows={5}
            placeholder="Caption avec emojis, saut de lignes, hashtags…"
            className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-3 py-3 focus:outline-none focus:border-primary placeholder-zinc-600 resize-none transition-colors"
          />
          <div className="flex justify-between mt-1">
            <span className="text-zinc-700 text-[10px]">Instagram max 2200 · LinkedIn max 3000</span>
            <span className={clsx("text-[10px] tabular-nums", scene.caption.length > 2200 ? "text-amber-400" : "text-zinc-700")}>
              {scene.caption.length}
            </span>
          </div>
        </div>

        {/* Visual prompt */}
        <div>
          <label className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider mb-1.5 block">
            Prompt visuel <span className="text-zinc-700 normal-case font-normal">(anglais — FLUX / DALL·E)</span>
          </label>
          <textarea
            value={scene.visual_prompt}
            onChange={(e) => onUpdate({ visual_prompt: e.target.value })}
            rows={5}
            placeholder="Professional photography of… cinematic lighting, 4K, ultra detailed, sharp focus, rule of thirds…"
            className="w-full bg-surface border border-border/40 text-white text-xs rounded-xl px-3 py-3 focus:outline-none focus:border-primary placeholder-zinc-600 resize-none transition-colors font-mono leading-relaxed"
          />
          <p className="text-zinc-700 text-[10px] mt-1 text-right">{scene.visual_prompt.length} caractères</p>
        </div>
      </div>

      {/* ── Right: Visual ──────────────────────────────────────────────── */}
      <div className="overflow-y-auto p-5 space-y-4 flex flex-col">
        {/* Image preview */}
        <div className="aspect-square w-full rounded-xl bg-surface2 border border-border/30 overflow-hidden flex-shrink-0">
          {scene.image_url ? (
            <img src={scene.image_url} className="w-full h-full object-cover" alt="Visuel généré" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              {scene.status === "generating" ? (
                <>
                  <Loader2 size={28} className="text-primary animate-spin" />
                  <p className="text-zinc-500 text-xs">Génération en cours…</p>
                </>
              ) : (
                <>
                  <ImageIcon size={36} className="text-zinc-800" />
                  <p className="text-zinc-600 text-xs">Aucun visuel généré</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Format selector */}
        <div>
          <label className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider mb-2 block">Format</label>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { value: "square", label: "Carré", desc: "1:1" },
              { value: "portrait", label: "Portrait", desc: "4:5" },
              { value: "landscape", label: "Paysage", desc: "16:9" },
            ] as { value: GenSize; label: string; desc: string }[]).map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => onGenSize(value)}
                className={clsx(
                  "py-2 rounded-lg text-xs border transition-all flex flex-col items-center gap-0.5",
                  genSize === value
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "border-border/30 text-zinc-500 hover:text-white hover:border-border/50"
                )}
              >
                <span className="font-medium">{label}</span>
                <span className="text-[10px] opacity-60">{desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <div className="space-y-2">
          <button
            onClick={onGenerate}
            disabled={!scene.visual_prompt || scene.status === "generating"}
            className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 disabled:opacity-40 text-white text-sm font-semibold py-3 rounded-xl transition-all"
          >
            {scene.status === "generating" ? (
              <><Loader2 size={15} className="animate-spin" />Génération…</>
            ) : (
              <><Sparkles size={15} />{scene.image_url ? "Regénérer" : "Générer l'image"}<span className="text-white/50 text-xs font-normal">(5 cr)</span></>
            )}
          </button>

          {scene.image_url && (
            <a
              href={scene.image_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 py-2.5 rounded-xl transition-all border border-border/20"
            >
              <Download size={13} />Télécharger
            </a>
          )}
        </div>

        {/* Brand check */}
        {check && vault && (
          <div className="bg-surface border border-border/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={13} className={check.score >= 80 ? "text-emerald-400" : check.score >= 60 ? "text-amber-400" : "text-red-400"} />
                <span className="text-white text-xs font-medium">Brand Check</span>
                <span className="text-zinc-600 text-[10px]">— {vault.brand_name ?? vault.name}</span>
              </div>
            </div>

            <ScoreBar score={check.score} />

            {check.warnings.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-400 text-xs">
                <CheckCircle size={13} />
                <span>Conforme à la charte de marque</span>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {check.warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-amber-300">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            )}

            {vault.guidelines?.visual?.primary_colors && vault.guidelines.visual.primary_colors.length > 0 && (
              <div className="flex items-center gap-2 pt-1 border-t border-border/20">
                <span className="text-zinc-600 text-[10px]">Palette marque</span>
                <div className="flex gap-1">
                  {vault.guidelines.visual.primary_colors.slice(0, 4).map((c, i) => (
                    <div key={i} title={c} className="w-4 h-4 rounded border border-white/10" style={{ backgroundColor: c }} />
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
            className="w-full flex items-center justify-center gap-2 text-xs text-zinc-500 hover:text-white py-2 rounded-xl border border-border/20 hover:border-border/40 bg-transparent hover:bg-white/5 transition-all"
          >
            <Copy size={12} />Copier la caption
          </button>
        )}
      </div>
    </div>
  );
}
