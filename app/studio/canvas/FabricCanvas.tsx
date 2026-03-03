"use client";

import { useEffect, useRef } from "react";
import { fabric } from "fabric";

interface FabricApi {
  addText: (props: { fontSize: number; fontFamily: string; fontWeight: string; fontStyle: string; textAlign: string; fill: string }) => void;
  addRect: () => void;
  addCircle: () => void;
  addImage: (url: string) => void;
  deleteSelected: () => void;
  exportPNG: () => void;
  updateTextProps: (props: Record<string, unknown>) => void;
  bringForward: () => void;
  sendBackward: () => void;
  setZoom: (z: number) => void;
  toggleVisibility: (id: string) => void;
  saveJSON: () => string;
  loadJSON: (json: string) => void;
}

interface Props {
  width: number;
  height: number;
  onReady: (api: FabricApi) => void;
}

export default function FabricCanvas({ width, height, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    const api: FabricApi = {
      addText({ fontSize, fontFamily, fontWeight, fontStyle, textAlign, fill }) {
        const text = new fabric.IText("Double-cliquez pour éditer", {
          left: width / 2,
          top: height / 2,
          originX: "center",
          originY: "center",
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle: fontStyle as "" | "normal" | "italic" | "oblique",
          textAlign,
          fill,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        canvas.renderAll();
      },

      addRect() {
        const rect = new fabric.Rect({
          left: width / 2 - 150,
          top: height / 2 - 100,
          width: 300,
          height: 200,
          fill: "#e8e8ec",
          stroke: "#c0c0c8",
          strokeWidth: 1,
          rx: 8,
          ry: 8,
        });
        canvas.add(rect);
        canvas.setActiveObject(rect);
        canvas.renderAll();
      },

      addCircle() {
        const circle = new fabric.Circle({
          left: width / 2 - 100,
          top: height / 2 - 100,
          radius: 100,
          fill: "#e8e8ec",
          stroke: "#c0c0c8",
          strokeWidth: 1,
        });
        canvas.add(circle);
        canvas.setActiveObject(circle);
        canvas.renderAll();
      },

      addImage(url: string) {
        fabric.Image.fromURL(url, (img) => {
          const maxW = width * 0.5;
          const maxH = height * 0.5;
          const scale = Math.min(maxW / (img.width ?? 1), maxH / (img.height ?? 1));
          img.set({
            left: width / 2,
            top: height / 2,
            originX: "center",
            originY: "center",
            scaleX: scale,
            scaleY: scale,
          });
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
        }, { crossOrigin: "anonymous" });
      },

      deleteSelected() {
        const active = canvas.getActiveObject();
        if (active) {
          canvas.remove(active);
          canvas.renderAll();
        }
      },

      exportPNG() {
        const dataUrl = canvas.toDataURL({ format: "png", multiplier: 1 });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "ora-export.png";
        a.click();
      },

      updateTextProps(props: Record<string, unknown>) {
        const active = canvas.getActiveObject();
        if (active && (active.type === "i-text" || active.type === "text")) {
          active.set(props as Partial<fabric.IText>);
          canvas.renderAll();
        }
      },

      bringForward() {
        const active = canvas.getActiveObject();
        if (active) {
          canvas.bringForward(active);
          canvas.renderAll();
        }
      },

      sendBackward() {
        const active = canvas.getActiveObject();
        if (active) {
          canvas.sendBackwards(active);
          canvas.renderAll();
        }
      },

      setZoom(z: number) {
        canvas.setZoom(z);
        canvas.renderAll();
      },

      toggleVisibility(id: string) {
        const obj = canvas.getObjects().find(o => (o as fabric.Object & { customId?: string }).customId === id);
        if (obj) {
          obj.set("visible", !obj.visible);
          canvas.renderAll();
        }
      },

      saveJSON() {
        return JSON.stringify(canvas.toJSON());
      },

      loadJSON(json: string) {
        canvas.loadFromJSON(json, () => canvas.renderAll());
      },
    };

    onReady(api);

    return () => {
      canvas.dispose();
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        boxShadow: "0 4px 32px rgba(0,0,0,0.15)",
      }}
    />
  );
}
