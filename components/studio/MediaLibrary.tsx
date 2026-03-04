"use client";

import { useRef, useState } from "react";
import { Upload, ImageIcon, Trash2, Plus } from "lucide-react";

interface UploadedImage {
  id: string;
  url: string;
  name: string;
}

interface Props {
  onAddImage?: (url: string) => void;
}

export function MediaLibrary({ onAddImage }: Props) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function processFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setImages((prev) => [
        { id: `img-${Date.now()}-${Math.random().toString(36).slice(2)}`, url, name: file.name },
        ...prev,
      ]);
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }

  function handleDelete(id: string, url: string) {
    setImages((prev) => prev.filter((img) => img.id !== id));
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-3 py-2.5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
          Media
        </span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md cursor-pointer transition-colors hover:bg-secondary"
          style={{ fontSize: "10px", color: "var(--ora-signal)" }}
          title="Upload image"
        >
          <Plus size={10} />
          Upload
        </button>
      </div>

      {/* Drop zone (visible when empty) */}
      {images.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex flex-col items-center justify-center gap-2 m-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
          style={{
            borderColor: dragging ? "var(--ora-signal)" : "var(--border)",
            background: dragging ? "var(--ora-signal-light)" : "transparent",
          }}
        >
          <Upload size={20} className="text-muted-foreground/40" />
          <p style={{ fontSize: "11px", color: "var(--muted-foreground)", textAlign: "center" }}>
            Glissez des images<br />ou cliquez pour importer
          </p>
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="flex-1 overflow-y-auto p-2">
          {/* Upload more button */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="w-full mb-2 flex items-center gap-1.5 px-2 py-2 rounded-lg border border-dashed cursor-pointer transition-colors hover:bg-secondary"
            style={{ borderColor: dragging ? "var(--ora-signal)" : "var(--border)" }}
          >
            <Upload size={11} className="text-muted-foreground" />
            <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
              Ajouter des images
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {images.map((img) => (
              <div key={img.id} className="relative group">
                {/* Thumbnail */}
                <button
                  onClick={() => onAddImage?.(img.url)}
                  className="w-full aspect-square rounded-lg overflow-hidden border cursor-pointer transition-opacity hover:opacity-90"
                  style={{ borderColor: "var(--border)" }}
                  title={`Ajouter : ${img.name}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                </button>

                {/* Delete button (hover) */}
                <button
                  onClick={() => handleDelete(img.id, img.url)}
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ background: "rgba(0,0,0,0.5)" }}
                  title="Supprimer"
                >
                  <Trash2 size={10} className="text-white" />
                </button>

                {/* Filename */}
                <p
                  style={{
                    fontSize: "8px",
                    color: "var(--muted-foreground)",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    marginTop: 2,
                    paddingLeft: 2,
                  }}
                >
                  {img.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
