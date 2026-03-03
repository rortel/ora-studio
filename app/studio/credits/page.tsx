"use client";

import { useState, useEffect } from "react";
import { Check, ExternalLink, Clock } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface Profile {
  credits: number;
  plan: "trial" | "generate" | "studio";
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

const PLANS = [
  {
    key: "generate",
    name: "Generate",
    price: 19,
    features: [
      "200 crédits à l'activation",
      "Comparateur multi-IA",
      "Texte, image, code, audio",
      "Crédits rollover illimité",
      "Packs crédits disponibles",
    ],
  },
  {
    key: "studio",
    name: "Studio",
    price: 49,
    features: [
      "500 crédits/mois inclus",
      "Tout Generate +",
      "Brand Vault (1 marque)",
      "1 produit/service inclus",
      "Table de montage (Canva-like)",
      "Asset Builder complet",
      "Crédits rollover illimité",
    ],
    highlighted: true,
  },
];

const PACKS = [
  { key: "pack_1000", credits: 1000, price: 10, label: "1 000 crédits", per: "€0.01/cr" },
  { key: "pack_5000", credits: 5000, price: 45, label: "5 000 crédits", per: "€0.009/cr" },
  { key: "pack_20000", credits: 20000, price: 160, label: "20 000 crédits", per: "€0.008/cr" },
];

const COSTS = [
  { action: "Texte (1 modèle)", credits: 1 },
  { action: "Comparaison 3 modèles", credits: 3 },
  { action: "Image", credits: 4 },
  { action: "Audio", credits: 4 },
  { action: "Code", credits: 2 },
  { action: "Vidéo (~10s)", credits: 100 },
  { action: "Produit supp. (Brand Vault)", credits: 500 },
];

const planLabel: Record<string, string> = { trial: "Essai gratuit", generate: "Generate", studio: "Studio" };
const planColor: Record<string, string> = { trial: "var(--muted-foreground)", generate: "var(--ora-signal)", studio: "#8b5cf6" };

export default function CreditsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get("purchased") === "1" || searchParams.get("upgraded") === "1";

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [profileRes, txRes, stripeRes] = await Promise.all([
      fetch("/api/credits"),
      fetch("/api/credits/transactions"),
      fetch("/api/stripe/status"),
    ]);
    setProfile(await profileRes.json());
    setTransactions((await txRes.json()).transactions ?? []);
    setStripeEnabled((await stripeRes.json()).enabled ?? false);
    setLoading(false);
  }

  async function handleCheckout(type: "subscription" | "pack", key: string) {
    if (!stripeEnabled) return;
    setCheckoutLoading(key);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        planKey: type === "subscription" ? key : undefined,
        packKey: type === "pack" ? key : undefined,
      }),
    });
    const { url } = await res.json();
    if (url) window.location.href = url;
    else setCheckoutLoading(null);
  }

  async function handlePortal() {
    if (!stripeEnabled) return;
    setCheckoutLoading("portal");
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setCheckoutLoading(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--ora-signal)" }} />
      </div>
    );
  }

  function PayButton({ label, onClick, highlighted = false, disabled = false }: {
    label: string; onClick: () => void; highlighted?: boolean; disabled?: boolean;
  }) {
    if (!stripeEnabled) {
      return (
        <div className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2"
          style={{ fontSize: "13px", fontWeight: 500, background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
          <Clock size={13} />
          Bientôt disponible
        </div>
      );
    }
    return (
      <button onClick={onClick} disabled={disabled}
        className="w-full py-2.5 rounded-lg transition-all"
        style={{
          fontSize: "14px", fontWeight: 500,
          background: highlighted ? "var(--ora-signal)" : "var(--secondary)",
          color: highlighted ? "white" : "var(--foreground)",
          border: highlighted ? "none" : "1px solid var(--border)",
          opacity: disabled ? 0.7 : 1,
          cursor: disabled ? "wait" : "pointer",
        }}>
        {label}
      </button>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {showSuccess && (
        <div className="mb-6 p-4 rounded-xl flex items-center gap-3"
          style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <Check size={16} style={{ color: "#22c55e" }} />
          <span style={{ fontSize: "14px", color: "#16a34a" }}>
            {searchParams.get("upgraded") ? "Abonnement activé !" : "Crédits ajoutés !"}
          </span>
        </div>
      )}

      {!stripeEnabled && (
        <div className="mb-6 p-4 rounded-xl flex items-center gap-3"
          style={{ background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)" }}>
          <Clock size={15} style={{ color: "#f97316" }} />
          <span style={{ fontSize: "13px", color: "#c2410c" }}>
            Le paiement sera activé prochainement. Tes crédits actuels sont entièrement fonctionnels.
          </span>
        </div>
      )}

      <div className="mb-8">
        <h1 style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
          Crédits & Abonnement
        </h1>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginTop: 4 }}>
          Gère tes crédits, ton abonnement et ton historique d'utilisation.
        </p>
      </div>

      {/* Solde */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Solde</div>
          <div style={{ fontSize: "36px", fontWeight: 600, color: "var(--foreground)", lineHeight: 1.2, marginTop: 6 }}>{profile?.credits ?? 0}</div>
          <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 2 }}>crédits disponibles</div>
        </div>

        <div className="rounded-xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Formule</div>
          <div style={{ fontSize: "22px", fontWeight: 600, lineHeight: 1.2, marginTop: 6, color: planColor[profile?.plan ?? "trial"] }}>
            {planLabel[profile?.plan ?? "trial"]}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 2 }}>
            {profile?.plan === "studio" ? "500 cr/mois inclus" : profile?.plan === "generate" ? "€19/mois" : "50 cr offerts"}
          </div>
        </div>

        <div className="rounded-xl p-5 flex flex-col justify-between" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rollover</div>
          <div style={{ fontSize: "14px", color: "var(--foreground)", marginTop: 6, lineHeight: 1.4 }}>Tes crédits n'expirent jamais</div>
          {profile?.stripe_subscription_id && stripeEnabled && (
            <button onClick={handlePortal} className="flex items-center gap-1.5 mt-3"
              style={{ fontSize: "12px", color: "var(--ora-signal)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <ExternalLink size={11} />Gérer l'abonnement
            </button>
          )}
        </div>
      </div>

      {/* Upgrade plans */}
      {profile?.plan !== "studio" && (
        <div className="mb-10">
          <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--foreground)", marginBottom: 16 }}>
            Passer à la formule supérieure
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {PLANS.filter(p => profile?.plan === "generate" ? p.key === "studio" : true).map(plan => (
              <div key={plan.key} className="rounded-xl p-6 flex flex-col"
                style={{ background: "var(--card)", border: `1px solid ${plan.highlighted ? "var(--ora-signal)" : "var(--border)"}` }}>
                {plan.highlighted && (
                  <span className="inline-block mb-3 px-2 py-0.5 rounded-full text-white"
                    style={{ fontSize: "10px", fontWeight: 600, background: "var(--ora-signal)", width: "fit-content" }}>
                    RECOMMANDÉ
                  </span>
                )}
                <div className="flex items-end gap-1 mb-4">
                  <span style={{ fontSize: "32px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)" }}>€{plan.price}</span>
                  <span style={{ fontSize: "13px", color: "var(--muted-foreground)", paddingBottom: 4 }}>/mois</span>
                </div>
                <div style={{ fontSize: "16px", fontWeight: 500, color: "var(--foreground)", marginBottom: 12 }}>{plan.name}</div>
                <ul className="space-y-2 flex-1 mb-5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={13} style={{ color: "var(--ora-signal)", marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <PayButton
                  label={checkoutLoading === plan.key ? "Redirection…" : `Activer ${plan.name}`}
                  highlighted={plan.highlighted}
                  onClick={() => handleCheckout("subscription", plan.key)}
                  disabled={checkoutLoading === plan.key}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credit packs */}
      <div className="mb-10">
        <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--foreground)", marginBottom: 4 }}>Acheter des crédits</h2>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 16 }}>
          Sans engagement. Les crédits n'expirent jamais.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {PACKS.map(pack => (
            <div key={pack.key} className="rounded-xl p-5 flex flex-col"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "22px", fontWeight: 600, color: "var(--foreground)", letterSpacing: "-0.02em" }}>€{pack.price}</div>
              <div style={{ fontSize: "16px", fontWeight: 500, color: "var(--foreground)", marginTop: 6 }}>{pack.label}</div>
              <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: 2, marginBottom: 16 }}>{pack.per} · rollover illimité</div>
              <div className="mt-auto">
                <PayButton
                  label={checkoutLoading === pack.key ? "Redirection…" : "Acheter"}
                  onClick={() => handleCheckout("pack", pack.key)}
                  disabled={checkoutLoading === pack.key}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coût par action */}
      <div className="mb-10">
        <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--foreground)", marginBottom: 12 }}>Coût par action</h2>
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {COSTS.map((item, i) => (
            <div key={item.action} className="flex items-center justify-between px-4 py-3"
              style={{ background: "var(--card)", borderBottom: i < COSTS.length - 1 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize: "13px", color: "var(--foreground)" }}>{item.action}</span>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ora-signal)" }}>{item.credits} cr</span>
            </div>
          ))}
        </div>
      </div>

      {/* Historique */}
      {transactions.length > 0 && (
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 500, color: "var(--foreground)", marginBottom: 12 }}>Historique</h2>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {transactions.slice(0, 20).map((tx, i) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3"
                style={{ background: "var(--card)", borderBottom: i < Math.min(transactions.length, 20) - 1 ? "1px solid var(--border)" : "none" }}>
                <div>
                  <div style={{ fontSize: "13px", color: "var(--foreground)" }}>{tx.description}</div>
                  <div style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: 1 }}>
                    {new Date(tx.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <span style={{ fontSize: "13px", fontWeight: 500, color: tx.amount > 0 ? "#22c55e" : "var(--muted-foreground)" }}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount} cr
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
