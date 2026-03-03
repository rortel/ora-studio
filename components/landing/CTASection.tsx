"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PulseMotif } from "./PulseMotif";

export function CTASection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.04 }}>
        <PulseMotif size={800} rings={8} animate={false} />
      </div>
      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-[760px] mx-auto"
        >
          <h2
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 500,
              letterSpacing: "-0.035em",
              lineHeight: 1.12,
              color: "var(--foreground)",
              marginBottom: "20px",
            }}
          >
            Start with 50 free credits. See what ORA can do.
          </h2>
          <p
            className="mx-auto"
            style={{
              fontSize: "16px",
              lineHeight: 1.6,
              color: "var(--muted-foreground)",
              maxWidth: "560px",
              marginBottom: "40px",
            }}
          >
            No credit card. No setup. Pick a model, type a prompt, and generate your first output in under a minute.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg hover:opacity-90 transition-opacity"
              style={{ fontSize: "15px", fontWeight: 500, background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              Open ORA — it&apos;s free
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg transition-colors"
              style={{
                fontSize: "15px",
                fontWeight: 500,
                border: "1px solid var(--border-strong)",
                color: "var(--foreground)",
              }}
            >
              View pricing
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
