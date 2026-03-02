import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { PulseMotif } from "./PulseMotif";

export function CTASection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
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
            className="text-foreground mb-5"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 500,
              letterSpacing: "-0.035em",
              lineHeight: 1.12,
            }}
          >
            Start with 50 free credits. See what ORA can do.
          </h2>
          <p
            className="text-muted-foreground mb-10 mx-auto max-w-[560px]"
            style={{ fontSize: "16px", lineHeight: 1.6 }}
          >
            No credit card. No setup. Pick a model, type a prompt, and generate your first output in under a minute.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-lg hover:opacity-90 transition-opacity"
              style={{ fontSize: "15px", fontWeight: 500 }}
            >
              Open ORA — it's free
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 border border-border-strong text-foreground px-7 py-3.5 rounded-lg hover:bg-secondary transition-colors"
              style={{ fontSize: "15px", fontWeight: 500 }}
            >
              View pricing
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
