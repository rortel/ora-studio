"use client";

import { motion } from "motion/react";

const brandColors = ["#1a1a2e", "#3b4fc4", "#f4f4f6", "#6b6b7b"];

const canvasLayers = [
  { label: "Headline", active: true },
  { label: "Body text", active: false },
  { label: "Background", active: false },
];

const features = [
  "Brand Vault — tone, colors, fonts, personas, vocabulary",
  "Canvas editor — text, images, shapes, layers, export PNG",
  "Asset Builder — brief → script → visuals → brand check",
  "Compliance check on every generation, automatically",
];

export function StudioSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-start">

          {/* Left: text */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--ora-signal)", marginBottom: 12 }}>
              STUDIO PLAN — €49/mo
            </p>
            <h2
              style={{
                fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                fontWeight: 500,
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                color: "var(--foreground)",
                marginBottom: 20,
              }}
            >
              Brand control.<br />Visual production.
            </h2>
            <p style={{ fontSize: "16px", lineHeight: 1.6, color: "var(--muted-foreground)", marginBottom: 16 }}>
              Studio adds brand intelligence on top of generation. Set up your Brand Vault once — tone, visual identity, vocabulary, personas. Every output checks against it before you see it.
            </p>
            <p style={{ fontSize: "16px", lineHeight: 1.6, color: "var(--muted-foreground)", marginBottom: 32 }}>
              Then compose in the Canvas: a visual editor built directly into ORA. Text, images, shapes, layers, export — without switching tools.
            </p>

            <div className="space-y-3">
              {features.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div
                    className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0"
                    style={{ background: "var(--ora-signal)" }}
                  />
                  <span style={{ fontSize: "14px", lineHeight: 1.5, color: "var(--foreground)" }}>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: visual mockups */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >

            {/* Brand Vault card */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.05)",
              }}
            >
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    color: "var(--muted-foreground)",
                    textTransform: "uppercase",
                  }}
                >
                  Brand Vault
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
                  <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Active</span>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Brand name + palette */}
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: 2 }}>BRAND</div>
                    <div style={{ fontSize: "15px", fontWeight: 500, color: "var(--foreground)" }}>Acme Corp</div>
                  </div>
                  <div className="flex gap-1.5">
                    {brandColors.map((c) => (
                      <div
                        key={c}
                        className="w-5 h-5 rounded"
                        style={{ background: c, border: "1px solid var(--border)" }}
                      />
                    ))}
                  </div>
                </div>

                {/* Tone */}
                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted-foreground)", marginBottom: 6 }}>TONE</div>
                  <div
                    className="px-3 py-2 rounded-lg"
                    style={{
                      background: "var(--secondary)",
                      fontSize: "14px",
                      color: "var(--foreground)",
                      fontStyle: "italic",
                      lineHeight: 1.5,
                    }}
                  >
                    &ldquo;Clear. Direct. Human. No jargon, no surprises.&rdquo;
                  </div>
                </div>

                {/* Typography */}
                <div className="flex items-center justify-between">
                  <div style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>TYPOGRAPHY</div>
                  <div style={{ fontSize: "13px", color: "var(--foreground)", fontFamily: "var(--font-mono, monospace)" }}>
                    Inter / JetBrains Mono
                  </div>
                </div>
              </div>
            </div>

            {/* Canvas card */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.05)",
              }}
            >
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    color: "var(--muted-foreground)",
                    textTransform: "uppercase",
                  }}
                >
                  Canvas — Table de montage
                </span>
                <span
                  className="px-2 py-0.5 rounded"
                  style={{ fontSize: "10px", fontWeight: 600, color: "var(--ora-signal)", background: "var(--ora-signal-light)" }}
                >
                  1:1
                </span>
              </div>

              <div className="p-4">
                {/* Artboard + layers */}
                <div className="flex gap-3 mb-3">
                  {/* Artboard */}
                  <div
                    className="flex-1 rounded-lg p-3"
                    style={{ background: "#f8f8f8", border: "1px solid var(--border)", minHeight: 110 }}
                  >
                    <div
                      className="px-2 py-1.5 rounded mb-2"
                      style={{ background: "var(--card)", border: "1px solid var(--ora-signal)" }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--foreground)" }}>Headline block</div>
                    </div>
                    <div
                      className="px-2 py-1.5 rounded mb-2"
                      style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
                    >
                      <div style={{ fontSize: "9px", color: "var(--muted-foreground)" }}>Body text block</div>
                    </div>
                    <div
                      className="rounded"
                      style={{ background: "var(--muted)", height: 20, width: "55%" }}
                    />
                  </div>

                  {/* Layers panel */}
                  <div className="w-28 shrink-0">
                    <div
                      style={{
                        fontSize: "9px",
                        fontWeight: 600,
                        color: "var(--muted-foreground)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      Layers
                    </div>
                    <div className="space-y-1">
                      {canvasLayers.map((layer) => (
                        <div
                          key={layer.label}
                          className="px-2 py-1.5 rounded"
                          style={{
                            background: layer.active ? "var(--ora-signal-light)" : "var(--secondary)",
                            border: `1px solid ${layer.active ? "var(--ora-signal)" : "var(--border)"}`,
                            fontSize: "11px",
                            color: layer.active ? "var(--ora-signal)" : "var(--muted-foreground)",
                            fontWeight: layer.active ? 500 : 400,
                          }}
                        >
                          {layer.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <div
                    className="px-3 py-1.5 rounded-lg"
                    style={{ background: "var(--primary)", fontSize: "12px", fontWeight: 500, color: "white" }}
                  >
                    Export PNG
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-lg"
                    style={{ background: "var(--secondary)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--muted-foreground)" }}
                  >
                    4 ratios
                  </div>
                  <div
                    className="ml-auto px-2 py-1 rounded"
                    style={{ background: "var(--ora-signal-light)", fontSize: "11px", fontWeight: 500, color: "var(--ora-signal)" }}
                  >
                    Brand check ✓
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
