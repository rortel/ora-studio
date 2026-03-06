import { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import {
  ArrowLeft,
  Globe,
  FileText,
  Palette,
  Users,
  Shield,
  Target,
  BookOpen,
  RefreshCw,
  Check,
} from "lucide-react";

const vaultSections = [
  {
    icon: Globe,
    title: "Digital Presence",
    status: "Complete",
    score: 96,
    items: [
      { label: "Website crawled", value: "acmecorp.com (847 pages)" },
      { label: "Social profiles", value: "LinkedIn, Twitter, Instagram" },
      { label: "Last updated", value: "2 hours ago" },
    ],
  },
  {
    icon: Palette,
    title: "Tone & Voice",
    status: "Complete",
    score: 94,
    items: [
      { label: "Formality", value: "7.2 / 10" },
      { label: "Confidence", value: "8.1 / 10" },
      { label: "Warmth", value: "5.4 / 10" },
      { label: "Humor", value: "2.1 / 10" },
    ],
  },
  {
    icon: BookOpen,
    title: "Vocabulary",
    status: "Complete",
    score: 98,
    items: [
      { label: "Approved terms", value: "342 words" },
      { label: "Forbidden terms", value: "28 words" },
      { label: "Brand-specific", value: "45 terms" },
    ],
  },
  {
    icon: Users,
    title: "Audiences",
    status: "Complete",
    score: 91,
    items: [
      { label: "Primary persona", value: "CFO / VP Finance" },
      { label: "Secondary", value: "CTO / Engineering Lead" },
      { label: "Tertiary", value: "Procurement Manager" },
    ],
  },
  {
    icon: Target,
    title: "Competitors",
    status: "Complete",
    score: 88,
    items: [
      { label: "Tracked", value: "4 competitors" },
      { label: "Differentiation score", value: "7.8 / 10" },
      { label: "Voice overlap risk", value: "Low" },
    ],
  },
  {
    icon: Shield,
    title: "Compliance Rules",
    status: "Complete",
    score: 100,
    items: [
      { label: "Regulatory", value: "GDPR, SOC 2" },
      { label: "Legal disclaimers", value: "3 active" },
      { label: "Accessibility", value: "WCAG 2.1 AA" },
    ],
  },
];

const approvedTerms = [
  "intelligent automation", "enterprise-grade", "ROI-driven",
  "scalable", "compliant", "data-informed", "mission-critical",
  "seamless integration", "actionable insights", "trusted partner",
];

const forbiddenTerms = [
  "game-changer", "disrupt", "synergy", "leverage", "pivot",
  "bleeding edge", "rockstar", "guru", "ninja",
];

export function VaultPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="min-h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-[1200px] mx-auto px-6 py-5">
          <Link
            to="/studio"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-4"
            style={{ fontSize: '13px' }}
          >
            <ArrowLeft size={14} />
            Back to Studio
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1
                  className="text-foreground"
                  style={{
                    fontSize: '28px',
                    fontWeight: 500,
                    letterSpacing: '-0.03em',
                  }}
                >
                  Brand Vault
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-ora-signal-light text-ora-signal" style={{ fontSize: '12px', fontWeight: 600 }}>
                  94/100
                </span>
              </div>
              <p className="text-muted-foreground" style={{ fontSize: '15px' }}>
                Acme Corp — Last crawled 2 hours ago
              </p>
            </div>
            <button
              className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-foreground hover:bg-secondary transition-colors cursor-pointer"
              style={{ fontSize: '13px', fontWeight: 500 }}
            >
              <RefreshCw size={14} />
              Re-crawl
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Vault score cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {vaultSections.map((section, i) => {
            const Icon = section.icon;
            return (
              <motion.button
                key={section.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActiveTab(i)}
                className={`text-left bg-card border rounded-xl p-5 transition-all cursor-pointer ${
                  activeTab === i ? "border-ora-signal shadow-sm" : "border-border hover:border-border-strong"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className="text-muted-foreground" />
                    <span className="text-foreground" style={{ fontSize: '15px', fontWeight: 500 }}>
                      {section.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-ora-signal" />
                    <span className="text-ora-signal" style={{ fontSize: '13px', fontWeight: 600 }}>
                      {section.score}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-muted-foreground" style={{ fontSize: '13px' }}>
                        {item.label}
                      </span>
                      <span className="text-foreground" style={{ fontSize: '13px', fontWeight: 450 }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Vocabulary browser */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <FileText size={16} className="text-ora-signal" />
              <h3 className="text-foreground" style={{ fontSize: '16px', fontWeight: 500 }}>
                Approved Vocabulary
              </h3>
              <span className="ml-auto text-muted-foreground" style={{ fontSize: '12px' }}>
                {approvedTerms.length} terms
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {approvedTerms.map((term) => (
                <span
                  key={term}
                  className="px-3 py-1.5 rounded-lg bg-ora-signal-light text-foreground border border-ora-signal/10"
                  style={{ fontSize: '13px' }}
                >
                  {term}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <Shield size={16} className="text-destructive/60" />
              <h3 className="text-foreground" style={{ fontSize: '16px', fontWeight: 500 }}>
                Forbidden Terms
              </h3>
              <span className="ml-auto text-muted-foreground" style={{ fontSize: '12px' }}>
                {forbiddenTerms.length} terms
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {forbiddenTerms.map((term) => (
                <span
                  key={term}
                  className="px-3 py-1.5 rounded-lg bg-destructive/5 text-destructive/70 border border-destructive/10 line-through"
                  style={{ fontSize: '13px' }}
                >
                  {term}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
