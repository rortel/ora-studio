"use client";

import { motion } from "motion/react";

const proofPoints = [
  {
    title: "Faster creation",
    body: "One brief, multiple models, one click. No retyping, no reformatting, no switching apps.",
  },
  {
    title: "Clearer decisions",
    body: "See three outputs side by side. You know which one works because you can compare - not guess.",
  },
  {
    title: "Fewer revisions",
    body: "When Brand Vault is on, compliance issues are caught before you publish. Less back-and-forth with your team or clients.",
  },
];

export function ValueProposition() {
  return (
    <section className="py-20 md:py-28" style={{ background: "rgba(244,244,246,0.4)" }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
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
            What changes when you use ORA
          </h2>
          <p style={{ fontSize: "16px", lineHeight: 1.6, color: "var(--muted-foreground)", maxWidth: "860px" }}>
            You stop switching between GPT-4o, Claude Sonnet 4, Gemini 2.5 Pro, Flux 1.1 Pro, Kling 3.0 Pro, and separate design apps.
            You stop copying prompts from one tool to another. You stop wondering if the output matches your brand.
            <br />
            <br />
            Instead, you open one tab. You choose the model that fits the task. If the project is personal or informal -
            you generate and move on. If it&apos;s for your business or a client - you turn on Brand Vault, and ORA handles the rest.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {proofPoints.map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl p-6"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              }}
            >
              <h3 style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--foreground)", marginBottom: "12px" }}>
                {point.title}
              </h3>
              <p style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--muted-foreground)" }}>
                {point.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
