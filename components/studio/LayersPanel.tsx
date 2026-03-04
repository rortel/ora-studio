"use client";

import { Eye, EyeOff } from "lucide-react";
import type { FormatType } from "./StudioCanvas";

interface Layer {
  id: string;
  label: string;
  type: string;
}

interface Props {
  format: FormatType;
  selectedId: string | null;
  onSelect: (id: string) => void;
  layerVisibility: Record<string, boolean>;
  onToggleVisibility: (id: string) => void;
}

/* Ordered layer definitions per format */
const FORMAT_LAYERS: Record<FormatType, Layer[]> = {
  linkedin: [
    { id: "ln-engagement", label: "Engagement Bar", type: "shape" },
    { id: "ln-image",      label: "Post Image",     type: "image" },
    { id: "ln-body",       label: "Post Body",      type: "text"  },
    { id: "ln-header",     label: "Profile Header", type: "group" },
  ],
  email: [
    { id: "em-footer",   label: "Footer",       type: "text"   },
    { id: "em-cta",      label: "CTA Button",   type: "button" },
    { id: "em-body",     label: "Body Text",    type: "text"   },
    { id: "em-headline", label: "Headline",     type: "text"   },
    { id: "em-hero",     label: "Hero Image",   type: "image"  },
    { id: "em-header",   label: "Card Frame",   type: "group"  },
  ],
  sms: [
    { id: "sms-msg2",   label: "Message 2 — Link", type: "text"  },
    { id: "sms-msg1",   label: "Message 1",        type: "text"  },
    { id: "sms-header", label: "Contact Header",   type: "group" },
  ],
  ad: [
    { id: "ad-cta",      label: "CTA Button",  type: "button" },
    { id: "ad-visual",   label: "Pulse Visual", type: "image"  },
    { id: "ad-headline", label: "Headline",    type: "text"   },
    { id: "ad-logo",     label: "Logo",        type: "image"  },
    { id: "ad-bg",       label: "Background",  type: "shape"  },
  ],
  landing: [
    { id: "lp-visual", label: "Hero Visual",  type: "image" },
    { id: "lp-cta",    label: "CTA Button",   type: "button" },
    { id: "lp-sub",    label: "Subtitle",     type: "text"  },
    { id: "lp-hero",   label: "Headline",     type: "text"  },
    { id: "lp-nav",    label: "Navigation",   type: "group" },
  ],
  stories: [
    { id: "st-cta",    label: "Swipe Up",     type: "button" },
    { id: "st-text",   label: "Text Overlay", type: "text"   },
    { id: "st-visual", label: "Pulse Visual", type: "image"  },
    { id: "st-bg",     label: "Background",   type: "shape"  },
  ],
  newsletter: [
    { id: "nl-s3",     label: "Section — Customer Story", type: "group" },
    { id: "nl-s2",     label: "Section — Quick Bites",    type: "group" },
    { id: "nl-s1",     label: "Section — Feature",        type: "group" },
    { id: "nl-header", label: "Newsletter Header",        type: "group" },
  ],
};

const TYPE_DOT: Record<string, string> = {
  text:   "#3b4fc4",
  image:  "#16a34a",
  shape:  "#9ca3af",
  button: "#f59e0b",
  group:  "#8b5cf6",
};

export function LayersPanel({ format, selectedId, onSelect, layerVisibility, onToggleVisibility }: Props) {
  const layers = FORMAT_LAYERS[format] ?? [];

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-3 py-2.5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
          Layers
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {layers.map((layer) => {
          const isSelected = selectedId === layer.id;
          const isHidden = layerVisibility[layer.id] === false;

          return (
            <div
              key={layer.id}
              onClick={() => onSelect(layer.id)}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
              style={{
                background: isSelected ? "var(--ora-signal-light)" : "transparent",
                borderBottom: "1px solid var(--border)",
                opacity: isHidden ? 0.4 : 1,
              }}
            >
              {/* Type dot */}
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: TYPE_DOT[layer.type] ?? "#9ca3af" }}
              />

              {/* Label */}
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontSize: "11px",
                    color: isSelected ? "var(--ora-signal)" : "var(--foreground)",
                    fontWeight: isSelected ? 500 : 400,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  {layer.label}
                </div>
                <div style={{ fontSize: "9px", color: "var(--muted-foreground)", textTransform: "capitalize" }}>
                  {layer.type}
                </div>
              </div>

              {/* Visibility toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={isHidden ? "Show layer" : "Hide layer"}
              >
                {isHidden
                  ? <EyeOff size={11} />
                  : <Eye size={11} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
