"use client";

import { motion } from "motion/react";

const steps = [
  {
    num: "01",
    title: "Generate with any model",
    desc: "Open Hub or Chat, pick one or several models, type your prompt. You get results in seconds - text, image, video, or code. No setup, no Brand Vault required. Just you and the AI you prefer.",
  },
  {
    num: "02",
    title: "Compare and pick the best parts",
    desc: "Run the same prompt on 2 to 4 models at once with Arena. See every result side by side. Pick the one you like. Or take the best paragraph from one, the best hook from another, and combine them into a single output.",
  },
  {
    num: "03",
    title: "Turn on Studio when it matters",
    desc: "Working on something official? Switch to Studio mode. Connect your Brand Vault - ORA checks tone, vocabulary, structure, and visual direction against your guidelines. You publish knowing it fits.",
  },
];

export function ThreeSteps() {
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
              marginBottom: "16px",
            }}
          >
            Three steps. Two modes. One platform.
          </h2>
          <p style={{ fontSize: "16px", lineHeight: 1.55, color: "var(--muted-foreground)" }}>
            Start fast in Aggregator mode. Switch to Studio when the work needs brand control.
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
              className="pt-6"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <span
                className="block mb-4"
                style={{ fontSize: "14px", fontWeight: 500, color: "var(--ora-signal)" }}
              >
                {step.num}
              </span>
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.3,
                  color: "var(--foreground)",
                  marginBottom: "12px",
                }}
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
