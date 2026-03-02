import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { Download, RefreshCw, Search, Shield, Users, Wallet } from "lucide-react";
import { getAccessToken } from "../lib/authToken";

type AdminSummary = {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  adminUsers: number;
  totalCredits: number;
  totalCampaigns: number;
  totalAssets: number;
};

type AdminUser = {
  userId: string;
  email: string;
  fullName: string;
  company: string;
  role: string;
  status: string;
  subscription: string;
  planCode: string;
  credits: number;
  creditsMonthly: number;
  creditsPurchased: number;
  campaignCount: number;
  pieceCount: number;
  totalGenerations: number;
  lastActive: string;
  signupDate: string;
  lifetimeRevenue: number;
  apiCost: number;
  stripeCustomerId: string;
};

type AdminLog = {
  id: string;
  ts: string;
  actorEmail: string;
  action: string;
  targetUserId: string;
  details: string;
};

type AdminOverview = {
  revenue: {
    mrr: number;
    subscriptions: number;
    creditPacks: number;
    revenueToday: number;
    apiCosts: number;
    grossProfit: number;
    grossMargin: number;
    avgRevenuePerPayingUser: number;
  };
  users: {
    total: number;
    signedUpThisMonth: number;
    newToday: number;
    freeUsers: number;
    simpleUsers: number;
    advancedUsers: number;
    studioUsers: number;
    activeThisWeek: number;
    activeTeams: number;
    churnRate: number;
    freeToPaidConversion: number;
  };
  usage: {
    totalGenerations: number;
    todayGenerations: number;
    hubGenerations: number;
    studioGenerations: number;
    chatGenerations: number;
    arenaRuns: number;
    successRate: number;
    avgLatency: number;
    errors: number;
  };
  providers: Array<{
    provider: string;
    calls: number;
    cost: number;
    revenue: number;
    margin: number;
    errorRate: number;
    avgLatency: number;
  }>;
  modelStats: Array<{ modelName: string; calls: number; percentage: number }>;
  formatStats: Array<{ label: string; count: number; percentage: number }>;
};

type AdminSnapshot = {
  summary: AdminSummary;
  users: AdminUser[];
  logs: AdminLog[];
  overview: AdminOverview;
};

const emptySnapshot: AdminSnapshot = {
  summary: {
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    adminUsers: 0,
    totalCredits: 0,
    totalCampaigns: 0,
    totalAssets: 0,
  },
  users: [],
  logs: [],
  overview: {
    revenue: {
      mrr: 0,
      subscriptions: 0,
      creditPacks: 0,
      revenueToday: 0,
      apiCosts: 0,
      grossProfit: 0,
      grossMargin: 0,
      avgRevenuePerPayingUser: 0,
    },
    users: {
      total: 0,
      signedUpThisMonth: 0,
      newToday: 0,
      freeUsers: 0,
      simpleUsers: 0,
      advancedUsers: 0,
      studioUsers: 0,
      activeThisWeek: 0,
      activeTeams: 0,
      churnRate: 0,
      freeToPaidConversion: 0,
    },
    usage: {
      totalGenerations: 0,
      todayGenerations: 0,
      hubGenerations: 0,
      studioGenerations: 0,
      chatGenerations: 0,
      arenaRuns: 0,
      successRate: 0,
      avgLatency: 0,
      errors: 0,
    },
    providers: [],
    modelStats: [],
    formatStats: [],
  },
};

const sections = [
  { path: "/admin", label: "Overview" },
  { path: "/admin/users", label: "Users" },
  { path: "/admin/revenue", label: "Revenue" },
  { path: "/admin/usage", label: "Usage" },
  { path: "/admin/models", label: "Models" },
  { path: "/admin/content", label: "Content" },
  { path: "/admin/studio", label: "Studio" },
  { path: "/admin/logs", label: "Logs" },
  { path: "/admin/settings", label: "Settings" },
];

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          const text = value === null || value === undefined ? "" : String(value);
          const escaped = text.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AdminPage() {
  const location = useLocation();
  const [snapshot, setSnapshot] = useState<AdminSnapshot>(emptySnapshot);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const section = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/studio/admin")) return "/admin";
    if (path.startsWith("/admin/users")) return "/admin/users";
    if (path.startsWith("/admin/revenue")) return "/admin/revenue";
    if (path.startsWith("/admin/usage")) return "/admin/usage";
    if (path.startsWith("/admin/models")) return "/admin/models";
    if (path.startsWith("/admin/content")) return "/admin/content";
    if (path.startsWith("/admin/studio")) return "/admin/studio";
    if (path.startsWith("/admin/logs")) return "/admin/logs";
    if (path.startsWith("/admin/settings")) return "/admin/settings";
    return "/admin";
  }, [location.pathname]);

  const authHeaders = useMemo(() => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const api = useCallback(
    async (method: "GET" | "POST", body?: Record<string, unknown>) => {
      const response = await fetch("/api/admin-store", {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(asText(payload?.error) || "Admin request failed");
      }
      return payload as AdminSnapshot & { ok: boolean };
    },
    [authHeaders],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await api("GET");
      setSnapshot({
        summary: payload.summary || emptySnapshot.summary,
        users: Array.isArray(payload.users) ? payload.users : [],
        logs: Array.isArray(payload.logs) ? payload.logs : [],
        overview: payload.overview || emptySnapshot.overview,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load admin data");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!snapshot.users.length) {
      setSelectedUserId("");
      return;
    }
    if (!selectedUserId || !snapshot.users.some((user) => user.userId === selectedUserId)) {
      setSelectedUserId(snapshot.users[0].userId);
    }
  }, [snapshot.users, selectedUserId]);

  const usersFiltered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return snapshot.users;
    return snapshot.users.filter((user) =>
      [user.fullName, user.email, user.company, user.subscription, user.status, user.role].join(" ").toLowerCase().includes(query),
    );
  }, [search, snapshot.users]);

  const selectedUser = useMemo(
    () => snapshot.users.find((user) => user.userId === selectedUserId) || null,
    [snapshot.users, selectedUserId],
  );

  const runAction = async (action: string, payload: Record<string, unknown>, noticeText?: string) => {
    setSaving(action);
    setError("");
    setNotice("");
    try {
      const response = await api("POST", { action, ...payload });
      setSnapshot({
        summary: response.summary || emptySnapshot.summary,
        users: Array.isArray(response.users) ? response.users : [],
        logs: Array.isArray(response.logs) ? response.logs : [],
        overview: response.overview || emptySnapshot.overview,
      });
      if (noticeText) setNotice(noticeText);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Action failed");
    } finally {
      setSaving("");
    }
  };

  const exportCurrentSection = async () => {
    const table =
      section === "/admin/users"
        ? "users"
        : section === "/admin/revenue"
          ? "revenue"
          : section === "/admin/usage"
            ? "usage"
            : section === "/admin/models"
              ? "models"
              : section === "/admin/content"
                ? "content"
                : section === "/admin/studio"
                  ? "studio"
              : section === "/admin/logs"
                ? "admin_logs"
                : "overview";

    if (table === "users") {
      downloadCsv(
        `ora_users_${new Date().toISOString().slice(0, 10)}.csv`,
        usersFiltered.map((user) => ({
          id: user.userId,
          email: user.email,
          full_name: user.fullName,
          company: user.company,
          plan: user.subscription,
          credits: user.credits,
          total_generations: user.totalGenerations,
          last_active: user.lastActive,
          signup_date: user.signupDate,
          lifetime_revenue: user.lifetimeRevenue,
          api_cost: user.apiCost,
        })),
      );
    } else if (table === "admin_logs") {
      downloadCsv(
        `ora_admin_logs_${new Date().toISOString().slice(0, 10)}.csv`,
        snapshot.logs.map((log) => ({
          time: log.ts,
          admin: log.actorEmail,
          action: log.action,
          target: log.targetUserId,
          details: log.details,
        })),
      );
    } else if (table === "models") {
      downloadCsv(
        `ora_models_${new Date().toISOString().slice(0, 10)}.csv`,
        snapshot.overview.models.providers.map((row) => ({
          provider: row.provider,
          calls: row.calls,
          cost: row.cost,
          errors: row.errors,
          avg_latency_ms: row.avgLatencyMs,
        })),
      );
    } else if (table === "usage") {
      downloadCsv(
        `ora_usage_${new Date().toISOString().slice(0, 10)}.csv`,
        usersFiltered.map((user) => ({
          user_id: user.userId,
          email: user.email,
          generations_7d: user.totalGenerations,
          assets_30d: user.assets30d,
          avg_score: user.avgScore,
          avg_latency_ms: user.avgLatencyMs,
        })),
      );
    } else if (table === "revenue") {
      downloadCsv(
        `ora_revenue_${new Date().toISOString().slice(0, 10)}.csv`,
        [
          {
            mrr: snapshot.overview.revenue.mrr,
            subscriptions: snapshot.overview.revenue.subscriptions,
            credit_packs: snapshot.overview.revenue.creditPacks,
            api_costs: snapshot.overview.revenue.apiCosts,
            gross_margin: snapshot.overview.revenue.grossMargin,
          },
        ],
      );
    } else {
      downloadCsv(
        `ora_overview_${new Date().toISOString().slice(0, 10)}.csv`,
        [
          {
            total_users: snapshot.summary.totalUsers,
            active_users: snapshot.summary.activeUsers,
            suspended_users: snapshot.summary.suspendedUsers,
            admin_users: snapshot.summary.adminUsers,
            total_credits: snapshot.summary.totalCredits,
            total_campaigns: snapshot.summary.totalCampaigns,
            total_assets: snapshot.summary.totalAssets,
          },
        ],
      );
    }

    await runAction("export-csv", { table });
  };

  const renderOverview = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            MRR
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            €{snapshot.overview.revenue.mrr}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Subscriptions
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            €{snapshot.overview.revenue.subscriptions}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Credit packs
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            €{snapshot.overview.revenue.creditPacks}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            API costs
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            €{snapshot.overview.revenue.apiCosts}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Total users
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            {snapshot.overview.users.total}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Active this week
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            {snapshot.overview.users.activeThisWeek}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Free → Paid
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            {snapshot.overview.users.freeToPaidConversion}%
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Churn
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            {snapshot.overview.users.churnRate}%
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-foreground mb-2" style={{ fontSize: "14px", fontWeight: 600 }}>
          Provider health
        </p>
        <div className="space-y-2">
          {snapshot.overview.providers.map((provider) => (
            <div key={provider.provider} className="grid grid-cols-[110px_1fr_70px_70px_72px] gap-2 items-center">
              <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
                {provider.provider}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                {provider.calls} calls
              </p>
              <p className="text-muted-foreground text-right" style={{ fontSize: "11px" }}>
                €{provider.cost}
              </p>
              <p className="text-muted-foreground text-right" style={{ fontSize: "11px" }}>
                {provider.errorRate}%
              </p>
              <p className="text-muted-foreground text-right" style={{ fontSize: "11px" }}>
                {(provider.avgLatency / 1000).toFixed(2)}s
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email or company..."
              className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-foreground placeholder:text-muted-foreground/60"
              style={{ fontSize: "12px" }}
            />
          </div>
          <button type="button" onClick={() => void exportCurrentSection()} className="inline-flex items-center gap-1.5 border border-border rounded-lg px-2.5 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer" style={{ fontSize: "12px", fontWeight: 600 }}>
            <Download size={12} />
            Export CSV
          </button>
        </div>
        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {usersFiltered.map((user) => (
            <button
              key={user.userId}
              type="button"
              onClick={() => setSelectedUserId(user.userId)}
              className={`w-full text-left border rounded-lg p-3 transition-colors cursor-pointer ${
                selectedUserId === user.userId ? "border-ora-signal" : "border-border hover:border-border-strong"
              }`}
            >
              <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                {user.fullName || "Unnamed user"}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                {user.email} · {user.subscription} · {user.credits} credits
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 h-fit sticky top-[84px]">
        {!selectedUser ? (
          <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
            Select a user.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-foreground" style={{ fontSize: "15px", fontWeight: 600 }}>
                {selectedUser.fullName || selectedUser.email}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                {selectedUser.email}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="border border-border rounded-lg p-2">
                <p className="text-muted-foreground" style={{ fontSize: "10px" }}>
                  Plan
                </p>
                <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
                  {selectedUser.subscription}
                </p>
              </div>
              <div className="border border-border rounded-lg p-2">
                <p className="text-muted-foreground" style={{ fontSize: "10px" }}>
                  Lifetime revenue
                </p>
                <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
                  €{selectedUser.lifetimeRevenue}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                disabled={saving === "grant-credits"}
                onClick={() => void runAction("grant-credits", { userId: selectedUser.userId, amount: 100 }, "100 credits granted.")}
                className="w-full border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                style={{ fontSize: "12px", fontWeight: 600 }}
              >
                Grant 100 credits
              </button>
              <button
                type="button"
                disabled={saving === "change-plan"}
                onClick={() => void runAction("change-plan", { userId: selectedUser.userId, plan: "Advanced Models" }, "Plan changed to Advanced.")}
                className="w-full border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                style={{ fontSize: "12px", fontWeight: 600 }}
              >
                Set Advanced plan
              </button>
              <button
                type="button"
                disabled={saving === "disable-user"}
                onClick={() => void runAction("disable-user", { userId: selectedUser.userId, reason: "Manual admin action" }, "User disabled.")}
                className="w-full border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                style={{ fontSize: "12px", fontWeight: 600 }}
              >
                Disable account
              </button>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
              Last active: {formatDate(selectedUser.lastActive)}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderRevenue = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            MRR
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            €{snapshot.overview.revenue.mrr}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Gross profit
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            €{snapshot.overview.revenue.grossProfit}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Margin
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            {snapshot.overview.revenue.grossMargin}%
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            ARPPU
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            €{snapshot.overview.revenue.avgRevenuePerPayingUser}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-foreground mb-2" style={{ fontSize: "14px", fontWeight: 600 }}>
          Revenue split
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Subscriptions
            </p>
            <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
              €{snapshot.overview.revenue.subscriptions}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Credit packs
            </p>
            <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
              €{snapshot.overview.revenue.creditPacks}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Revenue today
            </p>
            <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
              €{snapshot.overview.revenue.revenueToday}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsage = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Total generations
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            {snapshot.overview.usage.totalGenerations}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Success rate
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            {snapshot.overview.usage.successRate}%
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Avg latency
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            {snapshot.overview.usage.avgLatency}s
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            Errors
          </p>
          <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
            {snapshot.overview.usage.errors}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-foreground mb-2" style={{ fontSize: "14px", fontWeight: 600 }}>
          Module distribution
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Hub
            </p>
            <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
              {snapshot.overview.usage.hubGenerations}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Studio
            </p>
            <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
              {snapshot.overview.usage.studioGenerations}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Chat
            </p>
            <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
              {snapshot.overview.usage.chatGenerations}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderModels = () => (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-foreground mb-2" style={{ fontSize: "14px", fontWeight: 600 }}>
        Model performance
      </p>
      <div className="space-y-2">
        {snapshot.overview.modelStats.map((model) => (
          <div key={model.modelName} className="grid grid-cols-[1fr_80px_60px] gap-2">
            <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
              {model.modelName}
            </p>
            <p className="text-muted-foreground text-right" style={{ fontSize: "11px" }}>
              {model.calls} calls
            </p>
            <p className="text-muted-foreground text-right" style={{ fontSize: "11px" }}>
              {model.percentage}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContent = () => (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-foreground mb-2" style={{ fontSize: "14px", fontWeight: 600 }}>
        Top formats
      </p>
      <div className="space-y-2">
        {snapshot.overview.formatStats.map((format) => (
          <div key={format.label} className="grid grid-cols-[1fr_60px_60px] gap-2">
            <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
              {format.label}
            </p>
            <p className="text-muted-foreground text-right" style={{ fontSize: "11px" }}>
              {format.count}
            </p>
            <p className="text-muted-foreground text-right" style={{ fontSize: "11px" }}>
              {format.percentage}%
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStudio = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-card border border-border rounded-xl p-3">
        <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
          Studio users
        </p>
        <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
          {snapshot.overview.users.studioUsers}
        </p>
      </div>
      <div className="bg-card border border-border rounded-xl p-3">
        <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
          Active teams
        </p>
        <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
          {snapshot.overview.users.activeTeams}
        </p>
      </div>
      <div className="bg-card border border-border rounded-xl p-3">
        <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
          Studio generations
        </p>
        <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
          {snapshot.overview.usage.studioGenerations}
        </p>
      </div>
      <div className="bg-card border border-border rounded-xl p-3">
        <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
          Arena runs
        </p>
        <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
          {snapshot.overview.usage.arenaRuns}
        </p>
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
          Admin audit log
        </p>
        <button type="button" onClick={() => void exportCurrentSection()} className="inline-flex items-center gap-1.5 border border-border rounded-lg px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer" style={{ fontSize: "12px", fontWeight: 600 }}>
          <Download size={12} />
          Export CSV
        </button>
      </div>
      <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
        {snapshot.logs.map((log) => (
          <div key={log.id} className="border border-border rounded-lg p-3">
            <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
              {log.action}
            </p>
            <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
              {log.actorEmail} · {formatDate(log.ts)}
            </p>
            {log.targetUserId && (
              <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                Target: {log.targetUserId}
              </p>
            )}
            {log.details && (
              <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                {log.details}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-foreground mb-2" style={{ fontSize: "14px", fontWeight: 600 }}>
        Platform settings
      </p>
      <p className="text-muted-foreground mb-3" style={{ fontSize: "12px" }}>
        Core platform switches and model pricing controls are managed via environment variables and provider dashboards.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="border border-border rounded-lg p-3">
          <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
            Studio threshold
          </p>
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            `ASSET_STRICT_THRESHOLD`
          </p>
        </div>
        <div className="border border-border rounded-lg p-3">
          <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
            Brand leakage guard
          </p>
          <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
            `BRAND_LEAK_MAX_RATIO`
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background">
      <div className="max-w-[1320px] mx-auto px-6 py-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-foreground inline-flex items-center gap-2" style={{ fontSize: "26px", fontWeight: 600, letterSpacing: "-0.02em" }}>
              <Shield size={20} />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
              Real-time platform health, revenue, users and operations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-70 cursor-pointer"
            style={{ fontSize: "12px", fontWeight: 600 }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300/40 bg-red-500/10 px-3 py-2 mb-3">
            <p className="text-red-500" style={{ fontSize: "12px" }}>
              {error}
            </p>
          </div>
        )}
        {notice && (
          <div className="rounded-lg border border-ora-signal/40 bg-ora-signal-light px-3 py-2 mb-3">
            <p className="text-ora-signal" style={{ fontSize: "12px" }}>
              {notice}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-4">
          <aside className="bg-card border border-border rounded-xl p-3 h-fit">
            <div className="space-y-1">
              {sections.map((item) => {
                const active = section === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`block rounded-lg px-2.5 py-2 transition-colors ${
                      active ? "bg-ora-signal-light text-foreground border border-ora-signal/40" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                    style={{ fontSize: "12px", fontWeight: active ? 600 : 500 }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </aside>

          <main className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-muted-foreground inline-flex items-center gap-1.5" style={{ fontSize: "11px" }}>
                  <Users size={12} />
                  Users
                </p>
                <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
                  {snapshot.summary.totalUsers}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                  Active
                </p>
                <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
                  {snapshot.summary.activeUsers}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-muted-foreground inline-flex items-center gap-1.5" style={{ fontSize: "11px" }}>
                  <Wallet size={12} />
                  Revenue today
                </p>
                <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
                  €{snapshot.overview.revenue.revenueToday}
                </p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                  Gross margin
                </p>
                <p className="text-foreground" style={{ fontSize: "22px", fontWeight: 600 }}>
                  {snapshot.overview.revenue.grossMargin}%
                </p>
              </div>
            </div>

            {section === "/admin" && renderOverview()}
            {section === "/admin/users" && renderUsers()}
            {section === "/admin/revenue" && renderRevenue()}
            {section === "/admin/usage" && renderUsage()}
            {section === "/admin/models" && renderModels()}
            {section === "/admin/content" && renderContent()}
            {section === "/admin/studio" && renderStudio()}
            {section === "/admin/logs" && renderLogs()}
            {section === "/admin/settings" && renderSettings()}
          </main>
        </div>
      </div>
    </div>
  );
}
