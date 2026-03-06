import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import {
  Globe,
  Search,
  ArrowRight,
  Check,
  AlertTriangle,
  Shield,
  Palette,
  Type,
  Users,
  BookOpen,
  Target,
  RefreshCw,
  Loader2,
} from "lucide-react";

const mockResults = {
  overall: 72,
  sections: [
    {
      icon: Type,
      title: "Tone Consistency",
      score: 68,
      status: "warning",
      details: "Tone varies significantly across channels — LinkedIn is formal, Instagram is too casual.",
      suggestions: [
        "Define a single tone scale (e.g., Formality 7/10)",
        "Audit Instagram captions for brand alignment",
      ],
    },
    {
      icon: Palette,
      title: "Visual Identity",
      score: 85,
      status: "good",
      details: "Logo and colors are consistent. Typography varies on web vs. social.",
      suggestions: [
        "Standardize web font to match social templates",
        "Create a secondary color usage guide",
      ],
    },
    {
      icon: BookOpen,
      title: "Vocabulary",
      score: 61,
      status: "warning",
      details: "14 instances of off-brand language detected across recent content.",
      suggestions: [
        'Replace "revolutionary" with approved alternatives',
        "Build a forbidden terms list (currently none found)",
      ],
    },
    {
      icon: Users,
      title: "Audience Alignment",
      score: 78,
      status: "good",
      details: "Content targets the right personas but messaging depth varies.",
      suggestions: [
        "Create persona-specific content guidelines",
        "Map content types to buyer journey stages",
      ],
    },
    {
      icon: Target,
      title: "Competitive Differentiation",
      score: 65,
      status: "warning",
      details: "Voice overlap with 2 competitors detected. Key differentiators are under-communicated.",
      suggestions: [
        "Strengthen unique value proposition in all channels",
        "Audit competitor messaging quarterly",
      ],
    },
    {
      icon: Shield,
      title: "Compliance & Legal",
      score: 82,
      status: "good",
      details: "GDPR notices present. Missing accessibility statements on 3 pages.",
      suggestions: [
        "Add WCAG 2.1 AA compliance checklist",
        "Update privacy policy date",
      ],
    },
  ],
};

export function BrandScorePage() {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<typeof mockResults | null>(null);

  const handleScan = () => {
    if (!url.trim()) return;
    setScanning(true);
    setResults(null);
    // Simulate scan
    setTimeout(() => {
      setScanning(false);
      setResults(mockResults);
    }, 3000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#16a34a";
    if (score >= 60) return "#f59e0b";
    return "var(--destructive)";
  };

  return (
    <div className="min-h-[calc(100vh-56px)]">
      {/* Hero */}
      <section className="pt-16 pb-10 md:pt-24 md:pb-16">
        <div className="max-w-[720px] mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <span
              className="inline-block px-3 py-1 rounded-full"
              style={{
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ora-signal)",
                background: "var(--ora-signal-light)",
                border: "1px solid rgba(59,79,196,0.1)",
              }}
            >
              Brand Score
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="mb-5"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 500,
              letterSpacing: "-0.035em",
              lineHeight: 1.12,
            }}
          >
            How consistent is{" "}
            <span className="text-muted-foreground">your brand?</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="text-muted-foreground mb-10"
            style={{ fontSize: "16px", lineHeight: 1.55 }}
          >
            Drop your URL. ORA crawls your digital presence and scores your
            brand consistency across tone, visuals, vocabulary, and more.
          </motion.p>

          {/* Scanner input */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="flex items-center gap-3 max-w-[560px] mx-auto"
          >
            <div className="flex-1 relative">
              <Globe
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourcompany.com"
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 focus:border-ora-signal focus:outline-none transition-colors"
                style={{ fontSize: "15px" }}
              />
            </div>
            <button
              onClick={handleScan}
              disabled={scanning || !url.trim()}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-white transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{
                background:
                  "linear-gradient(135deg, var(--ora-signal) 0%, #2a3ba8 100%)",
                fontSize: "15px",
                fontWeight: 500,
                boxShadow: "0 2px 12px rgba(59,79,196,0.3)",
              }}
            >
              {scanning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Scanning
                </>
              ) : (
                <>
                  <Search size={16} />
                  Scan
                </>
              )}
            </button>
          </motion.div>
        </div>
      </section>

      {/* Scanning animation */}
      <AnimatePresence>
        {scanning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-[720px] mx-auto px-6 pb-16"
          >
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <div className="relative w-20 h-20 mx-auto mb-6">
                <svg
                  width={80}
                  height={80}
                  viewBox="0 0 80 80"
                  fill="none"
                  className="mx-auto"
                >
                  <circle
                    cx={40}
                    cy={40}
                    r={36}
                    stroke="var(--border)"
                    strokeWidth={2}
                  />
                  <motion.circle
                    cx={40}
                    cy={40}
                    r={36}
                    stroke="var(--ora-signal)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeDasharray="226"
                    animate={{ strokeDashoffset: [226, 0] }}
                    transition={{ duration: 3, ease: "easeInOut" }}
                  />
                  <circle cx={40} cy={40} r={3} fill="var(--ora-signal)" />
                </svg>
              </div>
              <p
                className="text-foreground mb-2"
                style={{ fontSize: "16px", fontWeight: 500 }}
              >
                Crawling {url}
              </p>
              <p
                className="text-muted-foreground"
                style={{ fontSize: "14px" }}
              >
                Analyzing tone, visuals, vocabulary, audience alignment,
                competitors, and compliance...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {results && !scanning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[1200px] mx-auto px-6 pb-20"
          >
            {/* Overall score */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-8 text-center mb-8"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}
            >
              <p
                className="text-muted-foreground mb-3"
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Overall Brand Score
              </p>
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg
                  width={128}
                  height={128}
                  viewBox="0 0 128 128"
                  fill="none"
                >
                  <circle
                    cx={64}
                    cy={64}
                    r={56}
                    stroke="var(--secondary)"
                    strokeWidth={6}
                  />
                  <motion.circle
                    cx={64}
                    cy={64}
                    r={56}
                    stroke={getScoreColor(results.overall)}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray={352}
                    strokeDashoffset={352}
                    initial={{ strokeDashoffset: 352 }}
                    animate={{
                      strokeDashoffset:
                        352 - (352 * results.overall) / 100,
                    }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                    style={{
                      transform: "rotate(-90deg)",
                      transformOrigin: "center",
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    style={{
                      fontSize: "36px",
                      fontWeight: 500,
                      letterSpacing: "-0.03em",
                      color: getScoreColor(results.overall),
                    }}
                  >
                    {results.overall}
                  </span>
                </div>
              </div>
              <p
                className="text-muted-foreground mb-6"
                style={{ fontSize: "15px" }}
              >
                Your brand has room for improvement. Here's what to fix.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  to="/studio"
                  className="inline-flex items-center gap-2 text-white px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--ora-signal) 0%, #2a3ba8 100%)",
                    fontSize: "14px",
                    fontWeight: 500,
                    boxShadow: "0 2px 12px rgba(59,79,196,0.3)",
                  }}
                >
                  Fix with Studio
                  <ArrowRight size={14} />
                </Link>
                <button
                  onClick={() => {
                    setResults(null);
                    setUrl("");
                  }}
                  className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-xl text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  style={{ fontSize: "14px", fontWeight: 500 }}
                >
                  <RefreshCw size={14} />
                  Scan another
                </button>
              </div>
            </motion.div>

            {/* Detail cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.sections.map((section, i) => {
                const Icon = section.icon;
                return (
                  <motion.div
                    key={section.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    className="bg-card border border-border rounded-xl p-5"
                    style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            background:
                              section.status === "good"
                                ? "rgba(22,163,74,0.08)"
                                : "rgba(245,158,11,0.08)",
                          }}
                        >
                          <Icon
                            size={15}
                            style={{
                              color:
                                section.status === "good"
                                  ? "#16a34a"
                                  : "#f59e0b",
                            }}
                          />
                        </div>
                        <span
                          className="text-foreground"
                          style={{ fontSize: "14px", fontWeight: 500 }}
                        >
                          {section.title}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "18px",
                          fontWeight: 600,
                          color: getScoreColor(section.score),
                        }}
                      >
                        {section.score}
                      </span>
                    </div>

                    <p
                      className="text-muted-foreground mb-4"
                      style={{ fontSize: "13px", lineHeight: 1.55 }}
                    >
                      {section.details}
                    </p>

                    <div className="space-y-2">
                      {section.suggestions.map((s) => (
                        <div key={s} className="flex items-start gap-2">
                          {section.status === "good" ? (
                            <Check
                              size={11}
                              className="mt-0.5 flex-shrink-0"
                              style={{ color: "#16a34a" }}
                              strokeWidth={2.5}
                            />
                          ) : (
                            <AlertTriangle
                              size={11}
                              className="mt-0.5 flex-shrink-0"
                              style={{ color: "#f59e0b" }}
                            />
                          )}
                          <span
                            style={{
                              fontSize: "12px",
                              lineHeight: 1.5,
                              color: "var(--foreground)",
                            }}
                          >
                            {s}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
