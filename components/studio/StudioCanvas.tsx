"use client";

import { useEffect, useRef } from "react";

/* ── Types ─────────────────────────────────────────────────────────── */

export type FormatType =
  | "linkedin" | "email" | "sms" | "ad"
  | "landing" | "stories" | "newsletter";

export interface CanvasApi {
  exportPNG: () => void;
  undo: () => void;
  redo: () => void;
  updateSelectedOpacity: (val: number) => void;
  updateSelectedColor: (color: string) => void;
  updateSelectedTextProp: (key: string, val: unknown) => void;
  addImageFromUrl: (url: string) => void;
  addShadowToSelected: () => void;
}

interface Props {
  format: FormatType;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  zoom: number;
  onReady?: (api: CanvasApi) => void;
}

/* ── Format dimensions ─────────────────────────────────────────────── */

export const FORMAT_DIMS: Record<FormatType, { w: number; h: number; label: string }> = {
  linkedin:   { w: 520,  h: 560, label: "LinkedIn Post" },
  email:      { w: 600,  h: 750, label: "Email" },
  sms:        { w: 320,  h: 568, label: "SMS" },
  ad:         { w: 728,  h: 400, label: "Display Ad" },
  landing:    { w: 1200, h: 675, label: "Landing Page" },
  stories:    { w: 360,  h: 640, label: "Stories" },
  newsletter: { w: 600,  h: 900, label: "Newsletter" },
};

/* ── Template builders ─────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricMod = any;

function buildTemplate(fabric: FabricMod, format: FormatType, w: number, h: number) {
  const objs: FabricMod[] = [];

  function obj<T extends FabricMod>(o: T, customId: string): T {
    o.customId = customId;
    o.hasControls = true;
    o.hasBorders = true;
    return o;
  }

  const bg = (color = "#ffffff") =>
    obj(new fabric.Rect({ left: 0, top: 0, width: w, height: h, fill: color, selectable: false, evented: false }), "__bg__");

  if (format === "linkedin") {
    objs.push(bg());
    // Header
    objs.push(obj(new fabric.Rect({ left: 0, top: 0, width: w, height: 68, fill: "#f8f8fa", selectable: true }), "ln-header"));
    objs.push(new fabric.Circle({ left: 14, top: 14, radius: 20, fill: "#d1d5db", selectable: false, evented: false }));
    objs.push(new fabric.IText("Marie Dupont · Creative Director · Acme Corp", {
      left: 46, top: 16, fontSize: 12, fontFamily: "Inter", fill: "#111113",
      selectable: false, evented: false, width: 440,
    }));
    // Body
    objs.push(obj(new fabric.IText(
      "Après 6 mois d'expérimentation, voici ce que j'ai appris sur l'IA générative dans le marketing B2B :\n\n→ La vitesse ne remplace pas la stratégie\n→ Le brand voice se perd sans garde-fous\n→ Les équipes qui gagnent mixent humain + IA\n\nQu'est-ce qui change vraiment dans vos workflows ?",
      { left: 16, top: 84, fontSize: 14, fontFamily: "Inter", fill: "#111113", lineHeight: 1.55, width: 488 }
    ), "ln-body"));
    // Image
    objs.push(obj(new fabric.Rect({ left: 0, top: 288, width: w, height: 212, fill: "#e5e7eb", rx: 0 }), "ln-image"));
    objs.push(new fabric.IText("[ Image ]", { left: w / 2 - 30, top: 380, fontSize: 13, fill: "#9ca3af", selectable: false, evented: false }));
    // Footer
    objs.push(obj(new fabric.Rect({ left: 0, top: 500, width: w, height: 48, fill: "#f8f8fa" }), "ln-engagement"));
    objs.push(new fabric.IText("👍  342   💬  28   ↗  Share", { left: 16, top: 516, fontSize: 12, fontFamily: "Inter", fill: "#6b6b7b", selectable: false, evented: false }));
  }

  else if (format === "email") {
    objs.push(bg("#f4f4f6"));
    const card = obj(new fabric.Rect({ left: 20, top: 20, width: 560, height: 710, fill: "#ffffff", rx: 8, shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.06)", blur: 12, offsetY: 4 }) }), "em-header");
    objs.push(card);
    // Hero image area
    objs.push(obj(new fabric.Rect({ left: 20, top: 20, width: 560, height: 180, fill: "#3b4fc4", rx: 8 }), "em-hero"));
    objs.push(new fabric.IText("ACME CORP", { left: 230, top: 90, fontSize: 20, fontFamily: "Inter", fontWeight: "bold", fill: "#ffffff", selectable: false, evented: false }));
    // Headline
    objs.push(obj(new fabric.IText("Votre campagne Q2 est prête.", { left: 36, top: 218, fontSize: 22, fontFamily: "Inter", fontWeight: "bold", fill: "#111113", width: 528 }), "em-headline"));
    // Body
    objs.push(obj(new fabric.IText(
      "Bonjour Marie,\n\nVotre espace ORA Studio est configuré. Vos visuels, textes et formats sont synchronisés avec votre Brand Vault.\n\nCommencez à créer dès maintenant.",
      { left: 36, top: 268, fontSize: 14, fontFamily: "Inter", fill: "#6b6b7b", lineHeight: 1.6, width: 528 }
    ), "em-body"));
    // CTA
    const cta = obj(new fabric.Rect({ left: 36, top: 420, width: 160, height: 40, fill: "#3b4fc4", rx: 6 }), "em-cta");
    objs.push(cta);
    objs.push(new fabric.IText("Accéder au Studio", { left: 52, top: 432, fontSize: 13, fontFamily: "Inter", fill: "#ffffff", selectable: false, evented: false }));
    // Footer
    objs.push(obj(new fabric.IText("© 2025 Acme Corp · Se désabonner · Politique de confidentialité", { left: 36, top: 698, fontSize: 10, fontFamily: "Inter", fill: "#9ca3af", width: 528 }), "em-footer"));
  }

  else if (format === "sms") {
    objs.push(bg("#f2f2f7"));
    // Status bar
    objs.push(new fabric.Rect({ left: 0, top: 0, width: w, height: 44, fill: "#f2f2f7", selectable: false, evented: false }));
    objs.push(new fabric.IText("9:41", { left: 14, top: 14, fontSize: 15, fontFamily: "Inter", fontWeight: "bold", fill: "#000000", selectable: false, evented: false }));
    // Header
    objs.push(obj(new fabric.Rect({ left: 0, top: 44, width: w, height: 52, fill: "#ffffff", rx: 0 }), "sms-header"));
    objs.push(new fabric.IText("Acme Corp", { left: w / 2 - 40, top: 58, fontSize: 14, fontFamily: "Inter", fontWeight: "bold", fill: "#000000", selectable: false, evented: false }));
    // Message 1 (received)
    const msg1Bg = obj(new fabric.Rect({ left: 14, top: 130, width: 240, height: 70, fill: "#e5e5ea", rx: 16 }), "sms-msg1");
    objs.push(msg1Bg);
    objs.push(new fabric.IText("Bonjour ! Votre campagne\nQ2 est maintenant active ✓", { left: 26, top: 145, fontSize: 14, fontFamily: "Inter", fill: "#000000", lineHeight: 1.4, selectable: false, evented: false }));
    // Message 2 (sent with link)
    const msg2Bg = obj(new fabric.Rect({ left: w - 254, top: 220, width: 240, height: 56, fill: "#007aff", rx: 16 }), "sms-msg2");
    objs.push(msg2Bg);
    objs.push(new fabric.IText("Voir mes visuels → ora.app/c/q2", { left: w - 242, top: 238, fontSize: 13, fontFamily: "Inter", fill: "#ffffff", width: 220, selectable: false, evented: false }));
    // Input bar
    objs.push(new fabric.Rect({ left: 0, top: 504, width: w, height: 64, fill: "#ffffff", selectable: false, evented: false }));
    objs.push(new fabric.Rect({ left: 12, top: 518, width: 260, height: 36, fill: "#f2f2f7", rx: 18, selectable: false, evented: false }));
  }

  else if (format === "ad") {
    // Background
    const adBg = obj(new fabric.Rect({ left: 0, top: 0, width: w, height: h, fill: "#1a1a2e" }), "ad-bg");
    objs.push(adBg);
    // Logo
    objs.push(obj(new fabric.IText("ACME", { left: 24, top: 24, fontSize: 14, fontFamily: "Inter", fontWeight: "bold", fill: "rgba(255,255,255,0.7)", letterSpacing: 3 }), "ad-logo"));
    // Visual circle
    objs.push(obj(new fabric.Circle({ left: w - 190, top: h / 2 - 80, radius: 80, fill: "#3b4fc4", opacity: 0.9 }), "ad-visual"));
    // Headline
    objs.push(obj(new fabric.IText("L'IA qui\ncomprend\nvotre marque.", { left: 24, top: 80, fontSize: 42, fontFamily: "Inter", fontWeight: "bold", fill: "#ffffff", lineHeight: 1.15, width: 400 }), "ad-headline"));
    // CTA
    const adCta = obj(new fabric.Rect({ left: 24, top: 310, width: 160, height: 44, fill: "#3b4fc4", rx: 8 }), "ad-cta");
    objs.push(adCta);
    objs.push(new fabric.IText("Essayer ORA →", { left: 44, top: 324, fontSize: 14, fontFamily: "Inter", fill: "#ffffff", selectable: false, evented: false }));
  }

  else if (format === "landing") {
    objs.push(bg());
    // Nav
    objs.push(obj(new fabric.Rect({ left: 0, top: 0, width: w, height: 64, fill: "#ffffff" }), "lp-nav"));
    objs.push(new fabric.IText("ORA Studio", { left: 40, top: 22, fontSize: 16, fontFamily: "Inter", fontWeight: "bold", fill: "#111113", selectable: false, evented: false }));
    // Headline
    objs.push(obj(new fabric.IText("Votre IA créative,\nbranded et conforme.", { left: 40, top: 120, fontSize: 56, fontFamily: "Inter", fontWeight: "bold", fill: "#111113", lineHeight: 1.1, width: 700 }), "lp-hero"));
    // Subtitle
    objs.push(obj(new fabric.IText("Générez, comparez, éditez — avec votre Brand Vault intégré.", { left: 40, top: 288, fontSize: 20, fontFamily: "Inter", fill: "#6b6b7b", width: 640 }), "lp-sub"));
    // CTA
    const lpCta = obj(new fabric.Rect({ left: 40, top: 340, width: 200, height: 52, fill: "#111113", rx: 10 }), "lp-cta");
    objs.push(lpCta);
    objs.push(new fabric.IText("Commencer — gratuit", { left: 68, top: 357, fontSize: 15, fontFamily: "Inter", fill: "#ffffff", selectable: false, evented: false }));
    // Hero visual
    objs.push(obj(new fabric.Rect({ left: 760, top: 80, width: 400, height: 520, fill: "#f4f4f6", rx: 16 }), "lp-visual"));
  }

  else if (format === "stories") {
    // Gradient-like background
    objs.push(obj(new fabric.Rect({ left: 0, top: 0, width: w, height: h, fill: "#1a1a2e" }), "st-bg"));
    // Visual
    objs.push(obj(new fabric.Circle({ left: w / 2 - 64, top: 160, radius: 64, fill: "#3b4fc4" }), "st-visual"));
    // Text overlay
    objs.push(obj(new fabric.IText("Découvrez ORA\nStudio", { left: 24, top: 340, fontSize: 36, fontFamily: "Inter", fontWeight: "bold", fill: "#ffffff", lineHeight: 1.2, width: 312 }), "st-text"));
    // Swipe up
    const stCta = obj(new fabric.Rect({ left: w / 2 - 80, top: h - 90, width: 160, height: 44, fill: "rgba(255,255,255,0.15)", rx: 22 }), "st-cta");
    objs.push(stCta);
    objs.push(new fabric.IText("↑  Swiper pour voir", { left: w / 2 - 68, top: h - 76, fontSize: 13, fontFamily: "Inter", fill: "#ffffff", selectable: false, evented: false }));
  }

  else if (format === "newsletter") {
    objs.push(bg("#f4f4f6"));
    // Header
    objs.push(obj(new fabric.Rect({ left: 0, top: 0, width: w, height: 80, fill: "#111113" }), "nl-header"));
    objs.push(new fabric.IText("ORA Weekly · Édition #42", { left: 24, top: 28, fontSize: 16, fontFamily: "Inter", fontWeight: "bold", fill: "#ffffff", selectable: false, evented: false }));
    // Section 1 — Feature
    objs.push(obj(new fabric.Rect({ left: 12, top: 100, width: w - 24, height: 200, fill: "#ffffff", rx: 8 }), "nl-s1"));
    objs.push(new fabric.IText("🌟  Feature — L'IA et le brand voice", { left: 28, top: 116, fontSize: 14, fontFamily: "Inter", fontWeight: "bold", fill: "#111113", selectable: false, evented: false }));
    // Section 2 — Quick Bites
    objs.push(obj(new fabric.Rect({ left: 12, top: 316, width: w - 24, height: 180, fill: "#ffffff", rx: 8 }), "nl-s2"));
    objs.push(new fabric.IText("⚡  Quick Bites", { left: 28, top: 332, fontSize: 14, fontFamily: "Inter", fontWeight: "bold", fill: "#111113", selectable: false, evented: false }));
    // Section 3 — Customer Story
    objs.push(obj(new fabric.Rect({ left: 12, top: 512, width: w - 24, height: 200, fill: "#ffffff", rx: 8 }), "nl-s3"));
    objs.push(new fabric.IText("💬  Customer Story — Acme Corp", { left: 28, top: 528, fontSize: 14, fontFamily: "Inter", fontWeight: "bold", fill: "#111113", selectable: false, evented: false }));
  }

  return objs;
}

/* ── Component ─────────────────────────────────────────────────────── */

export function StudioCanvas({ format, selectedId, onSelect, zoom, onReady }: Props) {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricMod>(null);
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef<number>(-1);
  const dims = FORMAT_DIMS[format];

  /* save snapshot for undo/redo */
  function saveSnapshot(canvas: FabricMod) {
    const json = canvas.toJSON(["customId"]);
    const str = JSON.stringify(json);
    // Trim future if we branched
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(str);
    historyIdxRef.current = historyRef.current.length - 1;
  }

  /* Initialize Fabric.js once */
  useEffect(() => {
    if (!canvasElRef.current) return;
    let canvas: FabricMod;
    let disposed = false;

    import("fabric").then(({ fabric }) => {
      if (disposed) return;

      canvas = new fabric.Canvas(canvasElRef.current, {
        width: dims.w,
        height: dims.h,
        backgroundColor: "#f8f8fa",
        preserveObjectStacking: true,
        selection: true,
      });
      fabricRef.current = canvas;

      /* Load format template */
      const template = buildTemplate(fabric, format, dims.w, dims.h);
      template.forEach((o: FabricMod) => canvas.add(o));
      canvas.renderAll();
      saveSnapshot(canvas);

      /* Selection events */
      canvas.on("selection:created", (e: FabricMod) => {
        const obj = e.selected?.[0];
        if (obj?.customId) onSelect(obj.customId);
      });
      canvas.on("selection:updated", (e: FabricMod) => {
        const obj = e.selected?.[0];
        if (obj?.customId) onSelect(obj.customId);
      });
      canvas.on("selection:cleared", () => onSelect(null));

      /* Save history on modifications */
      canvas.on("object:modified", () => saveSnapshot(canvas));
      canvas.on("object:added", () => saveSnapshot(canvas));
      canvas.on("object:removed", () => saveSnapshot(canvas));

      /* Expose API */
      const api: CanvasApi = {
        exportPNG() {
          const dataUrl = canvas.toDataURL({ format: "png", multiplier: 2 });
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `ora-${format}-export.png`;
          a.click();
        },
        undo() {
          if (historyIdxRef.current <= 0) return;
          historyIdxRef.current--;
          const snapshot = historyRef.current[historyIdxRef.current];
          canvas.loadFromJSON(JSON.parse(snapshot), () => canvas.renderAll());
        },
        redo() {
          if (historyIdxRef.current >= historyRef.current.length - 1) return;
          historyIdxRef.current++;
          const snapshot = historyRef.current[historyIdxRef.current];
          canvas.loadFromJSON(JSON.parse(snapshot), () => canvas.renderAll());
        },
        updateSelectedOpacity(val: number) {
          const active = canvas.getActiveObject();
          if (active) {
            active.set("opacity", val / 100);
            canvas.renderAll();
          }
        },
        updateSelectedColor(color: string) {
          const active = canvas.getActiveObject();
          if (!active) return;
          if (active.type === "i-text" || active.type === "text") {
            (active as FabricMod).set("fill", color);
          } else {
            (active as FabricMod).set("fill", color);
          }
          canvas.renderAll();
        },
        updateSelectedTextProp(key: string, val: unknown) {
          const active = canvas.getActiveObject();
          if (active && (active.type === "i-text" || active.type === "text")) {
            (active as FabricMod).set({ [key]: val });
            canvas.renderAll();
          }
        },
        addImageFromUrl(url: string) {
          fabric.Image.fromURL(url, (img: FabricMod) => {
            const maxW = dims.w * 0.5;
            const maxH = dims.h * 0.5;
            const scale = Math.min(maxW / (img.width ?? 1), maxH / (img.height ?? 1));
            img.set({ left: dims.w / 2, top: dims.h / 2, originX: "center", originY: "center", scaleX: scale, scaleY: scale });
            (img as FabricMod).customId = `uploaded-${Date.now()}`;
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
          }, { crossOrigin: "anonymous" });
        },
        addShadowToSelected() {
          const active = canvas.getActiveObject();
          if (active) {
            (active as FabricMod).set({ shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.2)", blur: 12, offsetX: 0, offsetY: 4 }) });
            canvas.renderAll();
          }
        },
      };

      onReady?.(api);
    });

    return () => {
      disposed = true;
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]); // Reinitialize when format changes

  /* Highlight selected element */
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !selectedId) return;
    const objs = canvas.getObjects() as FabricMod[];
    const target = objs.find((o) => o.customId === selectedId);
    if (target) {
      canvas.setActiveObject(target);
      canvas.renderAll();
    }
  }, [selectedId]);

  const scaleFactor = zoom / 100;

  return (
    <div
      className="flex-1 overflow-auto flex items-center justify-center"
      style={{ background: "#e8e8ec", padding: 32 }}
    >
      <div
        style={{
          transform: `scale(${scaleFactor})`,
          transformOrigin: "center center",
          boxShadow: "0 4px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)",
          lineHeight: 0,
        }}
      >
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
}
