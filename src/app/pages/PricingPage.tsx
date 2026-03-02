import { motion } from "motion/react";
import { Check, Minus } from "lucide-react";
import { Link } from "react-router";
import { useMemo, useState } from "react";
import { FAQ } from "../components/FAQ";

type Billing = "monthly" | "yearly";

type Plan = {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  credits: number;
  audience: string;
  features: string[];
  highlighted?: boolean;
};

const plans: Plan[] = [
  {
    name: "Simple Generation",
    monthlyPrice: 19,
    yearlyPrice: 15,
    credits: 220,
    audience: "Particuliers, créateurs de contenu, petites PME",
    features: [
      "Abonnement + crédits mensuels",
      "Accès agrégateur IA (texte, image, vidéo, code)",
      "Modèles rapides et économiques",
      "Arena comparaison (jusqu'à 2 modèles)",
      "Top-up crédits à la demande",
    ],
  },
  {
    name: "Advanced Models",
    monthlyPrice: 59,
    yearlyPrice: 47,
    credits: 760,
    audience: "PME, studios, agences de communication",
    features: [
      "Tout le plan A",
      "Accès prioritaire aux modèles premium",
      "Arena comparaison (jusqu'à 4 modèles)",
      "Débit plus élevé en génération",
      "Workflows multi-formats pour production régulière",
    ],
  },
  {
    name: "Studio + Brand Vault",
    monthlyPrice: 149,
    yearlyPrice: 119,
    credits: 2100,
    audience: "Studios, agences, équipes marketing en production intensive",
    features: [
      "Tout le plan B",
      "Mode Studio complet",
      "Brand Vault et contrôle de conformité",
      "Workflow publication, export et gouvernance",
      "Support prioritaire renforcé",
    ],
    highlighted: true,
  },
];

const creditPacks = [
  { name: "Top-up 200", credits: 200, price: 15 },
  { name: "Top-up 1,000", credits: 1000, price: 65 },
  { name: "Top-up 3,000", credits: 3000, price: 159 },
];

const comparisonFeatures = [
  { name: "Crédits / mois", a: "220", b: "760", c: "2100" },
  { name: "Modèles rapides économiques", a: true, b: true, c: true },
  { name: "Modèles premium", a: false, b: true, c: true },
  { name: "Arena comparaison", a: "Jusqu'à 2", b: "Jusqu'à 4", c: "Jusqu'à 6" },
  { name: "Mode Studio", a: false, b: false, c: true },
  { name: "Brand Vault", a: false, b: false, c: true },
  { name: "Conformité marque", a: false, b: false, c: true },
  { name: "Support", a: "Standard", b: "Priority", c: "Priority +" },
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
    <span className="text-foreground/70" style={{ fontSize: "13px" }}>
      {value}
    </span>
  );
}

export function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");

  const estimator = useMemo(() => {
    return {
      videoCost: 10,
      imageCost: 1,
      textCost: 0.3,
    };
  }, []);

  return (
    <>
      <section className="pt-16 pb-8 md:pt-24 md:pb-12">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 500,
              letterSpacing: "-0.035em",
              lineHeight: 1.12,
            }}
            className="mb-5"
          >
            Abonnement + crédits, simple et scalable
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-muted-foreground max-w-[760px] mx-auto mb-8"
            style={{ fontSize: "16px", lineHeight: 1.55 }}
          >
            Trois niveaux: génération simple et économique, modèles avancés, puis Studio + Brand Vault.
            Conçu pour PME, créateurs, studios, agences et particuliers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-3 bg-secondary rounded-full px-1.5 py-1.5"
          >
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                billing === "monthly" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
              style={{ fontSize: "13px", fontWeight: 500 }}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                billing === "yearly" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
              style={{ fontSize: "13px", fontWeight: 500 }}
            >
              Annuel
              <span className="ml-1.5 text-ora-signal" style={{ fontSize: "11px" }}>
                -20%
              </span>
            </button>
          </motion.div>
        </div>
      </section>

      <section className="pb-16 md:pb-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => {
              const activePrice = billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + i * 0.08 }}
                  className={`relative flex flex-col bg-card rounded-xl border ${
                    plan.highlighted ? "border-ora-signal" : "border-border"
                  }`}
                  style={{
                    boxShadow: plan.highlighted
                      ? "0 1px 3px rgba(0,0,0,0.04), 0 12px 40px rgba(59,79,196,0.08)"
                      : "0 1px 2px rgba(0,0,0,0.02)",
                  }}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-6">
                      <span
                        className="bg-ora-signal text-white px-3 py-0.5 rounded-full"
                        style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.05em" }}
                      >
                        RECOMMENDED
                      </span>
                    </div>
                  )}

                  <div className="p-7 pb-0">
                    <h3 className="text-foreground mb-1" style={{ fontSize: "18px", fontWeight: 500 }}>
                      {plan.name}
                    </h3>
                    <p className="text-muted-foreground mb-5" style={{ fontSize: "13px", minHeight: 38 }}>
                      {plan.audience}
                    </p>

                    <div className="flex items-baseline gap-1 mb-3">
                      <span
                        className="text-foreground"
                        style={{ fontSize: "40px", fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }}
                      >
                        €{activePrice}
                      </span>
                      <span className="text-muted-foreground" style={{ fontSize: "15px" }}>
                        /mois
                      </span>
                    </div>

                    {billing === "yearly" && (
                      <p className="text-muted-foreground mb-3" style={{ fontSize: "12px" }}>
                        facturation annuelle
                      </p>
                    )}

                    <div className="mb-5 pb-5 border-b border-border">
                      <p className="text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>
                        {plan.credits} crédits / mois
                      </p>
                      <p className="text-muted-foreground mt-1" style={{ fontSize: "12px", lineHeight: 1.5 }}>
                        ~{Math.floor(plan.credits / estimator.videoCost)} vidéos, ~
                        {Math.floor(plan.credits / estimator.imageCost)} images, ~
                        {Math.floor(plan.credits / estimator.textCost)} générations texte
                      </p>
                    </div>
                  </div>

                  <ul className="px-7 space-y-3 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check size={14} className="text-ora-signal mt-0.5 flex-shrink-0" />
                        <span className="text-foreground/75" style={{ fontSize: "14px", lineHeight: 1.45 }}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="p-7 pt-8">
                    <Link
                      to="/studio"
                      className={`block w-full py-3 rounded-lg transition-all text-center ${
                        plan.highlighted
                          ? "bg-ora-signal text-white hover:opacity-90"
                          : "bg-secondary text-foreground hover:bg-muted border border-border"
                      }`}
                      style={{ fontSize: "14px", fontWeight: 500 }}
                    >
                      Choisir ce plan
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pb-20 md:pb-28">
        <div className="max-w-[960px] mx-auto px-6">
          <div className="bg-card border border-border rounded-xl p-6 md:p-8">
            <h2
              className="text-foreground mb-2"
              style={{ fontSize: "clamp(1.25rem, 2.5vw, 1.6rem)", fontWeight: 500, letterSpacing: "-0.02em" }}
            >
              Packs de crédits additionnels
            </h2>
            <p className="text-muted-foreground mb-6" style={{ fontSize: "14px", lineHeight: 1.55 }}>
              Si tu as un pic de production, tu ajoutes des crédits sans changer d'abonnement.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {creditPacks.map((pack) => (
                <div key={pack.name} className="rounded-lg border border-border p-4 bg-secondary/40">
                  <p className="text-foreground mb-1" style={{ fontSize: "15px", fontWeight: 600 }}>
                    {pack.name}
                  </p>
                  <p className="text-muted-foreground mb-2" style={{ fontSize: "13px" }}>
                    {pack.credits} crédits
                  </p>
                  <p className="text-foreground" style={{ fontSize: "24px", fontWeight: 500, letterSpacing: "-0.02em" }}>
                    €{pack.price}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-secondary/40">
        <div className="max-w-[960px] mx-auto px-6">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-foreground mb-10"
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
            }}
          >
            Comparer les plans
          </motion.h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th
                    className="text-left py-3 pr-4"
                    style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)" }}
                  >
                    Fonctionnalité
                  </th>
                  {["Simple Generation", "Advanced Models", "Studio + Brand Vault"].map((h) => (
                    <th
                      key={h}
                      className="text-center py-3 px-3"
                      style={{ fontSize: "13px", fontWeight: 600, minWidth: "95px" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row) => (
                  <tr key={row.name} className="border-b border-border/50">
                    <td className="py-3 pr-4 text-foreground" style={{ fontSize: "14px" }}>
                      {row.name}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <FeatureCell value={row.a} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <FeatureCell value={row.b} />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <FeatureCell value={row.c} />
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
