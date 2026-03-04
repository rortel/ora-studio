"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="pt-16 pb-16 md:pt-24 md:pb-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="max-w-[740px]">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ora-signal)" }} />
            <span style={{ fontSize: "14px", fontWeight: 400, color: "var(--foreground)" }}>
              Generate. Compare. Choose the best.
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="mb-8"
            style={{
              fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
              fontWeight: 500,
              lineHeight: 1.1,
              letterSpacing: "-0.035em",
            }}
          >
            <span style={{ color: "var(--foreground)" }}>Every AI model. One account.</span>
            <br />
            <span style={{ color: "var(--muted-foreground)" }}>Your brand if you need it.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mb-4"
            style={{ fontSize: "18px", lineHeight: 1.55, color: "rgba(17,17,19,0.8)" }}
          >
            ORA brings the best models for text, image, video, and code into one clear workspace.
            Generate with the right model, compare outputs in Arena, pick the best — no juggling tools, no managing subscriptions.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="mb-8"
            style={{ fontSize: "15px", lineHeight: 1.55, color: "var(--muted-foreground)" }}
          >
            No five subscriptions. No ten open tabs. Generate, compare, and ship — in seconds.
            Add brand control with Studio when the project calls for it.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.26 }}
            className="mb-4 max-w-[620px]"
          >
            <div
              className="flex flex-col sm:flex-row items-stretch gap-2 p-1.5 rounded-xl"
              style={{ border: "1px solid var(--border)", background: "var(--card)" }}
            >
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-transparent px-3 py-2.5 outline-none"
                style={{ fontSize: "14px", color: "var(--foreground)" }}
              />
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                style={{ fontSize: "14px", fontWeight: 500, background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                Start free — 50 credits, no card
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="flex items-center gap-3"
          >
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-colors"
              style={{
                fontSize: "15px",
                fontWeight: 500,
                border: "1px solid var(--border-strong)",
                color: "var(--foreground)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--secondary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
            >
              See how it works
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
