import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, BarChart3, Coins, FolderKanban, Sparkles } from "lucide-react";
import { getAccessToken } from "../lib/authToken";
import { useAuth } from "../lib/auth";

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

function formatDateTime(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

export function DashboardPage() {
  const { profile } = useAuth();
  const [data, setData] = useState<DashboardPayload>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authHeaders = useMemo(() => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/dashboard", {
          method: "GET",
          headers: authHeaders,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          setError(asText(payload?.error) || "Unable to load dashboard.");
          return;
        }
        setData(payload || {});
      } catch (_error) {
        setError("Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    };
    void fetchDashboard();
  }, [authHeaders]);

  const stats = data.stats || {};
  const credits = stats.credits || {};
  const creditUsed = Math.max(0, (credits.monthlyTotal || 0) - (credits.monthlyRemaining || 0));
  const creditUsedPct = credits.monthlyTotal ? Math.min(100, Math.round((creditUsed / credits.monthlyTotal) * 100)) : 0;

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-4">
        <div>
          <h1 className="text-foreground mb-1" style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "-0.03em" }}>
            Good morning{profile?.fullName ? `, ${profile.fullName}` : ""}.
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
            Value, speed and output quality based on your real usage.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300/40 bg-red-500/10 px-3 py-2">
            <p className="text-red-500" style={{ fontSize: "12px" }}>
              {error}
            </p>
          </div>
        )}

        <section className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-foreground" style={{ fontSize: "15px", fontWeight: 600 }}>
              Your savings this month
            </h2>
            <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
              How we calculate this: based on providers and formats used.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-border rounded-lg p-4">
              <p className="text-foreground" style={{ fontSize: "24px", fontWeight: 600 }}>
                €{stats.savingsEuro ?? 0}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                saved vs separate subscriptions
              </p>
            </div>
            <div className="border border-border rounded-lg p-4">
              <p className="text-foreground" style={{ fontSize: "24px", fontWeight: 600 }}>
                {stats.hoursSaved ?? 0}h
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                saved vs writing from scratch
              </p>
            </div>
            <div className="border border-border rounded-lg p-4">
              <p className="text-foreground" style={{ fontSize: "24px", fontWeight: 600 }}>
                {stats.assetsCreated ?? 0}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                assets created this month
              </p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-4">
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-foreground mb-3 inline-flex items-center gap-2" style={{ fontSize: "15px", fontWeight: 600 }}>
              <Coins size={15} />
              Credits
            </h2>
            <p className="text-foreground mb-1" style={{ fontSize: "22px", fontWeight: 600 }}>
              {credits.total ?? 0} credits left
            </p>
            <p className="text-muted-foreground mb-2" style={{ fontSize: "12px" }}>
              Monthly: {credits.monthlyRemaining ?? 0}/{credits.monthlyTotal ?? 0}
            </p>
            <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
              <div className="h-full bg-ora-signal" style={{ width: `${creditUsedPct}%` }} />
            </div>
            <p className="text-muted-foreground mb-3" style={{ fontSize: "11px" }}>
              Purchased: {credits.purchased ?? 0} · Resets: {asText(credits.resetAt).slice(0, 10) || "N/A"}
            </p>
            <Link to="/settings/billing" className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" style={{ fontSize: "12px", fontWeight: 600 }}>
              Buy more
              <ArrowRight size={12} />
            </Link>
          </section>

          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-foreground mb-3 inline-flex items-center gap-2" style={{ fontSize: "15px", fontWeight: 600 }}>
              <Sparkles size={15} />
              Quick actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link to="/hub" className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" style={{ fontSize: "12px", fontWeight: 600 }}>
                Generate text
              </Link>
              <Link to="/hub" className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" style={{ fontSize: "12px", fontWeight: 600 }}>
                Create image
              </Link>
              <Link to="/chat" className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" style={{ fontSize: "12px", fontWeight: 600 }}>
                New chat
              </Link>
              <Link to="/studio" className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" style={{ fontSize: "12px", fontWeight: 600 }}>
                Open Studio
              </Link>
            </div>
          </section>
        </div>

        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-foreground mb-3 inline-flex items-center gap-2" style={{ fontSize: "15px", fontWeight: 600 }}>
            <BarChart3 size={15} />
            This month&apos;s activity
          </h2>
          {loading ? (
            <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
              Loading activity...
            </p>
          ) : (
            <div className="space-y-2">
              {(data.creditsByDay || []).slice(-8).map((row) => {
                const max = Math.max(1, ...(data.creditsByDay || []).map((entry) => entry.totalCredits || 0));
                const pct = Math.round(((row.totalCredits || 0) / max) * 100);
                return (
                  <div key={row.day} className="grid grid-cols-[96px_minmax(0,1fr)_56px] gap-2 items-center">
                    <span className="text-muted-foreground" style={{ fontSize: "11px" }}>
                      {row.day}
                    </span>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-ora-signal" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-foreground text-right" style={{ fontSize: "11px", fontWeight: 600 }}>
                      {row.totalCredits}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-foreground mb-3" style={{ fontSize: "15px", fontWeight: 600 }}>
              Top models
            </h2>
            <div className="space-y-2">
              {(data.models || []).map((model) => (
                <div key={model.label} className="flex items-center justify-between">
                  <p className="text-foreground" style={{ fontSize: "13px" }}>
                    {model.label}
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
                    {model.percentage}%
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-card border border-border rounded-xl p-5">
            <h2 className="text-foreground mb-3" style={{ fontSize: "15px", fontWeight: 600 }}>
              Top formats
            </h2>
            <div className="space-y-2">
              {(data.formats || []).map((format) => (
                <div key={format.label} className="flex items-center justify-between">
                  <p className="text-foreground" style={{ fontSize: "13px" }}>
                    {format.label}
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
                    {format.percentage}%
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-foreground mb-3 inline-flex items-center gap-2" style={{ fontSize: "15px", fontWeight: 600 }}>
            <FolderKanban size={15} />
            Recent activity
          </h2>
          <div className="space-y-2">
            {(data.activity || []).length === 0 && (
              <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                No activity yet.
              </p>
            )}
            {(data.activity || []).map((entry) => (
              <div key={entry.id} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                    {entry.format} · {entry.modelName} · {entry.module}
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                    {entry.category} · {entry.credits} credits · {entry.status}
                  </p>
                </div>
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                  {formatDateTime(entry.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

