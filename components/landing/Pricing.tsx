"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { motion } from "motion/react";

const subscriptionPlans = [
  {
    name: "Simple Generation",
    subtitle: "For individuals, creators, and small teams getting started.",
    price: "€19/month",
    features: [
      "500 credits per month",
      "Hub + Chat access",
      "Arena comparison (up to 2 models)",
      "Access to all standard text, image, video, and code models",
      "Top-up credits available anytime",
      "Email support",
    ],
    cta: "Start with Simple",
    highlighted: false,
  },
  {
    name: "Advanced Models",
    subtitle: "For growing teams and studios that need premium models and deeper comparisons.",
    price: "€59/month",
    features: [
      "1,500 credits per month",
      "Everything in Simple Generation",
      "Access to premium model tier (Claude Sonnet 4, GPT-4o, Imagen 3, Veo 2)",
      "Arena comparison (up to 4 models)",
      "Multi-format workflows",
      "Priority support",
    ],
    cta: "Start with Advanced",
    highlighted: false,
  },
  {
    name: "Studio + Brand Vault",
    subtitle: "For teams and agencies that need brand compliance on top of AI generation.",
    price: "€149/month",
    features: [
      "4,000 credits per month",
      "Everything in Advanced Models",
      "Full Studio mode with Brand Vault",
      "15 specialist agents",
      "Campaign workflows, folders, approval flow",
      "Export and publish tools",
      "Priority support",
    ],
    cta: "Start with Studio",
    highlighted: true,
  },
];

const creditPacks = [
  {
    name: "Starter",
    price: "€9",
    credits: "100 credits",
    bestFor: "Trying ORA for the first time",
    cta: "Get Starter",
  },
  {
    name: "Builder",
    price: "€29",
    credits: "400 credits",
    bestFor: "One-off projects",
    cta: "Get Builder",
  },
  {
    name: "Production",
    price: "€59",
    credits: "1,000 credits",
    bestFor: "Serious output without commitment",
    cta: "Get Production",
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28" style={{ background: "rgba(244,244,246,0.4)" }}>
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
            Clear pricing. No surprises.
          </h2>
          <p style={{ fontSize: "16px", lineHeight: 1.55, color: "var(--muted-foreground)", maxWidth: "780px" }}>
            Subscribe monthly for the best value. Or buy credit packs with no commitment - use them whenever you want.
          </p>
        </motion.div>

        <div className="mb-6">
          <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--ora-signal)" }}>
            SUBSCRIPTIONS
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {subscriptionPlans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative flex flex-col rounded-xl"
              style={{
                background: "var(--card)",
                border: `1px solid ${plan.highlighted ? "var(--ora-signal)" : "var(--border)"}`,
                boxShadow: plan.highlighted
                  ? "0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(59,79,196,0.08)"
                  : "0 1px 2px rgba(0,0,0,0.02)",
              }}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-6">
                  <span
                    className="px-3 py-0.5 rounded-full text-white"
                    style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", background: "var(--ora-signal)" }}
                  >
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="p-7 pb-0">
                <h3 style={{ fontSize: "18px", fontWeight: 500, color: "var(--foreground)", marginBottom: "8px" }}>
                  {plan.name}
                </h3>
                <p style={{ fontSize: "13px", minHeight: 42, color: "var(--muted-foreground)", marginBottom: "20px" }}>
                  {plan.subtitle}
                </p>
                <div
                  className="flex items-baseline gap-1 mb-6 pb-6"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <span
                    style={{
                      fontSize: "40px",
                      fontWeight: 500,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                      color: "var(--foreground)",
                    }}
                  >
                    {plan.price.replace("/month", "")}
                  </span>
                  <span style={{ fontSize: "15px", color: "var(--muted-foreground)" }}>/month</span>
                </div>
              </div>

              <ul className="px-7 space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--ora-signal)" }} />
                    <span style={{ fontSize: "14px", lineHeight: 1.45, color: "rgba(17,17,19,0.75)" }}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="p-7 pt-8">
                <Link
                  href="/studio"
                  className="block w-full py-3 rounded-lg transition-all text-center"
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    ...(plan.highlighted
                      ? { background: "var(--ora-signal)", color: "white" }
                      : { background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }),
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mb-5">
          <h3 style={{ fontSize: "22px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--foreground)", marginBottom: "8px" }}>
            Credit packs (no subscription required)
          </h3>
          <p style={{ fontSize: "14px", lineHeight: 1.55, color: "var(--muted-foreground)" }}>
            Want to try ORA without a subscription? Buy credits and use them at your own pace. They never expire.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-4">
          {creditPacks.map((pack, i) => (
            <motion.div
              key={pack.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col rounded-xl"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
              }}
            >
              <div className="p-7 pb-0">
                <h4 style={{ fontSize: "18px", fontWeight: 500, color: "var(--foreground)", marginBottom: "8px" }}>
                  {pack.name}
                </h4>
                <p style={{ fontSize: "13px", minHeight: 40, color: "var(--muted-foreground)", marginBottom: "20px" }}>
                  {pack.bestFor}
                </p>
                <div
                  className="flex items-baseline gap-1 mb-6 pb-6"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <span
                    style={{
                      fontSize: "40px",
                      fontWeight: 500,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                      color: "var(--foreground)",
                    }}
                  >
                    {pack.price}
                  </span>
                  <span style={{ fontSize: "15px", color: "var(--muted-foreground)" }}>one-time</span>
                </div>
              </div>

              <ul className="px-7 space-y-3 flex-1">
                {[pack.credits, "Credits never expire", "Hub + Chat with standard models"].map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--ora-signal)" }} />
                    <span style={{ fontSize: "14px", lineHeight: 1.45, color: "rgba(17,17,19,0.75)" }}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="p-7 pt-8">
                <Link
                  href="/studio"
                  className="block w-full py-3 rounded-lg transition-all text-center"
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    background: "var(--secondary)",
                    color: "var(--foreground)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {pack.cta}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <p style={{ fontSize: "13px", lineHeight: 1.55, color: "var(--muted-foreground)" }}>
          All packs give you access to Hub and Chat with standard models. Upgrade to a subscription anytime - your purchased credits carry over.
        </p>
      </div>
    </section>
  );
}
