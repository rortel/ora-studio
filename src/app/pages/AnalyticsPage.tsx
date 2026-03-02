import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowLeft, BarChart3, Minus, TrendingUp } from "lucide-react";
import { useAuth } from "../lib/auth";
import { getAccessToken } from "../lib/authToken";

type DashboardPayload = {
  stats?: {
    savingsEuro?: number;
    hoursSaved?: number;
    assetsCreated?: number;
    credits?: {
      total?: number;
      monthlyRemaining?: number;
      monthlyTotal?: number;
      purchased?: number;
      resetAt?: string;
    };
    studioHealth?: {
      avgCompliance?: number;
      approvalRate?: number;
      avgRevisions?: number;
    };
  };
  activity?: Array<{
    id: string;
    module: string;
    category: string;
    modelName: string;
    format: string;
    createdAt: string;
    credits: number;
    status: string;
    compliance: number;
  }>;
  models?: Array<{ label: string; count: number; percentage: number }>;
  formats?: Array<{ label: string; count: number; percentage: number }>;
  creditsByDay?: Array<{ day: string; hub: number; studio: number; chat: number; totalCredits: number }>;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

export function AnalyticsPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardPayload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const workspaceName = asText(profile?.company) || asText(profile?.organizationName) || "Workspace";

  useEffect(() => {
    const run = async () => {
      const token = getAccessToken();
      if (!token) {
        setError("Session expired. Please sign in again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/dashboard", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(asText(payload?.error) || "Unable to load analytics.");
          return;
        }
        setData(payload || {});
      } catch (_error) {
        setError("Unable to load analytics.");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const stats = data.stats || {};
  const credits = stats.credits || {};
  const compliance = toNumber(stats.studioHealth?.avgCompliance, 0);
  const assetsCreated = toNumber(stats.assetsCreated, 0);
  const hoursSaved = toNumber(stats.hoursSaved, 0);
  const savingsEuro = toNumber(stats.savingsEuro, 0);
  const recentRuns = Array.isArray(data.activity) ? data.activity : [];
  const formats = Array.isArray(data.formats) ? data.formats : [];
  const creditsByDay = Array.isArray(data.creditsByDay) ? data.creditsByDay.slice(-8) : [];

  const kpis = useMemo(
    () => [
      { label: "Brand Health Score", value: compliance.toFixed(0), suffix: "/100", dir: compliance >= 98 ? "up" : "flat" },
      { label: "Content Produced", value: assetsCreated.toString(), suffix: " pieces", dir: assetsCreated > 0 ? "up" : "flat" },
      { label: "Avg. Compliance", value: compliance.toFixed(1), suffix: "%", dir: compliance >= 98 ? "up" : "flat" },
      { label: "Time Saved", value: hoursSaved.toFixed(1), suffix: "h", dir: hoursSaved > 0 ? "up" : "flat" },
      { label: "Savings", value: savingsEuro.toFixed(0), suffix: "€", dir: savingsEuro > 0 ? "up" : "flat" },
      { label: "Credits Left", value: toNumber(credits.total, 0).toString(), suffix: "", dir: "flat" },
    ],
    [assetsCreated, compliance, credits.total, hoursSaved, savingsEuro],
  );

  const maxDailyCredits = Math.max(1, ...creditsByDay.map((item) => toNumber(item.totalCredits, 0)));

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="border-b border-border bg-card">
        <div className="max-w-[1200px] mx-auto px-6 py-5">
          <Link
            to="/studio"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-4"
            style={{ fontSize: "13px" }}
          >
            <ArrowLeft size={14} />
            Back to Studio
          </Link>
          <h1 className="text-foreground mb-1" style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "-0.03em" }}>
            Analytics
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: "15px" }}>
            {workspaceName} — Real usage data
          </p>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {error && (
          <div className="border border-destructive/40 bg-destructive/5 rounded-xl p-3 mb-6">
            <p className="text-destructive" style={{ fontSize: "13px" }}>
              {error}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <p className="text-muted-foreground mb-2" style={{ fontSize: "12px" }}>
                {kpi.label}
              </p>
              <div className="flex items-baseline gap-0.5">
                <span className="text-foreground" style={{ fontSize: "26px", fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1 }}>
                  {kpi.value}
                </span>
                <span className="text-muted-foreground" style={{ fontSize: "13px" }}>
                  {kpi.suffix}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                {kpi.dir === "up" ? <TrendingUp size={12} className="text-green-500" /> : <Minus size={12} className="text-muted-foreground" />}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h3 className="text-foreground mb-5 inline-flex items-center gap-2" style={{ fontSize: "16px", fontWeight: 500 }}>
              <BarChart3 size={15} />
              Credits usage by day
            </h3>
            {loading ? (
              <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                Loading...
              </p>
            ) : creditsByDay.length ? (
              <div className="space-y-3">
                {creditsByDay.map((item) => {
                  const pct = Math.round((toNumber(item.totalCredits, 0) / maxDailyCredits) * 100);
                  return (
                    <div key={item.day} className="grid grid-cols-[92px_minmax(0,1fr)_56px] gap-2 items-center">
                      <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
                        {item.day}
                      </span>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-ora-signal" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-foreground text-right" style={{ fontSize: "11px", fontWeight: 600 }}>
                        {toNumber(item.totalCredits, 0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                No activity yet.
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card border border-border rounded-xl p-6"
          >
            <h3 className="text-foreground mb-5" style={{ fontSize: "16px", fontWeight: 500 }}>
              Format performance
            </h3>
            <div className="space-y-3.5">
              {!formats.length && (
                <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                  No format data yet.
                </p>
              )}
              {formats.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-foreground w-24 flex-shrink-0" style={{ fontSize: "14px" }}>
                    {item.label}
                  </span>
                  <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${toNumber(item.percentage, 0)}%` }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className="h-full bg-ora-signal rounded-full"
                    />
                  </div>
                  <span className="text-ora-signal flex-shrink-0" style={{ fontSize: "12px", fontWeight: 600 }}>
                    {toNumber(item.count, 0)} runs
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-6"
        >
          <h3 className="text-foreground mb-5" style={{ fontSize: "16px", fontWeight: 500 }}>
            Recent runs
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>Module</th>
                  <th className="text-left py-2.5 text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>Model</th>
                  <th className="text-left py-2.5 text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>Format</th>
                  <th className="text-right py-2.5 text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>Compliance</th>
                  <th className="text-right py-2.5 text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {!recentRuns.length && (
                  <tr>
                    <td colSpan={5} className="py-4 text-muted-foreground" style={{ fontSize: "12px" }}>
                      No activity yet.
                    </td>
                  </tr>
                )}
                {recentRuns.slice(0, 12).map((run) => (
                  <tr key={run.id} className="border-b border-border/50">
                    <td className="py-3 text-foreground" style={{ fontSize: "13px" }}>{run.module}</td>
                    <td className="py-3 text-foreground" style={{ fontSize: "13px" }}>{run.modelName}</td>
                    <td className="py-3 text-muted-foreground" style={{ fontSize: "13px" }}>{run.format}</td>
                    <td className="py-3 text-right text-ora-signal" style={{ fontSize: "13px", fontWeight: 600 }}>{toNumber(run.compliance, 0)}</td>
                    <td className="py-3 text-right text-muted-foreground" style={{ fontSize: "12px" }}>{formatDate(run.createdAt)}</td>
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
