import { motion } from "motion/react";

const companies = ["Meridian Group", "Helix Studio", "Nortem", "Vault & Co", "Apex Digital"];

export function SocialProof() {
  return (
    <section className="py-10 border-t border-border">
      <div className="max-w-[1200px] mx-auto px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10"
        >
          <span
            className="text-muted-foreground uppercase tracking-widest flex-shrink-0"
            style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.12em" }}
          >
            USED BY CREATORS, FOUNDERS, AND TEAMS WHO WANT ONE TOOL INSTEAD OF FIVE
          </span>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {companies.map((name) => (
              <span
                key={name}
                className="text-muted-foreground/50"
                style={{ fontSize: "16px", fontWeight: 400, letterSpacing: "-0.01em" }}
              >
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
