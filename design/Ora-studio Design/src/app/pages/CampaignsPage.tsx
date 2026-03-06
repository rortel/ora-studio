import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowLeft, Plus, Search, Filter, MoreHorizontal, FileText, Zap } from "lucide-react";

const campaigns = [
  {
    id: 1,
    name: "Q2 Product Launch",
    brief: "Launch campaign for AI Analytics feature, targeting CFOs and CTOs",
    formats: ["LinkedIn", "Email", "SMS", "Landing Page", "Ad", "Stories", "Newsletter"],
    score: 96,
    status: "Live",
    date: "Feb 24, 2026",
    pieces: 12,
  },
  {
    id: 2,
    name: "Hiring Campaign — Engineering",
    brief: "Attract senior engineers with culture-forward messaging",
    formats: ["LinkedIn", "Email", "SMS", "Stories", "Ad"],
    score: 93,
    status: "Review",
    date: "Feb 23, 2026",
    pieces: 8,
  },
  {
    id: 3,
    name: "Weekly Newsletter #47",
    brief: "Product updates, customer story, and industry insights",
    formats: ["Newsletter"],
    score: 98,
    status: "Approved",
    date: "Feb 22, 2026",
    pieces: 1,
  },
  {
    id: 4,
    name: "Partner Announcement — Helix",
    brief: "Strategic partnership with Helix Studio for integrated workflows",
    formats: ["LinkedIn", "Email", "SMS", "Landing Page", "Ad", "Stories", "Newsletter", "Blog", "Press Release"],
    score: 91,
    status: "Draft",
    date: "Feb 21, 2026",
    pieces: 16,
  },
  {
    id: 5,
    name: "Customer Story — Nortem",
    brief: "Case study: how Nortem reduced content production time by 80%",
    formats: ["LinkedIn", "Email", "Landing Page"],
    score: 95,
    status: "Approved",
    date: "Feb 20, 2026",
    pieces: 6,
  },
  {
    id: 6,
    name: "Q1 Brand Refresh",
    brief: "Updated messaging and visual direction for Q1 2026",
    formats: ["LinkedIn", "Email", "SMS", "Landing Page", "Ad", "Stories", "Newsletter"],
    score: 97,
    status: "Live",
    date: "Feb 18, 2026",
    pieces: 14,
  },
];

const statusColors: Record<string, string> = {
  Live: "bg-green-500",
  Review: "bg-yellow-500",
  Approved: "bg-ora-signal",
  Draft: "bg-muted-foreground/50",
};

export function CampaignsPage() {
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
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-foreground mb-1"
                style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.03em' }}
              >
                Campaigns
              </h1>
              <p className="text-muted-foreground" style={{ fontSize: '15px' }}>
                {campaigns.length} campaigns \u00B7 {campaigns.reduce((a, c) => a + c.pieces, 0)} content pieces
              </p>
            </div>
            <Link
              to="/studio"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              style={{ fontSize: '14px', fontWeight: 500 }}
            >
              <Plus size={15} />
              New Campaign
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        {/* Filters bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search campaigns..."
              className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground/50"
              style={{ fontSize: '14px' }}
            />
          </div>
          <button className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
            <Filter size={14} />
            <span style={{ fontSize: '13px' }}>Filter</span>
          </button>
        </div>

        {/* Campaign grid */}
        <div className="space-y-3">
          {campaigns.map((campaign, i) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-xl p-5 hover:border-border-strong transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="text-foreground" style={{ fontSize: '16px', fontWeight: 500 }}>
                      {campaign.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-white ${statusColors[campaign.status]}`}
                      style={{ fontSize: '10px', fontWeight: 600 }}
                    >
                      {campaign.status}
                    </span>
                    <span className="text-ora-signal" style={{ fontSize: '14px', fontWeight: 600 }}>
                      {campaign.score}/100
                    </span>
                  </div>
                  <p className="text-muted-foreground" style={{ fontSize: '14px' }}>
                    {campaign.brief}
                  </p>
                </div>
                <button className="text-muted-foreground hover:text-foreground p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {campaign.formats.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-1 rounded-md bg-secondary text-muted-foreground"
                      style={{ fontSize: '11px', fontWeight: 450 }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: '12px' }}>
                    <FileText size={12} />
                    {campaign.pieces} pieces
                  </span>
                  <span className="text-muted-foreground" style={{ fontSize: '12px' }}>
                    {campaign.date}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}