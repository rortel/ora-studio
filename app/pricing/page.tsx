"use client";

import { motion } from "motion/react";
import { Check, Minus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FAQ } from "@/components/landing/FAQ";

const plans = [
  {
    name: "Starter",
    price: "\u20AC99",
    period: "/month",
    yearlyPrice: "\u20AC79",
    audience: "Solopreneurs and small marketing teams",
    features: [
      "1 Brand Vault",
      "Morning Pulse (email)",
      "3 core agents",
      "20 content pieces/month",
      "One-Sentence Campaign (3/month)",
      "Campaign Multiplier (1 \u2192 3 formats)",
      "Email support",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    name: "Agency",
    price: "\u20AC299",
    period: "/month",
    yearlyPrice: "\u20AC239",
    audience: "CMOs, Heads of Comms, growing companies",
    features: [
      "Full 15-agent team",
      "Command Center dashboard",
      "Morning Pulse (custom per role)",
      "100 content pieces/month",
      "One-Sentence Campaign (unlimited)",
      "Campaign Multiplier (1 \u2192 10 formats)",
      "Weekly Strategic Brief",
      "Approval workflow",
      "Voice-to-Content",
      "Figma Connect",
      "Priority support",
    ],
    cta: "Start Agency trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    yearlyPrice: "Custom",
    audience: "Large organizations with complex needs",
    features: [
      "Everything in Agency",
      "Multi-brand Vaults",
      "Private fine-tuning",
      "Crisis Shield",
      "Competitive War Room",
      "Scenario Builder",
      "Board-ready reports",
      "API + SSO + security",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

const comparisonFeatures = [
  { name: "Brand Vaults", starter: "1", agency: "5", enterprise: "Unlimited" },
  { name: "AI Agents", starter: "3", agency: "15", enterprise: "15 + custom" },
  { name: "Content pieces/mo", starter: "20", agency: "100", enterprise: "Unlimited" },
  { name: "Morning Pulse", starter: true, agency: true, enterprise: true },
  { name: "One-Sentence Campaign", starter: "3/mo", agency: "Unlimited", enterprise: "Unlimited" },
  { name: "Voice-to-Content", starter: false, agency: true, enterprise: true },
  { name: "Compliance Score", starter: true, agency: true, enterprise: true },
  { name: "Command Center", starter: false, agency: true, enterprise: true },
  { name: "Approval Workflow", starter: false, agency: true, enterprise: true },
  { name: "Weekly Brief", starter: false, agency: true, enterprise: true },
  { name: "Learning Loop", starter: "Basic", agency: "Advanced", enterprise: "Custom" },
  { name: "Crisis Shield", starter: false, agency: false, enterprise: true },
  { name: "Cascade Button", starter: "3 formats", agency: "10 formats", enterprise: "All formats" },
  { name: "API Access", starter: false, agency: "REST", enterprise: "REST + Webhooks" },
  { name: "SSO / SAML", starter: false, agency: false, enterprise: true },
  { name: "Dedicated Manager", starter: false, agency: false, enterprise: true },
  { name: "Support", starter: "Email", agency: "Priority", enterprise: "24/7 dedicated" },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check size={14} className="text-ora-signal mx-auto" />
    ) : (
      <Minus size={14} className="text-muted-foreground/30 mx-auto" />
    );
  }
  return (
    <span className="text-foreground/70" style={{ fontSize: '13px' }}>
      {value}
    </span>
  );
}

export function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <>
      {/* Hero */}
      <section className="pt-16 pb-8 md:pt-24 md:pb-12">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 500,
              letterSpacing: '-0.035em',
              lineHeight: 1.12,
            }}
            className="mb-5"
          >
            Simple, measured pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-muted-foreground max-w-[480px] mx-auto mb-8"
            style={{ fontSize: '16px', lineHeight: 1.55 }}
          >
            Start with a 14-day free trial on any plan. No credit card required.
            Cancel anytime.
          </motion.p>

          {/* Billing toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-3 bg-secondary rounded-full px-1.5 py-1.5"
          >
            <button
              onClick={() => setYearly(false)}
              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                !yearly ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
              style={{ fontSize: '13px', fontWeight: 500 }}
            >
              Monthly
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                yearly ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
              style={{ fontSize: '13px', fontWeight: 500 }}
            >
              Yearly
              <span className="ml-1.5 text-ora-signal" style={{ fontSize: '11px' }}>
                -20%
              </span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-20 md:pb-28">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className={`relative flex flex-col bg-card rounded-xl border ${
                  plan.highlighted ? "border-ora-signal" : "border-border"
                }`}
                style={{
                  boxShadow: plan.highlighted
                    ? '0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(59,79,196,0.08)'
                    : '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-6">
                    <span
                      className="bg-ora-signal text-white px-3 py-0.5 rounded-full"
                      style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em' }}
                    >
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className="p-7 pb-0">
                  <h3 className="text-foreground mb-1" style={{ fontSize: '18px', fontWeight: 500 }}>
                    {plan.name}
                  </h3>
                  <p className="text-muted-foreground mb-5" style={{ fontSize: '13px' }}>
                    {plan.audience}
                  </p>
                  <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-border">
                    <span
                      className="text-foreground"
                      style={{ fontSize: '40px', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}
                    >
                      {yearly ? plan.yearlyPrice : plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground" style={{ fontSize: '15px' }}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="px-7 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check size={14} className="text-ora-signal mt-0.5 flex-shrink-0" />
                      <span className="text-foreground/75" style={{ fontSize: '14px', lineHeight: 1.45 }}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="p-7 pt-8">
                  <Link
                    href={plan.name === "Enterprise" ? "#" : "/studio"}
                    className={`block w-full py-3 rounded-lg transition-all text-center ${
                      plan.highlighted
                        ? "bg-ora-signal text-white hover:opacity-90"
                        : "bg-secondary text-foreground hover:bg-muted border border-border"
                    }`}
                    style={{ fontSize: '14px', fontWeight: 500 }}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="py-20 md:py-28 bg-secondary/40">
        <div className="max-w-[960px] mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-foreground mb-10"
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              fontWeight: 500,
              letterSpacing: '-0.03em',
            }}
          >
            Compare plans
          </motion.h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted-foreground)' }}>
                    Feature
                  </th>
                  {["Starter", "Agency", "Enterprise"].map((h) => (
                    <th
                      key={h}
                      className="text-center py-3 px-3"
                      style={{ fontSize: '13px', fontWeight: 600, minWidth: '100px' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row) => (
                  <tr key={row.name} className="border-b border-border/50">
                    <td className="py-3 pr-4 text-foreground" style={{ fontSize: '14px' }}>
                      {row.name}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <FeatureCell value={row.starter} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <FeatureCell value={row.agency} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <FeatureCell value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <FAQ />
    </>
  );
}


export default PricingPage;
