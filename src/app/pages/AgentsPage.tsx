import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

const clusters = [
  {
    id: "intelligence",
    name: "Intelligence",
    description: "Understand your brand, your audience, and your competitive landscape before a single word is written.",
    agents: [
      {
        name: "Brand Analyst",
        role: "Builds and maintains the Brand Vault",
        detail: "Crawls your digital presence, extracts tone, vocabulary, visual codes. Updates the vault continuously as your brand evolves. Produces brand health scores.",
      },
      {
        name: "Strategic Planner",
        role: "Translates business objectives into content strategy",
        detail: "Takes quarterly goals, competitive context, and audience data to build editorial calendars, campaign arcs, and content roadmaps.",
      },
      {
        name: "Audience Analyst",
        role: "Maps persona behavior and preferences",
        detail: "Segments audiences by behavior, platform habits, and content affinity. Feeds persona-specific recommendations to every other agent.",
      },
    ],
  },
  {
    id: "creation",
    name: "Creation",
    description: "From brief to final copy — specialist agents that write, design, and adapt content for every format.",
    agents: [
      {
        name: "Creative Director",
        role: "Orchestrates the creative vision",
        detail: "Defines the creative angle for each campaign. Evaluates output quality. Ensures conceptual coherence across all formats.",
      },
      {
        name: "Copywriter",
        role: "Writes brand-compliant copy",
        detail: "Produces headlines, body copy, CTAs for every format. Masters tone shifts between LinkedIn authority and Instagram intimacy while staying on-brand.",
      },
      {
        name: "Art Director",
        role: "Visual direction and layout guidance",
        detail: "Specifies visual treatments, image direction, typography choices, and layout rules. Ensures visual brand consistency.",
      },
      {
        name: "Email Specialist",
        role: "Email-native content production",
        detail: "Subject lines, preview text, body structure, CTA placement. Optimizes for deliverability, open rates, and conversions.",
      },
      {
        name: "Video Maker",
        role: "Short-form video scripts and storyboards",
        detail: "Creates scripts for Stories, Reels, TikTok. Structures hooks, pacing, and CTAs for vertical video consumption patterns.",
      },
    ],
  },
  {
    id: "optimization",
    name: "Optimization",
    description: "Make every piece perform better — on search, social, and across channels.",
    agents: [
      {
        name: "SEO Strategist",
        role: "Search visibility and content discoverability",
        detail: "Keyword research, meta optimization, internal linking strategy. Ensures every piece ranks without compromising brand voice.",
      },
      {
        name: "Social Media Optimizer",
        role: "Platform-specific content tuning",
        detail: "Adapts content for each platform's algorithm: hashtag strategy, posting time, format specs, engagement hooks.",
      },
      {
        name: "Campaign Multiplier",
        role: "One message, many formats",
        detail: "Takes the master message and cascades it into every required format. Maintains voice consistency while respecting platform constraints.",
      },
    ],
  },
  {
    id: "compliance",
    name: "Compliance & Quality",
    description: "Nothing leaves ORA below 90/100. Every piece is validated, scored, and approved.",
    agents: [
      {
        name: "Compliance Guard",
        role: "Brand compliance enforcement",
        detail: "Scores every output against the Brand Vault: tone, vocabulary, formatting, regulatory requirements. Flags violations with inline fixes. Blocks publication below threshold.",
      },
      {
        name: "Performance Analyst",
        role: "Post-publish intelligence",
        detail: "Tracks content performance across channels. Feeds learning data back to all agents. Produces the Weekly Intelligence Brief.",
      },
    ],
  },
];

export function AgentsPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[640px]"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-ora-signal" />
              <span style={{ fontSize: '14px' }}>4 clusters. 15 specialists.</span>
            </div>
            <h1
              className="mb-5"
              style={{
                fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
                fontWeight: 500,
                letterSpacing: '-0.035em',
                lineHeight: 1.1,
              }}
            >
              Meet the team that
              <br />
              <span className="text-muted-foreground">never sleeps.</span>
            </h1>
            <p className="text-muted-foreground mb-6" style={{ fontSize: '17px', lineHeight: 1.55 }}>
              15 AI agents organized into 4 specialized clusters. Each one is an expert.
              Each one knows your brand. They collaborate, review each other, and never
              deliver content below 90/100.
            </p>
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
              style={{ fontSize: '15px', fontWeight: 500 }}
            >
              Try all 15 agents
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Agent clusters */}
      {clusters.map((cluster, ci) => (
        <section
          key={cluster.id}
          id={cluster.id}
          className={`py-16 md:py-24 ${ci % 2 === 1 ? "bg-secondary/40" : ""}`}
        >
          <div className="max-w-[1200px] mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-10"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-ora-signal" />
                <span
                  className="text-muted-foreground uppercase tracking-wider"
                  style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em' }}
                >
                  Cluster {ci + 1}
                </span>
              </div>
              <h2
                className="text-foreground mb-3"
                style={{
                  fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                  fontWeight: 500,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                }}
              >
                {cluster.name}
              </h2>
              <p className="text-muted-foreground max-w-[560px]" style={{ fontSize: '16px', lineHeight: 1.55 }}>
                {cluster.description}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cluster.agents.map((agent, ai) => (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: ai * 0.06 }}
                  className="bg-card border border-border rounded-xl p-6"
                  style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-ora-signal" />
                    <h3
                      className="text-foreground"
                      style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.01em' }}
                    >
                      {agent.name}
                    </h3>
                  </div>
                  <p
                    className="text-ora-signal mb-3"
                    style={{ fontSize: '13px', fontWeight: 500 }}
                  >
                    {agent.role}
                  </p>
                  <p
                    className="text-muted-foreground"
                    style={{ fontSize: '14px', lineHeight: 1.6 }}
                  >
                    {agent.detail}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Bottom CTA */}
      <section className="py-20 md:py-28 text-center">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2
              className="text-foreground mb-4"
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                fontWeight: 500,
                letterSpacing: '-0.03em',
              }}
            >
              Ready to meet your new team?
            </h2>
            <p className="text-muted-foreground mb-8" style={{ fontSize: '16px' }}>
              14-day free trial. All 15 agents on Agency plan.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/studio"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-7 py-3.5 rounded-lg hover:opacity-90 transition-opacity"
                style={{ fontSize: '15px', fontWeight: 500 }}
              >
                Open Studio
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 border border-border-strong text-foreground px-7 py-3.5 rounded-lg hover:bg-secondary transition-colors"
                style={{ fontSize: '15px', fontWeight: 500 }}
              >
                View pricing
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
