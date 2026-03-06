import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, Search, X, Image, Film, Palette, Sparkles, FolderOpen, Check } from "lucide-react";

export interface MediaItem {
  id: string;
  name: string;
  type: "image" | "video" | "brand-asset";
  gradient: string;
  source: "generated" | "uploaded" | "brand";
  date: string;
  dimensions?: string;
}

const mockMedia: MediaItem[] = [
  { id: "g1", name: "AI Analytics Visual", type: "image", gradient: "linear-gradient(135deg, #e8eaf6, #c5cae9)", source: "generated", date: "Today", dimensions: "1200x628" },
  { id: "g2", name: "Product Hero — Dark", type: "image", gradient: "linear-gradient(135deg, #1a1a2e, #3b4fc4)", source: "generated", date: "Today", dimensions: "1920x1080" },
  { id: "g3", name: "Story Visual — Signal", type: "image", gradient: "linear-gradient(180deg, #1a1a2e, #3b4fc4)", source: "generated", date: "Today", dimensions: "1080x1920" },
  { id: "g4", name: "Email Banner", type: "image", gradient: "linear-gradient(135deg, #e3f2fd, #bbdefb)", source: "generated", date: "Yesterday", dimensions: "600x200" },
  { id: "b1", name: "Logo — Primary", type: "brand-asset", gradient: "linear-gradient(135deg, #f5f5f7, #ededf0)", source: "brand", date: "Brand Kit", dimensions: "800x200" },
  { id: "b2", name: "Logo — White", type: "brand-asset", gradient: "linear-gradient(135deg, #2d2d5e, #1a1a2e)", source: "brand", date: "Brand Kit", dimensions: "800x200" },
  { id: "b3", name: "Icon Set — Product", type: "brand-asset", gradient: "linear-gradient(135deg, #f0f0f3, #e4e7f0)", source: "brand", date: "Brand Kit", dimensions: "1200x800" },
  { id: "u1", name: "Team Photo — Office", type: "image", gradient: "linear-gradient(135deg, #d7ccc8, #bcaaa4)", source: "uploaded", date: "Feb 24", dimensions: "4000x2667" },
  { id: "u2", name: "Event Recording", type: "video", gradient: "linear-gradient(135deg, #37474f, #263238)", source: "uploaded", date: "Feb 22", dimensions: "1920x1080" },
  { id: "u3", name: "Product Screenshot", type: "image", gradient: "linear-gradient(135deg, #fafafa, #e0e0e0)", source: "uploaded", date: "Feb 20", dimensions: "2560x1440" },
  { id: "g5", name: "Abstract Pattern — Dots", type: "image", gradient: "radial-gradient(circle at 30% 40%, #3b4fc4 0%, transparent 50%), radial-gradient(circle at 70% 60%, #6b7ec9 0%, transparent 50%), #f5f5f7", source: "generated", date: "Feb 21", dimensions: "1200x1200" },
  { id: "g6", name: "Social Proof Banner", type: "image", gradient: "linear-gradient(90deg, #f5f5f7, #e8eaf6, #f5f5f7)", source: "generated", date: "Feb 20", dimensions: "1200x628" },
];

type TabId = "all" | "generated" | "uploaded" | "brand";

const tabs: { id: TabId; label: string; icon: typeof Image }[] = [
  { id: "all", label: "All", icon: FolderOpen },
  { id: "generated", label: "Generated", icon: Sparkles },
  { id: "uploaded", label: "Uploaded", icon: Upload },
  { id: "brand", label: "Brand Kit", icon: Palette },
];

interface MediaLibraryProps {
  onAddToCanvas?: (item: MediaItem) => void;
}

export function MediaLibrary({ onAddToCanvas }: MediaLibraryProps) {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<MediaItem[]>(mockMedia);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredItems = items.filter((item) => {
    const matchesTab = activeTab === "all" || item.source === activeTab;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleUpload = (files: FileList | null) => {
    if (!files) return;
    const newItems: MediaItem[] = Array.from(files).map((file, i) => ({
      id: `upload-${Date.now()}-${i}`,
      name: file.name.replace(/\.[^/.]+$/, ""),
      type: file.type.startsWith("video") ? "video" as const : "image" as const,
      gradient: `linear-gradient(135deg, hsl(${Math.random() * 360}, 30%, 85%), hsl(${Math.random() * 360}, 30%, 75%))`,
      source: "uploaded" as const,
      date: "Just now",
      dimensions: "Analyzing...",
    }));
    setItems((prev) => [...newItems, ...prev]);
    setActiveTab("uploaded");
  };

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search media..."
            className="w-full bg-secondary/80 border-none rounded-md pl-8 pr-3 py-1.5 text-foreground placeholder:text-muted-foreground/40"
            style={{ fontSize: "12px" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3 flex gap-1 pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                isActive ? "bg-ora-signal-light text-ora-signal" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
              style={{ fontSize: "10px", fontWeight: isActive ? 600 : 400 }}
            >
              <Icon size={10} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Upload zone */}
      <div
        className={`mx-3 mb-2 border-2 border-dashed rounded-lg p-3 text-center transition-all cursor-pointer ${
          isDragOver ? "border-ora-signal bg-ora-signal-light" : "border-border hover:border-border-strong"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleUpload(e.dataTransfer.files);
        }}
      >
        <Upload size={16} className={`mx-auto mb-1 ${isDragOver ? "text-ora-signal" : "text-muted-foreground"}`} />
        <p style={{ fontSize: "11px", fontWeight: 500, color: isDragOver ? "var(--ora-signal)" : "var(--muted-foreground)" }}>
          Drop files or click to upload
        </p>
        <p style={{ fontSize: "9px", color: "var(--muted-foreground)", marginTop: 2 }}>
          PNG, JPG, SVG, MP4, MOV
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
      </div>

      {/* Media grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--muted-foreground)" }}>
            {filteredItems.length} items
          </span>
          {selectedItems.size > 0 && (
            <button
              onClick={() => {
                const item = items.find((i) => selectedItems.has(i.id));
                if (item && onAddToCanvas) onAddToCanvas(item);
              }}
              className="px-2 py-0.5 rounded text-white cursor-pointer"
              style={{ background: "var(--ora-signal)", fontSize: "10px", fontWeight: 500 }}
            >
              Add to canvas ({selectedItems.size})
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <AnimatePresence>
            {filteredItems.map((item, i) => {
              const isSelected = selectedItems.has(item.id);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.02 }}
                  className={`group relative rounded-lg overflow-hidden cursor-pointer border transition-all ${
                    isSelected ? "border-ora-signal ring-1 ring-ora-signal/30" : "border-transparent hover:border-border-strong"
                  }`}
                  onClick={() => toggleSelect(item.id)}
                  onDoubleClick={() => onAddToCanvas?.(item)}
                >
                  <div className="aspect-square" style={{ background: item.gradient }}>
                    {item.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Film size={16} className="text-white/60" />
                      </div>
                    )}
                    {/* Selection checkmark */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: "var(--ora-signal)" }}>
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                    {/* Source badge */}
                    <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="px-1.5 py-0.5 rounded bg-black/40 text-white" style={{ fontSize: "8px", fontWeight: 500 }}>
                        {item.source === "generated" ? "AI" : item.source === "brand" ? "Brand" : "Upload"}
                      </span>
                    </div>
                  </div>
                  <div className="p-1.5 bg-card">
                    <p className="truncate" style={{ fontSize: "10px", fontWeight: 450, color: "var(--foreground)" }}>
                      {item.name}
                    </p>
                    <p style={{ fontSize: "9px", color: "var(--muted-foreground)" }}>
                      {item.dimensions}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
