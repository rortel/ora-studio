import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";

const kpis = [
  { label: "Brand Health Score", value: "94", suffix: "/100", trend: "+2", dir: "up" },
  { label: "Content Produced", value: "127", suffix: " pieces", trend: "+34%", dir: "up" },
  { label: "Avg. Compliance", value: "96.4", suffix: "%", trend: "+1.2%", dir: "up" },
  { label: "Time Saved", value: "42", suffix: "h/week", trend: "+8h", dir: "up" },
  { label: "Format Coverage", value: "7", suffix: "/7", trend: "+1", dir: "up" },
  { label: "Learning Score", value: "78", suffix: "/100", trend: "+12", dir: "up" },
];

const weeklyData = [
  { week: "Week 1", pieces: 18, compliance: 91, score: 88 },
  { week: "Week 2", pieces: 24, compliance: 93, score: 90 },
  { week: "Week 3", pieces: 31, compliance: 94, score: 92 },
  { week: "Week 4", pieces: 28, compliance: 96, score: 94 },
  { week: "Week 5", pieces: 35, compliance: 97, score: 94 },
  { week: "Week 6", pieces: 42, compliance: 96, score: 95 },
  { week: "Week 7", pieces: 38, compliance: 97, score: 96 },
  { week: "Week 8", pieces: 47, compliance: 98, score: 96 },
];

const maxPieces = Math.max(...weeklyData.map((d) => d.pieces));

const topPerformers = [
  { format: "LinkedIn", pieces: 34, avgScore: 97 },
  { format: "Email", pieces: 28, avgScore: 95 },
  { format: "SMS", pieces: 20, avgScore: 96 },
  { format: "Newsletter", pieces: 12, avgScore: 98 },
  { format: "Landing Page", pieces: 8, avgScore: 94 },
  { format: "Ad Copy", pieces: 22, avgScore: 93 },
  { format: "Stories", pieces: 18, avgScore: 91 },
];

const agentActivity = [
  { agent: "Copywriter", tasks: 89, avgTime: "4.2s" },
  { agent: "Compliance Guard", tasks: 127, avgTime: "1.8s" },
  { agent: "Campaign Multiplier", tasks: 34, avgTime: "6.1s" },
  { agent: "SEO Strategist", tasks: 45, avgTime: "3.4s" },
  { agent: "Brand Analyst", tasks: 23, avgTime: "2.1s" },
];

export function AnalyticsPage() {
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
          <h1
            className="text-foreground mb-1"
            style={{ fontSize: '28px', fontWeight: 500, letterSpacing: '-0.03em' }}
          >
            Analytics
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: '15px' }}>
            Acme Corp \u2014 Last 8 weeks
          </p>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <p className="text-muted-foreground mb-2" style={{ fontSize: '12px' }}>
                {kpi.label}
              </p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-foreground" style={{ fontSize: '26px', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {kpi.value}
                </span>
                <span className="text-muted-foreground" style={{ fontSize: '13px' }}>
                  {kpi.suffix}
                </span>
              </div>
              {kpi.trend && (
                <div className="flex items-center gap-1 mt-1.5">
                  {kpi.dir === "up" ? (
                    <TrendingUp size={12} className="text-green-500" />
                  ) : kpi.dir === "down" ? (
                    <TrendingDown size={12} className="text-destructive" />
                  ) : (
                    <Minus size={12} className="text-muted-foreground" />
                  )}
                  <span className="text-green-600" style={{ fontSize: '11px', fontWeight: 500 }}>
                    {kpi.trend}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {/* Content production chart (simple bar) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h3 className="text-foreground mb-5" style={{ fontSize: '16px', fontWeight: 500 }}>
              Content Production
            </h3>
            <div className="flex items-end gap-3 h-[180px]">
              {weeklyData.map((d, i) => (
                <div key={d.week} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-muted-foreground" style={{ fontSize: '10px' }}>
                    {d.pieces}
                  </span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(d.pieces / maxPieces) * 140}px` }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 0.5 }}
                    className="w-full bg-ora-signal/20 rounded-t-md relative overflow-hidden"
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-ora-signal rounded-t-md"
                      style={{ height: `${d.compliance - 85}0%` }}
                    />
                  </motion.div>
                  <span className="text-muted-foreground" style={{ fontSize: '9px' }}>
                    W{i + 1}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Format performance */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h3 className="text-foreground mb-5" style={{ fontSize: '16px', fontWeight: 500 }}>
              Format Performance
            </h3>
            <div className="space-y-3.5">
              {topPerformers.map((f) => (
                <div key={f.format} className="flex items-center gap-3">
                  <span className="text-foreground w-24 flex-shrink-0" style={{ fontSize: '14px' }}>
                    {f.format}
                  </span>
                  <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(f.avgScore / 100) * 100}%` }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className="h-full bg-ora-signal rounded-full"
                    />
                  </div>
                  <span className="text-ora-signal flex-shrink-0" style={{ fontSize: '13px', fontWeight: 600 }}>
                    {f.avgScore}
                  </span>
                  <span className="text-muted-foreground flex-shrink-0 w-16 text-right" style={{ fontSize: '12px' }}>
                    {f.pieces} pieces
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Agent activity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h3 className="text-foreground mb-5" style={{ fontSize: '16px', fontWeight: 500 }}>
            Agent Activity
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 text-muted-foreground" style={{ fontSize: '12px', fontWeight: 500 }}>Agent</th>
                  <th className="text-right py-2.5 text-muted-foreground" style={{ fontSize: '12px', fontWeight: 500 }}>Tasks (8 weeks)</th>
                  <th className="text-right py-2.5 text-muted-foreground" style={{ fontSize: '12px', fontWeight: 500 }}>Avg. Response Time</th>
                </tr>
              </thead>
              <tbody>
                {agentActivity.map((a) => (
                  <tr key={a.agent} className="border-b border-border/50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-ora-signal" />
                        <span className="text-foreground" style={{ fontSize: '14px' }}>{a.agent}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-foreground" style={{ fontSize: '14px', fontWeight: 500 }}>
                      {a.tasks}
                    </td>
                    <td className="py-3 text-right text-muted-foreground" style={{ fontSize: '14px' }}>
                      {a.avgTime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}