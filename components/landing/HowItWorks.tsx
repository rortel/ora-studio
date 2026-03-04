"use client";

import { motion } from "motion/react";

const steps = [
  {
    num: "01",
    title: "Generate with the right model",
    desc: "Text, image, video, code — pick from the top models for each category, or let ORA route your prompt. No juggling tabs, no managing subscriptions.",
  },
  {
    num: "02",
    title: "Compare outputs in Arena",
    desc: "One prompt to 2–4 models at once. Results side by side. Pick the best, mix parts from different outputs, or refine on the spot.",
  },
  {
    num: "03",
    title: "Choose. Publish. Move on.",
    desc: "Keep what works, discard the rest. Add Studio for brand consistency, the Canvas editor, and publish-ready assets — when the project calls for it.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <h2
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: "var(--foreground)",
              marginBottom: 16,
            }}
          >
            Generate. Compare. Choose.
          </h2>
          <p style={{ fontSize: "16px", lineHeight: 1.55, color: "var(--muted-foreground)", maxWidth: 560 }}>
            A clear workflow for every type of generation. No complexity, no tool switching.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="border-t pt-6"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="block mb-4" style={{ fontSize: "14px", fontWeight: 500, color: "var(--ora-signal)" }}>
                {step.num}
              </span>
              <h3
                className="mb-3"
                style={{ fontSize: "18px", fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.3, color: "var(--foreground)" }}
              >
                {step.title}
              </h3>
              <p style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--muted-foreground)" }}>
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
