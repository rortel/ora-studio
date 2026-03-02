import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import studioPortraitImage from "../assets/studio-portrait-reference.jpg";

const chatMessages = [
  {
    agent: "ORA",
    role: "Arena",
    score: 97,
    text: "Arena complete. GPT-4o, Claude Sonnet 4, Gemini 2.5 Pro and Mistral Large answered your brief. Best score: Claude Sonnet 4 - 97/100 for clarity and CTA strength.",
    isUser: false,
  },
  {
    agent: null,
    role: "user",
    score: null,
    text: "Keep Claude Sonnet 4's structure, but use GPT-4o's opening hook.",
    isUser: true,
  },
  {
    agent: "ORA",
    role: "Studio",
    score: 98,
    text: "Done. Hybrid version generated and validated against Brand Vault. Compliance: 98/100.",
    isUser: false,
  },
];

const quickActions = ["Compare models", "Mix outputs", "Enable Brand Vault", "Export final"];

const aggregatorMode = [
  "Choose any model for any task",
  "Compare outputs with Arena",
  "Generate text, images, video, code",
  "No brand rules, no compliance - just results",
  "Pay per credit, use what you need",
];

const studioMode = [
  "Same models, same brief, same speed",
  "Brand Vault checks every output before you publish",
  "15 specialist agents review tone, structure, and strategy",
  "Version history, approval flow, team collaboration",
  "Target compliance visible on every asset",
];

const visualPrompt =
  "Studio photoshoot, cinematic soft light, 85mm lens. A beautiful portrait of a red-haired woman with curly hair and blue eyes.";

const generators = ["Flux 1.1 Pro", "DALL-E 3", "Imagen 3"];

const generatedVariants = [
  {
    title: "Flux 1.1 Pro",
    score: "92",
    tint: "linear-gradient(145deg, rgba(20,32,61,0.35) 0%, rgba(49,96,170,0.15) 100%)",
  },
  {
    title: "DALL-E 3",
    score: "95",
    tint: "linear-gradient(145deg, rgba(74,28,17,0.2) 0%, rgba(235,132,84,0.2) 100%)",
  },
  {
    title: "Imagen 3",
    score: "93",
    tint: "linear-gradient(145deg, rgba(21,66,51,0.26) 0%, rgba(120,172,84,0.16) 100%)",
  },
  {
    title: "Hybrid pick",
    score: "98",
    tint: "linear-gradient(145deg, rgba(10,27,56,0.3) 0%, rgba(37,86,171,0.16) 50%, rgba(164,81,45,0.24) 100%)",
  },
];

const LOOP_MS = 11000;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function StudioMock() {
  const [timeMs, setTimeMs] = useState(0);

  useEffect(() => {
    const startAt = Date.now();
    const id = setInterval(() => {
      setTimeMs((Date.now() - startAt) % LOOP_MS);
    }, 50);
    return () => clearInterval(id);
  }, []);

  const typedRatio = clamp(timeMs / 2800, 0, 1);
  const typedChars = Math.floor(visualPrompt.length * typedRatio);
  const typedText = visualPrompt.slice(0, typedChars);

  const activeGeneratorCount =
    timeMs < 3000 ? 0 : Math.min(generators.length, Math.floor((timeMs - 3000) / 700) + 1);

  const visibleCardCount =
    timeMs < 5100 ? 0 : Math.min(generatedVariants.length, Math.floor((timeMs - 5100) / 550) + 1);

  const getThisVisible = timeMs >= 7600;
  const selectedCardIndex = timeMs >= 8600 ? 1 : -1;

  const cursorTarget = useMemo(() => {
    if (timeMs < 3200) return { x: 84, y: 22, click: false, id: "typing" };
    if (timeMs < 3900) return { x: 17, y: 34, click: true, id: "g1" };
    if (timeMs < 4600) return { x: 41, y: 34, click: true, id: "g2" };
    if (timeMs < 5300) return { x: 64, y: 34, click: true, id: "g3" };
    if (timeMs < 8600) return { x: 64, y: 34, click: false, id: "wait" };
    if (timeMs < 10300) return { x: 48, y: 80, click: true, id: "get-this" };
    return { x: 48, y: 80, click: false, id: "end" };
  }, [timeMs]);

  return (
    <section id="studio" className="py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2
            className="text-foreground mb-4"
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
              fontWeight: 500,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
            }}
          >
            Two modes, same workspace
          </h2>
          <p className="text-muted-foreground max-w-[680px]" style={{ fontSize: "16px", lineHeight: 1.55 }}>
            Most projects start in Hub. Some finish in Studio. You decide when to switch.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h3 className="text-foreground mb-2" style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.02em" }}>
              Aggregator mode (Hub + Chat)
            </h3>
            <p className="text-muted-foreground mb-4" style={{ fontSize: "14px", lineHeight: 1.55 }}>
              For speed. For exploration. For side projects and first drafts.
            </p>
            <ul className="space-y-2.5">
              {aggregatorMode.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 mt-2 rounded-full bg-ora-signal" />
                  <span className="text-foreground/80" style={{ fontSize: "14px", lineHeight: 1.5 }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h3 className="text-foreground mb-2" style={{ fontSize: "18px", fontWeight: 600, letterSpacing: "-0.02em" }}>
              Studio mode
            </h3>
            <p className="text-muted-foreground mb-4" style={{ fontSize: "14px", lineHeight: 1.55 }}>
              For campaigns. For client work. For anything that carries your name.
            </p>
            <ul className="space-y-2.5">
              {studioMode.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 mt-2 rounded-full bg-ora-signal" />
                  <span className="text-foreground/80" style={{ fontSize: "14px", lineHeight: 1.5 }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bg-card border border-border rounded-xl overflow-hidden"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-border-strong/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-border-strong/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-border-strong/60" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground" style={{ fontSize: "13px" }}>
                Live AI workflow
              </span>
              <span className="text-ora-signal" style={{ fontSize: "14px", fontWeight: 600 }}>
                98 / 100
              </span>
            </div>
            <button
              className="border border-border px-4 py-1.5 rounded-lg text-foreground hover:bg-secondary transition-colors"
              style={{ fontSize: "13px", fontWeight: 500 }}
            >
              Approve
            </button>
          </div>

          <div className="flex flex-col md:flex-row min-h-[460px]">
            <div className="md:w-[50%] border-b md:border-b-0 md:border-r border-border flex flex-col">
              <div className="flex-1 p-6 space-y-5 overflow-y-auto">
                {chatMessages.map((msg, i) => {
                  if (msg.isUser) {
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.12 }}
                        className="flex justify-start"
                      >
                        <div
                          className="bg-primary text-primary-foreground px-4 py-3 rounded-xl max-w-[85%]"
                          style={{ fontSize: "15px", lineHeight: 1.5 }}
                        >
                          {msg.text}
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.12 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-ora-signal" />
                        <span className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
                          {msg.agent}
                        </span>
                        <span className="text-muted-foreground" style={{ fontSize: "13px" }}>
                          · {msg.role}
                        </span>
                        <span className="text-ora-signal" style={{ fontSize: "14px", fontWeight: 600 }}>
                          {msg.score}
                        </span>
                      </div>
                      <p className="text-foreground/80 pl-4" style={{ fontSize: "15px", lineHeight: 1.6 }}>
                        {msg.text}
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              <div className="px-6 pb-6 flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action}
                    className="border border-border px-3.5 py-1.5 rounded-lg text-foreground hover:bg-secondary transition-colors"
                    style={{ fontSize: "13px", fontWeight: 400 }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:w-[50%] p-6 flex flex-col relative overflow-hidden bg-secondary/[0.18]">
              <motion.div
                className="absolute z-20 pointer-events-none"
                animate={{ left: `${cursorTarget.x}%`, top: `${cursorTarget.y}%` }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                <div className="relative">
                  <div className="w-5 h-5 rounded-full border-2 border-foreground bg-background shadow-sm" />
                  {cursorTarget.click && (
                    <motion.div
                      key={cursorTarget.id}
                      initial={{ scale: 0.6, opacity: 0.5 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{ duration: 0.45 }}
                      className="absolute inset-0 rounded-full border-2 border-ora-signal"
                    />
                  )}
                </div>
              </motion.div>

              <div className="flex-1 flex flex-col gap-4 min-h-0">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground"
                    style={{ fontSize: "15px", fontWeight: 600 }}
                  >
                    A
                  </div>
                  <div>
                    <p className="text-foreground" style={{ fontSize: "15px", fontWeight: 600 }}>
                      Visual Generation
                    </p>
                    <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                      Multi-model studio simulation
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-secondary/35 p-3">
                  <p className="text-muted-foreground mb-1" style={{ fontSize: "12px" }}>
                    Prompt
                  </p>
                  <p className="text-foreground" style={{ fontSize: "13px", lineHeight: 1.5, minHeight: 40 }}>
                    {typedText}
                    <span className="inline-block w-[1px] h-[14px] bg-foreground/70 ml-1 align-middle" />
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {generators.map((generator, idx) => {
                    const active = idx < activeGeneratorCount;
                    return (
                      <div
                        key={generator}
                        className={`px-3 py-1.5 rounded-lg border transition-colors ${
                          active
                            ? "border-ora-signal bg-ora-signal-light text-ora-signal"
                            : "border-border text-muted-foreground"
                        }`}
                        style={{ fontSize: "12px", fontWeight: 500 }}
                      >
                        {generator}
                        {active && timeMs < 5200 ? " · Running..." : ""}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3 flex-1 auto-rows-fr min-h-0">
                  {generatedVariants.map((variant, idx) => {
                    const visible = idx < visibleCardCount;
                    const selected = idx === selectedCardIndex;
                    return (
                      <motion.div
                        key={variant.title}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{
                          opacity: visible ? 1 : 0.15,
                          y: visible ? 0 : 8,
                          scale: visible ? 1 : 0.98,
                        }}
                        transition={{ duration: 0.35 }}
                        className={`rounded-lg border p-2 flex flex-col min-h-[170px] ${
                          selected ? "border-ora-signal" : "border-border"
                        }`}
                      >
                        <div className="relative flex-1 min-h-[108px] rounded-md overflow-hidden border border-border/60">
                          <img
                            src={studioPortraitImage}
                            alt={`Generated portrait preview from ${variant.title}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0" style={{ background: variant.tint }} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>
                            {variant.title}
                          </p>
                          <p className="text-ora-signal" style={{ fontSize: "11px", fontWeight: 600 }}>
                            {variant.score}
                          </p>
                        </div>
                        {getThisVisible && (
                          <button
                            className={`mt-2 w-full rounded-md py-1.5 border ${
                              selected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-foreground hover:bg-secondary"
                            }`}
                            style={{ fontSize: "11px", fontWeight: 500 }}
                          >
                            {selected ? "Selected" : "Get this"}
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-border">
                  {[
                    { label: "Models tested", value: "3", context: "per Arena run" },
                    { label: "Compliance", value: selectedCardIndex >= 0 ? "98/100" : "--", context: "after Brand Vault check" },
                    { label: "Time to final", value: "4 min", context: "from brief to publish-ready" },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <p className="text-foreground mb-0.5" style={{ fontSize: "14px", fontWeight: 500 }}>
                        {m.value}
                      </p>
                      <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                        {m.label}
                      </p>
                      <p className="text-muted-foreground/70" style={{ fontSize: "10px" }}>
                        {m.context}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-border">
                <p className="text-muted-foreground text-right" style={{ fontSize: "12px" }}>
                  Yellow highlight = last change
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
