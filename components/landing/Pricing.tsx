"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { motion } from "motion/react";

const plans = [
  {
    key: "trial",
    name: "Essai gratuit",
    subtitle: "Teste ORA sans engagement ni carte bancaire.",
    price: "0",
    period: "",
    badge: null,
    credits: "50 crédits offerts",
    features: [
      "50 crédits sans CB",
      "Comparateur multi-IA (GPT-4o, Claude, Gemini)",
      "Génération texte, image, code",
      "Crédits rollover illimité",
    ],
    cta: "Essayer gratuitement",
    ctaHref: "/onboarding",
    highlighted: false,
  },
  {
    key: "generate",
    name: "Generate",
    subtitle: "Pour créateurs et indépendants qui génèrent régulièrement.",
    price: "19",
    period: "/mois",
    badge: null,
    credits: "200 crédits à l'activation",
    features: [
      "200 crédits à l'activation",
      "Comparateur multi-IA illimité",
      "Texte, image, code, audio, vidéo",
      "Crédits rollover illimité",
      "Packs crédits disponibles",
    ],
    cta: "Démarrer Generate",
    ctaHref: "/studio",
    highlighted: false,
  },
  {
    key: "studio",
    name: "Studio",
    subtitle: "Pour les marques qui veulent du contenu aligné avec leur identité.",
    price: "49",
    period: "/mois",
    badge: "RECOMMANDÉ",
    credits: "500 crédits/mois inclus",
    features: [
      "500 crédits/mois inclus",
      "Tout Generate +",
      "Brand Vault (identité de marque)",
      "1 produit/service inclus",
      "Table de montage (Canva-like)",
      "Asset Builder complet",
      "Crédits rollover illimité",
    ],
    cta: "Démarrer Studio",
    ctaHref: "/studio",
    highlighted: true,
  },
];

const packs = [
  { credits: "1 000 crédits", price: "€10", per: "€0.01/cr", label: "Pack S" },
  { credits: "5 000 crédits", price: "€45", per: "€0.009/cr", label: "Pack M" },
  { credits: "20 000 crédits", price: "€160", per: "€0.008/cr", label: "Pack L" },
];

const costs = [
  { action: "Texte (1 modèle)", credits: "1 cr" },
  { action: "Comparaison 3 modèles", credits: "3 cr" },
  { action: "Image", credits: "4 cr" },
  { action: "Audio", credits: "4 cr" },
  { action: "Code", credits: "2 cr" },
  { action: "Vidéo (~10s)", credits: "100 cr" },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 md:py-28" style={{ background: "rgba(244,244,246,0.4)" }}>
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mb-14">
          <h2 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.15, color: "var(--foreground)", marginBottom: 16 }}>
            Tarifs transparents. Aucune surprise.
          </h2>
          <p style={{ fontSize: "16px", lineHeight: 1.55, color: "var(--muted-foreground)", maxWidth: 600 }}>
            Tu paies uniquement ce que tu utilises. Les crédits ne sont jamais perdus — rollover illimité.
          </p>
        </motion.div>

        <div className="mb-6">
          <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--ora-signal)" }}>FORMULES</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan, i) => (
            <motion.div key={plan.key}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative flex flex-col rounded-xl"
              style={{ background: "var(--card)", border: `1px solid ${plan.highlighted ? "var(--ora-signal)" : "var(--border)"}`, boxShadow: plan.highlighted ? "0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(59,79,196,0.08)" : "0 1px 2px rgba(0,0,0,0.02)" }}>
              {plan.badge && (
                <div className="absolute -top-3 left-6">
                  <span className="px-3 py-0.5 rounded-full text-white"
                    style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em", background: "var(--ora-signal)" }}>
                    {plan.badge}
                  </span>
                </div>
              )}
              <div className="p-7 pb-0">
                <h3 style={{ fontSize: "18px", fontWeight: 500, color: "var(--foreground)", marginBottom: 8 }}>{plan.name}</h3>
                <p style={{ fontSize: "13px", minHeight: 42, color: "var(--muted-foreground)", marginBottom: 20 }}>{plan.subtitle}</p>
                <div className="flex items-baseline gap-1 mb-2 pb-6" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "40px", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--foreground)" }}>
                    {plan.price === "0" ? "Gratuit" : `€${plan.price}`}
                  </span>
                  {plan.period && <span style={{ fontSize: "15px", color: "var(--muted-foreground)" }}>{plan.period}</span>}
                </div>
                <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--ora-signal)", marginBottom: 16 }}>{plan.credits}</p>
              </div>
              <ul className="px-7 space-y-3 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--ora-signal)" }} />
                    <span style={{ fontSize: "14px", lineHeight: 1.45, color: "rgba(17,17,19,0.75)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="p-7 pt-8">
                <Link href={plan.ctaHref}
                  className="block w-full py-3 rounded-lg transition-all text-center"
                  style={{ fontSize: "14px", fontWeight: 500, ...(plan.highlighted ? { background: "var(--ora-signal)", color: "white" } : { background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }) }}>
                  {plan.cta}
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mb-5">
          <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", color: "var(--ora-signal)", marginBottom: 8 }}>PACKS CRÉDITS</p>
          <h3 style={{ fontSize: "22px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--foreground)", marginBottom: 8 }}>
            Crédits supplémentaires à la carte
          </h3>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
            Sans abonnement. Les crédits ne s'expirent jamais.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {packs.map((pack, i) => (
            <motion.div key={pack.label}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="flex flex-col rounded-xl p-6"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted-foreground)", letterSpacing: "0.08em", marginBottom: 8 }}>{pack.label}</div>
              <div style={{ fontSize: "32px", fontWeight: 500, color: "var(--foreground)", letterSpacing: "-0.02em" }}>{pack.price}</div>
              <div style={{ fontSize: "16px", fontWeight: 500, color: "var(--foreground)", margin: "6px 0 4px" }}>{pack.credits}</div>
              <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: 20 }}>{pack.per} · rollover illimité</div>
              <Link href="/studio/credits"
                className="block w-full py-2.5 rounded-lg text-center mt-auto"
                style={{ fontSize: "13px", fontWeight: 500, background: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                Acheter
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h3 style={{ fontSize: "16px", fontWeight: 500, color: "var(--foreground)", marginBottom: 12 }}>Coût par action</h3>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", maxWidth: 480 }}>
            {costs.map((item, i) => (
              <div key={item.action} className="flex items-center justify-between px-4 py-3"
                style={{ background: "var(--card)", borderBottom: i < costs.length - 1 ? "1px solid var(--border)" : "none" }}>
                <span style={{ fontSize: "13px", color: "var(--foreground)" }}>{item.action}</span>
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ora-signal)" }}>{item.credits}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 12 }}>
            ORA est un agrégateur IA — tu paies uniquement les appels API réels. Marge ORA de 28%, aucun préfinancement.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
