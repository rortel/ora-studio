"use client";

import { motion } from "motion/react";

const roles = [
  {
    title: "CEO / Founder",
    quote: '"One platform instead of five tools."',
    desc: "One subscription covers text, image, video, and code from every major AI provider. Use Hub for quick personal tasks. Switch to Studio for business content. No more juggling accounts.",
  },
  {
    title: "CMO / Marketing Lead",
    quote: '"Speed with control - not speed versus control."',
    desc: "Compare model outputs on the same brief before committing. When it's time to publish, Brand Vault scores every asset. Your team ships faster without dropping quality.",
  },
  {
    title: "Head of Content / Comms",
    quote: '"Better first drafts, fewer rewrite cycles."',
    desc: "Give one brief, get perspectives from several models. Keep the strongest angles, discard the rest. What used to take three rounds of edits now takes one.",
  },
  {
    title: "Brand Lead / Creative Director",
    quote: '"Brand Vault is a guardrail, not a cage."',
    desc: "Brand Vault checks tone, vocabulary, and structure - it doesn't write for you. Your team keeps creative freedom. The vault just makes sure nothing ships off-brand.",
  },
];

export function DecisionMakers() {
  return (
    <section id="roles" className="py-20 md:py-28">
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
            Built for the way you actually work
          </h2>
          <p style={{ fontSize: "16px", lineHeight: 1.55, color: "var(--muted-foreground)", maxWidth: "720px" }}>
            Whether you&apos;re solo or leading a team, ORA adapts to your workflow.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-5">
          {roles.map((role, i) => (
            <motion.div
              key={role.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl p-7"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 style={{ fontSize: "17px", fontWeight: 600, letterSpacing: "-0.01em", color: "var(--foreground)" }}>
                  {role.title}
                </h3>
                <span
                  className="italic flex-shrink-0 ml-4"
                  style={{ fontSize: "13.5px", color: "var(--muted-foreground)" }}
                >
                  {role.quote}
                </span>
              </div>
              <p style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--muted-foreground)" }}>
                {role.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
