import { motion } from "motion/react";

const agentGroups = [
  {
    category: "Intelligence",
    color: "bg-ora-signal",
    agents: [
      "Brand Analyst - Reads your brand and builds the vault",
      "Strategic Planner - Plans what to publish, when, and why",
      "Audience Analyst - Maps who you're talking to",
    ],
  },
  {
    category: "Creation",
    color: "bg-ora-signal",
    agents: [
      "Creative Director - Proposes creative directions",
      "Copywriter - Writes and rewrites until the tone is right",
      "Art Director - Sets visual direction for every asset",
      "Email Specialist - Structures emails that get opened",
      "Video Maker - Scripts and generates short-form video",
    ],
  },
  {
    category: "Optimization",
    color: "bg-ora-signal",
    agents: [
      "SEO Strategist - Optimizes for search without breaking the voice",
      "Social Media Optimizer - Adapts content per platform",
      "Campaign Multiplier - Takes one asset, produces it for every channel",
    ],
  },
  {
    category: "Compliance",
    color: "bg-ora-signal",
    agents: [
      "Compliance Guard - Scores every output against Brand Vault",
      "Performance Analyst - Tracks what's working, suggests what's next",
    ],
  },
];

export function Agents() {
  return (
    <section id="agents" className="py-20 md:py-28">
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
            15 agents. One team. Available in Studio mode.
          </h2>
          <p className="text-muted-foreground max-w-[760px]" style={{ fontSize: "16px", lineHeight: 1.55 }}>
            When you activate Studio, specialist agents review and improve outputs from your chosen models.
            They handle the details so you can focus on the decisions.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {agentGroups.map((group, gi) => (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: gi * 0.08 }}
              className="bg-card border border-border rounded-xl p-6"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
            >
              <div className="flex items-center gap-2 mb-5">
                <span className={`w-2 h-2 rounded-full ${group.color}`} />
                <span
                  className="text-muted-foreground uppercase tracking-wider"
                  style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em" }}
                >
                  {group.category}
                </span>
              </div>
              <ul className="space-y-3">
                {group.agents.map((agent) => (
                  <li key={agent} className="flex items-start gap-2.5">
                    <span className="w-1 h-1 mt-2 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                    <span className="text-foreground" style={{ fontSize: "14px", fontWeight: 400, lineHeight: 1.5 }}>
                      {agent}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
