"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Layers, Type, ImageIcon, Download, Save, Plus, Trash2,
  ChevronUp, ChevronDown, Eye, EyeOff, Lock, Unlock,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic,
  ZoomIn, ZoomOut, RotateCcw, Square, Circle, Minus
} from "lucide-react";

type Ratio = "16:9" | "9:16" | "1:1" | "4:5";
type Tool = "select" | "text" | "image" | "rect" | "circle";

const RATIOS: Record<Ratio, { w: number; h: number; label: string }> = {
  "16:9":  { w: 1920, h: 1080, label: "16:9 — Paysage" },
  "9:16":  { w: 1080, h: 1920, label: "9:16 — Portrait" },
  "1:1":   { w: 1080, h: 1080, label: "1:1 — Carré" },
  "4:5":   { w: 1080, h: 1350, label: "4:5 — Instagram" },
};

interface Layer {
  id: string;
  name: string;
  type: "text" | "image" | "rect" | "circle";
  visible: boolean;
  locked: boolean;
  fabricId?: string;
}

const FONTS = ["Inter", "Georgia", "Playfair Display", "Montserrat", "Poppins", "Courier New"];

// Dynamically load FabricCanvas to avoid SSR issues
const FabricCanvas = dynamic(() => import("./FabricCanvas"), { ssr: false });

export default function CanvasPage() {
  const [ratio, setRatio] = useState<Ratio>("16:9");
  const [tool, setTool] = useState<Tool>("select");
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("Sans titre");
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState(0.4);
  const [textProps, setTextProps] = useState({
    fontSize: 48,
    fontFamily: "Inter",
    fontWeight: "normal" as "normal" | "bold",
    fontStyle: "normal" as "normal" | "italic",
    textAlign: "left" as "left" | "center" | "right",
    fill: "#111113",
  });
  const [fabricApi, setFabricApi] = useState<{
    addText: (props: typeof textProps) => void;
    addRect: () => void;
    addCircle: () => void;
    addImage: (url: string) => void;
    deleteSelected: () => void;
    exportPNG: () => void;
    updateTextProps: (props: Partial<typeof textProps>) => void;
    bringForward: () => void;
    sendBackward: () => void;
    setZoom: (z: number) => void;
    toggleVisibility: (id: string) => void;
    saveJSON: () => string;
    loadJSON: (json: string) => void;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dimensions = RATIOS[ratio];

  function addLayer(type: Layer["type"], name: string) {
    const id = crypto.randomUUID();
    setLayers(prev => [{ id, name, type, visible: true, locked: false }, ...prev]);
    setSelectedLayer(id);
    return id;
  }

  function handleAddText() {
    if (!fabricApi) return;
    const id = addLayer("text", `Texte ${layers.filter(l => l.type === "text").length + 1}`);
    fabricApi.addText(textProps);
    setTool("select");
  }

  function handleAddRect() {
    if (!fabricApi) return;
    addLayer("rect", `Rectangle ${layers.filter(l => l.type === "rect").length + 1}`);
    fabricApi.addRect();
    setTool("select");
  }

  function handleAddCircle() {
    if (!fabricApi) return;
    addLayer("circle", `Cercle ${layers.filter(l => l.type === "circle").length + 1}`);
    fabricApi.addCircle();
    setTool("select");
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !fabricApi) return;
    const url = URL.createObjectURL(file);
    const id = addLayer("image", file.name.replace(/\.[^.]+$/, ""));
    fabricApi.addImage(url);
    setTool("select");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDelete() {
    if (!fabricApi || !selectedLayer) return;
    fabricApi.deleteSelected();
    setLayers(prev => prev.filter(l => l.id !== selectedLayer));
    setSelectedLayer(null);
  }

  function toggleLayerVisibility(id: string) {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  }

  function toggleLayerLock(id: string) {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
  }

  function reorderLayer(id: string, dir: "up" | "down") {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (idx < 0) return prev;
      const newLayers = [...prev];
      const target = dir === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= newLayers.length) return prev;
      [newLayers[idx], newLayers[target]] = [newLayers[target], newLayers[idx]];
      return newLayers;
    });
    if (dir === "up") fabricApi?.bringForward();
    else fabricApi?.sendBackward();
  }

  function updateTextProp<K extends keyof typeof textProps>(key: K, val: (typeof textProps)[K]) {
    setTextProps(prev => ({ ...prev, [key]: val }));
    fabricApi?.updateTextProps({ [key]: val });
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
      {/* Left toolbar */}
      <div className="flex flex-col w-14 items-center py-4 gap-2 shrink-0"
        style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}>
        {[
          { t: "select" as Tool, icon: Square, label: "Sélection" },
          { t: "text" as Tool, icon: Type, label: "Texte" },
          { t: "rect" as Tool, icon: Square, label: "Rectangle" },
          { t: "circle" as Tool, icon: Circle, label: "Cercle" },
          { t: "image" as Tool, icon: ImageIcon, label: "Image" },
        ].map(({ t, icon: Icon, label }) => (
          <button key={t}
            onClick={() => {
              setTool(t);
              if (t === "text") handleAddText();
              else if (t === "rect") handleAddRect();
              else if (t === "circle") handleAddCircle();
              else if (t === "image") fileInputRef.current?.click();
            }}
            title={label}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
            style={{
              background: tool === t ? "var(--ora-signal-light)" : "transparent",
              color: tool === t ? "var(--ora-signal)" : "var(--muted-foreground)",
            }}>
            <Icon size={16} />
          </button>
        ))}

        <div className="flex-1" />

        <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))} title="Zoom +"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--secondary)]"
          style={{ color: "var(--muted-foreground)" }}>
          <ZoomIn size={15} />
        </button>
        <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.1))} title="Zoom -"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--secondary)]"
          style={{ color: "var(--muted-foreground)" }}>
          <ZoomOut size={15} />
        </button>
        <button onClick={() => setZoom(0.4)} title="Reset zoom"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--secondary)]"
          style={{ color: "var(--muted-foreground)" }}>
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Main canvas area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2 shrink-0"
          style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
          <input
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            className="outline-none bg-transparent"
            style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", minWidth: 0, maxWidth: 200 }}
          />

          <select value={ratio} onChange={e => setRatio(e.target.value as Ratio)}
            className="px-2 py-1 rounded-lg outline-none"
            style={{ fontSize: "12px", background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
            {(Object.keys(RATIOS) as Ratio[]).map(r => (
              <option key={r} value={r}>{RATIOS[r].label}</option>
            ))}
          </select>

          <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
            {Math.round(zoom * 100)}%
          </span>

          <div className="flex-1" />

          <button onClick={() => fabricApi?.exportPNG()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
            style={{ fontSize: "12px", background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
            <Download size={13} />
            Export PNG
          </button>

          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white transition-all"
            style={{ fontSize: "12px", background: "var(--ora-signal)" }}>
            <Save size={13} />
            Sauvegarder
          </button>
        </div>

        {/* Text properties bar (when text tool active) */}
        {selectedLayer && layers.find(l => l.id === selectedLayer)?.type === "text" && (
          <div className="flex items-center gap-2 px-4 py-1.5 shrink-0"
            style={{ background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}>
            <select value={textProps.fontFamily} onChange={e => updateTextProp("fontFamily", e.target.value)}
              className="px-2 py-1 rounded outline-none"
              style={{ fontSize: "11px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>

            <input type="number" value={textProps.fontSize} min={8} max={300}
              onChange={e => updateTextProp("fontSize", Number(e.target.value))}
              className="w-14 px-2 py-1 rounded outline-none text-center"
              style={{ fontSize: "11px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }} />

            {[
              { icon: Bold, key: "fontWeight" as const, val: "bold", off: "normal" },
              { icon: Italic, key: "fontStyle" as const, val: "italic", off: "normal" },
            ].map(({ icon: Icon, key, val, off }) => (
              <button key={key}
                onClick={() => updateTextProp(key, (textProps[key] === val ? off : val) as never)}
                className="w-7 h-7 flex items-center justify-center rounded"
                style={{ background: textProps[key] === val ? "var(--ora-signal-light)" : "transparent", color: textProps[key] === val ? "var(--ora-signal)" : "var(--muted-foreground)" }}>
                <Icon size={13} />
              </button>
            ))}

            <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />

            {[
              { icon: AlignLeft, val: "left" },
              { icon: AlignCenter, val: "center" },
              { icon: AlignRight, val: "right" },
            ].map(({ icon: Icon, val }) => (
              <button key={val}
                onClick={() => updateTextProp("textAlign", val as "left" | "center" | "right")}
                className="w-7 h-7 flex items-center justify-center rounded"
                style={{ background: textProps.textAlign === val ? "var(--ora-signal-light)" : "transparent", color: textProps.textAlign === val ? "var(--ora-signal)" : "var(--muted-foreground)" }}>
                <Icon size={13} />
              </button>
            ))}

            <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />

            <input type="color" value={textProps.fill}
              onChange={e => updateTextProp("fill", e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0" title="Couleur" />
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8"
          style={{ background: "#e8e8ec" }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}>
            <FabricCanvas
              width={dimensions.w}
              height={dimensions.h}
              onReady={setFabricApi}
            />
          </div>
        </div>
      </div>

      {/* Right panel — layers */}
      <div className="w-56 shrink-0 flex flex-col"
        style={{ background: "var(--card)", borderLeft: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-3 py-2.5"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5">
            <Layers size={13} style={{ color: "var(--ora-signal)" }} />
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--foreground)" }}>Calques</span>
          </div>
          {selectedLayer && (
            <button onClick={handleDelete} title="Supprimer">
              <Trash2 size={13} style={{ color: "var(--muted-foreground)" }} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {layers.length === 0 && (
            <div className="px-3 py-6 text-center" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
              Ajoute un élément pour commencer
            </div>
          )}
          {layers.map((layer, i) => (
            <div key={layer.id}
              onClick={() => setSelectedLayer(layer.id)}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
              style={{
                background: selectedLayer === layer.id ? "var(--ora-signal-light)" : "transparent",
                borderBottom: "1px solid var(--border)",
              }}>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: "12px", color: "var(--foreground)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                  {layer.name}
                </div>
                <div style={{ fontSize: "10px", color: "var(--muted-foreground)", textTransform: "capitalize" }}>
                  {layer.type}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={e => { e.stopPropagation(); reorderLayer(layer.id, "up"); }}
                  disabled={i === 0}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--secondary)] disabled:opacity-30">
                  <ChevronUp size={11} style={{ color: "var(--muted-foreground)" }} />
                </button>
                <button onClick={e => { e.stopPropagation(); reorderLayer(layer.id, "down"); }}
                  disabled={i === layers.length - 1}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--secondary)] disabled:opacity-30">
                  <ChevronDown size={11} style={{ color: "var(--muted-foreground)" }} />
                </button>
                <button onClick={e => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                  className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--secondary)]">
                  {layer.visible
                    ? <Eye size={11} style={{ color: "var(--muted-foreground)" }} />
                    : <EyeOff size={11} style={{ color: "var(--muted-foreground)", opacity: 0.4 }} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
    </div>
  );
}
