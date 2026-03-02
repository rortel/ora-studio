import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

export function Hero() {
  return (
    <section className="pt-16 pb-16 md:pt-24 md:pb-24">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="max-w-[740px]">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card mb-8"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-ora-signal" />
            <span className="text-foreground" style={{ fontSize: "14px", fontWeight: 400 }}>
              AI Aggregator + Studio. Brand Vault is optional.
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
            <span className="text-foreground">Every AI model. One account.</span>
            <br />
            <span className="text-muted-foreground">Your brand if you need it.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="text-foreground/80 mb-4"
            style={{ fontSize: "18px", lineHeight: 1.55 }}
          >
            ORA gives you access to top models by category in one workspace.
            Text: Gemini 2.5 Flash/Pro, GPT-4o Mini, GPT-4o, Claude Haiku 4, Claude Sonnet 4, Mistral Small/Large.
            Image: Gemini Image, Imagen 3, DALL-E 3, Flux 1.1 Pro, Flux 2 Pro, Seedream 5.0, Recraft V3.
            Video: Veo 2, Kling 3.0 Pro, MiniMax Hailuo, Sora 2.
            Code: Gemini 2.5 Flash, GPT-4o, Claude Sonnet 4.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="text-muted-foreground mb-8"
            style={{ fontSize: "15px", lineHeight: 1.55 }}
          >
            Whether you're drafting a quick email, comparing image styles, or producing a full campaign
            - you don't need five subscriptions and ten tabs anymore. Start generating in seconds.
            Add brand control when the project calls for it.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.26 }}
            className="mb-4 max-w-[620px]"
          >
            <div className="flex flex-col sm:flex-row items-stretch gap-2 p-1.5 rounded-xl border border-border bg-card">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-transparent px-3 py-2.5 text-foreground placeholder:text-muted-foreground outline-none"
                style={{ fontSize: "14px" }}
              />
              <Link
                to="/studio"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                style={{ fontSize: "14px", fontWeight: 500 }}
              >
                Start free - 50 credits, no card
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
              className="inline-flex items-center gap-2 border border-border-strong text-foreground px-6 py-3 rounded-lg hover:bg-secondary transition-colors"
              style={{ fontSize: "15px", fontWeight: 500 }}
            >
              See how it works
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
