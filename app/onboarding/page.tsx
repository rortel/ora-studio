"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ArrowRight, Check, Loader2, Share2, Mail, Globe, Video, ChevronRight } from "lucide-react";
import { PulseIcon } from "@/components/landing/PulseMotif";

type Intent = "social" | "email" | "video" | "all";

const INTENTS: { key: Intent; label: string; icon: React.ElementType; description: string; example: string }[] = [
  {
    key: "social",
    label: "Réseaux sociaux",
    icon: Share2,
    description: "Posts LinkedIn, Instagram, Twitter",
    example: "Génère un post LinkedIn percutant pour lancer mon nouveau produit SaaS",
  },
  {
    key: "email",
    label: "Emails & newsletters",
    icon: Mail,
    description: "Séquences, cold emails, newsletters",
    example: "Écris un email de prospection B2B pour vendre mon service de consulting",
  },
  {
    key: "video",
    label: "Vidéo & contenu",
    icon: Video,
    description: "Scripts, descriptions, sous-titres",
    example: "Écris le script d'une vidéo YouTube de 5 minutes sur le growth hacking",
  },
  {
    key: "all",
    label: "Tout ça",
    icon: Globe,
    description: "Multi-format, campagnes complètes",
    example: "Crée une campagne complète pour le lancement de ma formation en ligne",
  },
];

const EXAMPLE_RESULTS: Record<Intent, string> = {
  social: `🚀 **Après 6 mois de dev silencieux, on lance enfin.**

Ce qu'on a construit : un outil qui permet aux équipes SaaS de **comparer plusieurs IA en temps réel** — et de garder uniquement ce qui marche.

Pas de prompt engineering complexe. Pas d'API à configurer.
Juste : *tu demandes, les IA répondent, tu choisis.*

👉 50 crédits offerts sans CB pour tester.

Vous seriez partants pour essayer ?`,

  email: `Objet : [Prénom], est-ce que vous perdez du temps à créer du contenu ?

Bonjour [Prénom],

Je travaille avec des consultants comme vous, et j'observe toujours le même problème : **80% du temps marketing part dans la création de contenu**, pas dans la stratégie.

Notre outil règle ça en 3 clics.

→ Vous entrez votre brief
→ 3 IA génèrent en parallèle
→ Vous gardez le meilleur

**15 minutes d'appel cette semaine ?**

Cordialement,`,

  video: `[INTRO — 0:00-0:30]
"Si tu dépenses plus de 2h par semaine à créer du contenu, cet épisode va changer tes habitudes. On va parler de growth hacking en 2024 — et pourquoi la plupart des gens le font mal."

[PARTIE 1 — 0:30-2:00]
"Le growth hacking, c'est pas du hacking. C'est de l'expérimentation structurée..."

[PARTIE 2 — 2:00-4:00]
"Les 3 leviers qui marchent vraiment en ce moment..."

[CALL TO ACTION — 4:30-5:00]
"Si tu veux aller plus loin, le lien en description..."`,

  all: `**Plan de campagne — Lancement formation en ligne**

📱 **Post LinkedIn J-7** : Teaser mystérieux "Dans 7 jours, quelque chose change..."

📧 **Email séquence** (J-5, J-3, J-1, J0) :
- J-5 : Histoire personnelle + problème
- J-3 : La solution révélée
- J-1 : Urgence + bonus early bird
- J0 : Ouverture des inscriptions

🎬 **Script vidéo** : "Pourquoi j'ai tout arrêté pour créer cette formation"

📊 **Posts Instagram** : 3 carrousels éducatifs + stories countdown`,
};

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [email, setEmail] = useState("");
  const [signingUp, setSigningUp] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleIntentSelect(i: Intent) {
    setIntent(i);
    setStep(2);
    setGenerating(true);
    // Simulate generation (in prod: call API without auth for demo)
    await new Promise(r => setTimeout(r, 1800));
    setResult(EXAMPLE_RESULTS[i]);
    setGenerating(false);
  }

  async function handleSignup() {
    if (!email || !email.includes("@")) {
      setError("Adresse email invalide.");
      return;
    }
    setSigningUp(true);
    setError("");

    const res = await fetch("/api/auth/trial-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, intent }),
    });

    const data = await res.json();

    if (data.error) {
      setError(data.error);
      setSigningUp(false);
      return;
    }

    setStep(3);
    setSigningUp(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--background)" }}>
      {/* Logo */}
      <div className="flex items-center gap-2 mb-12">
        <PulseIcon size={22} />
        <span style={{ fontSize: "16px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
          ORA
        </span>
      </div>

      <AnimatePresence mode="wait">

        {/* Step 1 — Intent */}
        {step === 1 && (
          <motion.div key="step1"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="w-full max-w-lg">
            <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 600, letterSpacing: "-0.03em", color: "var(--foreground)", textAlign: "center", marginBottom: 8 }}>
              Tu crées du contenu pour…
            </h1>
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", textAlign: "center", marginBottom: 32 }}>
              On te montre le résultat en 5 secondes. Sans compte.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {INTENTS.map(({ key, label, icon: Icon, description }) => (
                <button key={key}
                  onClick={() => handleIntentSelect(key)}
                  className="text-left p-4 rounded-xl transition-all hover:-translate-y-0.5"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <Icon size={18} style={{ color: "var(--ora-signal)", marginBottom: 8 }} />
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{description}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2 — Result + signup */}
        {step === 2 && (
          <motion.div key="step2"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="w-full max-w-xl">
            <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setStep(1)} style={{ fontSize: "12px", color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer" }}>
                ← Retour
              </button>
            </div>

            <div className="rounded-xl p-5 mb-6"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "var(--ora-signal)" }}>
                  <Sparkles size={11} className="text-white" />
                </div>
                <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--ora-signal)" }}>ORA — Génération live</span>
                {generating && <Loader2 size={12} className="animate-spin" style={{ color: "var(--ora-signal)" }} />}
              </div>

              {generating ? (
                <div className="space-y-2">
                  {[100, 85, 70, 90].map((w, i) => (
                    <div key={i} className="h-3 rounded animate-pulse"
                      style={{ width: `${w}%`, background: "var(--secondary)" }} />
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "13px", lineHeight: 1.65, color: "var(--foreground)", whiteSpace: "pre-wrap" }}>
                  {result}
                </div>
              )}
            </div>

            {!generating && (
              <div>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--foreground)", marginBottom: 4, textAlign: "center" }}>
                  Garde ce résultat + <span style={{ color: "var(--ora-signal)" }}>50 crédits gratuits</span>
                </p>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", textAlign: "center", marginBottom: 16 }}>
                  Aucune carte bancaire requise.
                </p>

                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="ton@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSignup()}
                    className="flex-1 px-3 py-2.5 rounded-xl outline-none"
                    style={{ fontSize: "14px", background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                  />
                  <button onClick={handleSignup} disabled={signingUp}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white transition-all"
                    style={{ background: "var(--ora-signal)", fontSize: "14px", fontWeight: 500, opacity: signingUp ? 0.7 : 1 }}>
                    {signingUp ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                    {signingUp ? "…" : "Commencer"}
                  </button>
                </div>
                {error && <p style={{ fontSize: "12px", color: "#ef4444", marginTop: 8 }}>{error}</p>}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3 — Confirmation */}
        {step === 3 && (
          <motion.div key="step3"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(34,197,94,0.1)" }}>
              <Check size={28} style={{ color: "#22c55e" }} />
            </div>
            <h2 style={{ fontSize: "22px", fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>
              Vérifie ta boîte mail !
            </h2>
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", lineHeight: 1.55, marginBottom: 6 }}>
              On a envoyé un lien magique à <strong>{email}</strong>.
            </p>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: 28 }}>
              50 crédits t'attendent de l'autre côté.
            </p>

            <div className="rounded-xl p-4 text-left space-y-2.5"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              {[
                "Comparateur multi-IA (GPT-4o, Claude, Gemini)",
                "Génération texte, image, code, audio",
                "50 crédits offerts — sans CB",
              ].map(f => (
                <div key={f} className="flex items-center gap-2.5">
                  <Check size={13} style={{ color: "var(--ora-signal)", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{f}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Step indicator */}
      <div className="flex gap-1.5 mt-10">
        {[1, 2, 3].map(s => (
          <div key={s} className="h-1 rounded-full transition-all"
            style={{ width: step === s ? 24 : 8, background: step >= s ? "var(--ora-signal)" : "var(--border)" }} />
        ))}
      </div>
    </div>
  );
}
