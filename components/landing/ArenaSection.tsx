"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";

const outputs = [
  {
    model: "GPT-4o",
    provider: "OpenAI",
    text: "Every AI tool, one workspace. Spend less time switching — more time creating.",
    selected: false,
  },
  {
    model: "Claude Sonnet 4",
    provider: "Anthropic",
    text: "The right AI for the right job, every time. ORA shows you all your options at once — so you always ship the best output.",
    selected: true,
  },
  {
    model: "Gemini 2.5 Flash",
    provider: "Google",
    text: "One prompt. Multiple models. One clear decision. Stop guessing — start comparing.",
    selected: false,
  },
];

export function ArenaSection() {
  return (
    <section className="py-20 md:py-28" style={{ background: "rgba(244,244,246,0.4)" }}>
      <div className="max-w-[1200px] mx-auto px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--ora-signal)", marginBottom: 12 }}>
            ARENA
          </p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h2
              style={{
                fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                fontWeight: 500,
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                color: "var(--foreground)",
              }}
            >
              Stop guessing which model is best.<br />
              See for yourself.
            </h2>
            <p style={{ fontSize: "15px", lineHeight: 1.55, color: "var(--muted-foreground)", maxWidth: 380 }}>
              Write your prompt once. Arena sends it to multiple models in parallel.
              Pick the best output — or combine parts from different results.
            </p>
          </div>
        </motion.div>

        {/* Prompt bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.08 }}
          className="mb-3 rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: "var(--card)", border: "1px solid var(--border-strong)" }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              color: "var(--muted-foreground)",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            Prompt
          </span>
          <span style={{ fontSize: "14px", color: "var(--foreground)", flex: 1 }}>
            Write a short tagline for an AI productivity tool. Honest, direct, no buzzwords.
          </span>
          <span
            className="flex-shrink-0 px-2.5 py-1 rounded-full"
            style={{ fontSize: "11px", fontWeight: 500, color: "var(--ora-signal)", background: "var(--ora-signal-light)" }}
          >
            3 models
          </span>
        </motion.div>

        {/* Model outputs */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {outputs.map((item, i) => (
            <motion.div
              key={item.model}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 + i * 0.08 }}
              className="rounded-xl flex flex-col"
              style={{
                background: "var(--card)",
                border: `1px solid ${item.selected ? "var(--ora-signal)" : "var(--border)"}`,
                boxShadow: item.selected
                  ? "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(59,79,196,0.08)"
                  : "0 1px 2px rgba(0,0,0,0.02)",
              }}
            >
              <div
                className="px-4 pt-4 pb-3 flex items-center justify-between"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>{item.model}</span>
                  <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{item.provider}</span>
                </div>
                {item.selected && (
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background: "var(--ora-signal)" }}
                  >
                    <Check size={10} color="white" />
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "white" }}>Chosen</span>
                  </div>
                )}
              </div>
              <div className="p-4 flex-1">
                <p style={{ fontSize: "14px", lineHeight: 1.65, color: "var(--foreground)" }}>
                  &ldquo;{item.text}&rdquo;
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          style={{ fontSize: "13px", color: "var(--muted-foreground)" }}
        >
          Arena pricing — text (3 models): 5 credits · image (3 models): 9 credits · credits never expire
        </motion.p>

      </div>
    </section>
  );
}
