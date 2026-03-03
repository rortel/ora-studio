"use client";

import { motion } from "motion/react";
import { Send, Shield, Sparkles, ImageIcon, Bot, Check } from "lucide-react";

const CONVERSATION = [
  {
    type: "user" as const,
    text: "Rédige un email de lancement pour notre nouveau produit",
  },
  {
    type: "result" as const,
    intent: "text",
    label: "Texte",
    icon: Sparkles,
    brand: "Acme Corp",
    content: `**Objet : Quelque chose change aujourd'hui.**

Vous nous avez fait confiance pour simplifier votre quotidien. Aujourd'hui, on vous présente ce sur quoi on travaille depuis 18 mois.

**Acme 2.0 est disponible.** Moins de friction. Plus de résultats. Exactement ce que vous nous avez demandé.

→ Découvrir maintenant`,
  },
  {
    type: "user" as const,
    text: "Compare GPT-4o, Claude et Gemini pour cet email",
  },
  {
    type: "multi" as const,
    label: "Comparaison",
    icon: Bot,
    models: [
      {
        name: "GPT-4o",
        text: "**Objet : Votre attente prend fin.**\n\nDix-huit mois de travail. Une seule promesse : vous faire gagner du temps sans sacrifier la qualité...",
      },
      {
        name: "Claude 3.5",
        text: "**Objet : Acme 2.0 est là.**\n\nVous avez demandé. Nous avons livré. Acme 2.0 arrive avec tout ce que vous réclamiez — et rien de superflu...",
      },
      {
        name: "Gemini Pro",
        text: "**Objet : Le changement que vous attendiez.**\n\nÀ nos clients fidèles — merci. Acme 2.0 est le résultat direct de vos retours. Simple. Puissant. Prêt...",
      },
    ],
  },
];

export function CommandCenterMock() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 max-w-[560px]"
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6"
            style={{ background: "var(--ora-signal-light)", border: "1px solid var(--ora-signal-ring)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--ora-signal)" }} />
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--ora-signal)" }}>
              Command Center
            </span>
          </div>
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
            Aussi simple qu&apos;un SMS.
            <br />
            <span style={{ color: "var(--muted-foreground)" }}>Aussi puissant qu&apos;une agence.</span>
          </h2>
          <p style={{ fontSize: "16px", lineHeight: 1.6, color: "var(--muted-foreground)" }}>
            Décrivez ce que vous voulez créer en une phrase. ORA détecte l&apos;intent,
            choisit le bon modèle, et livre un résultat brand-compliant en secondes.
          </p>
        </motion.div>

        {/* Mock interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 24px 80px rgba(0,0,0,0.06)",
            maxWidth: "860px",
          }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary)" }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(0,0,0,0.12)" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(0,0,0,0.12)" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(0,0,0,0.12)" }} />
            <div
              className="flex-1 mx-4 px-3 py-1 rounded-lg text-center"
              style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "11px", color: "var(--muted-foreground)", maxWidth: "280px", margin: "0 auto" }}
            >
              ora.studio/command
            </div>
            {/* Vault badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full ml-auto"
              style={{ background: "var(--ora-signal-light)", border: "1px solid var(--ora-signal-ring)" }}
            >
              <Shield size={10} style={{ color: "var(--ora-signal)" }} />
              <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--ora-signal)" }}>Acme Corp</span>
            </div>
          </div>

          {/* Conversation */}
          <div className="px-6 py-6 space-y-5" style={{ minHeight: "400px" }}>
            {CONVERSATION.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.12 }}
              >
                {item.type === "user" && (
                  <div className="flex justify-end">
                    <div
                      className="max-w-[70%] rounded-2xl rounded-tr-sm px-4 py-2.5"
                      style={{ fontSize: "14px", background: "var(--primary)", color: "var(--primary-foreground)", lineHeight: 1.5 }}
                    >
                      {item.text}
                    </div>
                  </div>
                )}

                {item.type === "result" && (
                  <div className="flex gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "var(--ora-signal-light)" }}
                    >
                      <item.icon size={12} style={{ color: "var(--ora-signal)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="uppercase" style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--ora-signal)" }}>
                          {item.label}
                        </span>
                        {item.brand && (
                          <span
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                            style={{ fontSize: "9px", background: "var(--ora-signal-light)", color: "var(--ora-signal)", border: "1px solid var(--ora-signal-ring)" }}
                          >
                            <Check size={8} /> {item.brand}
                          </span>
                        )}
                      </div>
                      <div
                        className="rounded-xl px-4 py-3"
                        style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
                      >
                        <p style={{ fontSize: "13px", lineHeight: 1.6, color: "var(--foreground)", whiteSpace: "pre-line" }}>
                          {item.content?.replace(/\*\*(.*?)\*\*/g, "$1")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {item.type === "multi" && (
                  <div className="flex gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "var(--ora-signal-light)" }}
                    >
                      <item.icon size={12} style={{ color: "var(--ora-signal)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="mb-1.5">
                        <span className="uppercase" style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--ora-signal)" }}>
                          {item.label} — 3 modèles
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {item.models?.map((m) => (
                          <div
                            key={m.name}
                            className="rounded-xl overflow-hidden"
                            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                          >
                            <div
                              className="px-3 py-1.5"
                              style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary)" }}
                            >
                              <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--foreground)" }}>{m.name}</span>
                            </div>
                            <div className="px-3 py-2.5">
                              <p style={{ fontSize: "11px", lineHeight: 1.55, color: "var(--muted-foreground)" }}>
                                {m.text.replace(/\*\*(.*?)\*\*/g, "$1")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Input bar */}
          <div
            className="px-4 py-3"
            style={{ borderTop: "1px solid var(--border)", background: "var(--card)" }}
          >
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-2.5"
              style={{ background: "var(--input-background)", border: "1px solid var(--border)" }}
            >
              <span style={{ fontSize: "14px", color: "var(--muted-foreground)", flex: 1 }}>
                Décrivez ce que vous voulez créer…
              </span>
              <div
                className="p-1.5 rounded-lg"
                style={{ background: "var(--ora-signal)" }}
              >
                <Send size={13} color="white" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature callouts */}
        <div className="grid grid-cols-3 gap-4 mt-8 max-w-[860px]">
          {[
            { icon: Sparkles, label: "Intent auto-détecté", desc: "Texte, image, vidéo, code — ORA route sans configuration" },
            { icon: Bot, label: "3 modèles en parallèle", desc: "Comparez GPT-4o, Claude et Gemini en un seul envoi" },
            { icon: Shield, label: "Brand Vault actif", desc: "Chaque output est brand-compliant avant de vous parvenir" },
          ].map(({ icon: Icon, label, desc }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div className="p-1.5 rounded-lg shrink-0" style={{ background: "var(--ora-signal-light)" }}>
                <Icon size={14} style={{ color: "var(--ora-signal)" }} />
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)", marginBottom: "4px" }}>{label}</div>
                <div style={{ fontSize: "12px", color: "var(--muted-foreground)", lineHeight: 1.5 }}>{desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
