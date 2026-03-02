import { useEffect, useMemo, useState } from "react";
import { CreditCard, Download, Wallet } from "lucide-react";
import { getAccessToken } from "../lib/authToken";
import { SettingsShell } from "../components/SettingsShell";
import { useAuth } from "../lib/auth";

type BillingResponse = {
  currentPlan?: {
    id: string;
    label: string;
    price: number;
    nextBillingAt?: string;
    paymentMethod?: string;
  };
  credits?: {
    monthlyUsed: number;
    monthlyTotal: number;
    monthlyRemaining: number;
    purchased: number;
    total: number;
    resetAt?: string;
  };
  invoices?: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    currency: string;
    pdfUrl?: string;
  }>;
  creditPacks?: Array<{
    id: string;
    label: string;
    price: number;
    credits: number;
  }>;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString();
}

export function SettingsBillingPage() {
  const { refreshProfile } = useAuth();
  const [data, setData] = useState<BillingResponse>({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const authHeaders = useMemo(() => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/billing", {
        method: "GET",
        headers: authHeaders,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(asText(payload?.error) || "Unable to load billing.");
        return;
      }
      setData(payload || {});
    } catch (_error) {
      setError("Unable to load billing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runBillingAction = async (body: Record<string, unknown>, noticeMessage: string) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(asText(payload?.error) || "Action failed.");
        return;
      }
      setNotice(noticeMessage);
      await refreshProfile();
      await refresh();
    } catch (_error) {
      setError("Action failed.");
    } finally {
      setSaving(false);
    }
  };

  const credits = data.credits || { monthlyUsed: 0, monthlyTotal: 0, monthlyRemaining: 0, purchased: 0, total: 0 };
  const creditFill = credits.monthlyTotal > 0 ? Math.min(100, Math.round((credits.monthlyUsed / credits.monthlyTotal) * 100)) : 0;

  return (
    <SettingsShell title="Billing" description="Plan management, credits and invoices.">
      {error && (
        <div className="rounded-lg border border-red-300/40 bg-red-500/10 px-3 py-2">
          <p className="text-red-500" style={{ fontSize: "12px" }}>
            {error}
          </p>
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-ora-signal/40 bg-ora-signal-light px-3 py-2">
          <p className="text-ora-signal" style={{ fontSize: "12px" }}>
            {notice}
          </p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-foreground mb-3" style={{ fontSize: "15px", fontWeight: 600 }}>
          Current plan
        </h2>
        {loading ? (
          <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
            Loading billing...
          </p>
        ) : (
          <>
            <p className="text-foreground" style={{ fontSize: "16px", fontWeight: 600 }}>
              {data.currentPlan?.label || "Simple Generation"} — €{data.currentPlan?.price || 0}/month
            </p>
            <p className="text-muted-foreground mb-3" style={{ fontSize: "12px" }}>
              Next billing: {formatDate(data.currentPlan?.nextBillingAt)} · Payment: {data.currentPlan?.paymentMethod || "Visa •••• 4242"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={saving} onClick={() => void runBillingAction({ action: "change-plan", plan: "Simple Generation" }, "Plan changed to Simple Generation.")} className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer" style={{ fontSize: "12px", fontWeight: 500 }}>
                Simple (€19)
              </button>
              <button type="button" disabled={saving} onClick={() => void runBillingAction({ action: "change-plan", plan: "Advanced Models" }, "Plan changed to Advanced Models.")} className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer" style={{ fontSize: "12px", fontWeight: 500 }}>
                Advanced (€59)
              </button>
              <button type="button" disabled={saving} onClick={() => void runBillingAction({ action: "change-plan", plan: "Studio + Brand Vault" }, "Plan changed to Studio + Brand Vault.")} className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer" style={{ fontSize: "12px", fontWeight: 500 }}>
                Studio (€149)
              </button>
              <button type="button" disabled={saving} onClick={() => void runBillingAction({ action: "cancel" }, "Subscription canceled. You are now on Free plan.")} className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer inline-flex items-center gap-1.5" style={{ fontSize: "12px", fontWeight: 500 }}>
                <CreditCard size={12} />
                Cancel subscription
              </button>
            </div>
          </>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-foreground mb-3" style={{ fontSize: "15px", fontWeight: 600 }}>
          Credits
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-foreground mb-1" style={{ fontSize: "14px", fontWeight: 600 }}>
              {credits.total} credits left
            </p>
            <p className="text-muted-foreground mb-2" style={{ fontSize: "12px" }}>
              Monthly: {credits.monthlyRemaining}/{credits.monthlyTotal} · Purchased: {credits.purchased}
            </p>
            <div className="h-2 bg-secondary rounded-full overflow-hidden mb-2">
              <div className="h-full bg-ora-signal" style={{ width: `${creditFill}%` }} />
            </div>
            <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
              Resets: {formatDate(credits.resetAt)}
            </p>
          </div>
          <div className="space-y-2">
            {(data.creditPacks || []).map((pack) => (
              <button
                key={pack.id}
                type="button"
                disabled={saving}
                onClick={() => void runBillingAction({ action: "buy-credits", pack: pack.id }, `${pack.credits} credits added to your account.`)}
                className="w-full border border-border rounded-lg px-3 py-2 text-left hover:bg-secondary transition-colors cursor-pointer"
              >
                <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
                  {pack.label} — €{pack.price}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                  {pack.credits} credits · never expire
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-foreground mb-3" style={{ fontSize: "15px", fontWeight: 600 }}>
          Invoices
        </h2>
        <div className="space-y-2">
          {(data.invoices || []).length === 0 && (
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              No invoices yet.
            </p>
          )}
          {(data.invoices || []).map((invoice) => (
            <div key={invoice.id} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                  {invoice.description}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                  {formatDate(invoice.date)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                  €{invoice.amount}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const content = `Invoice ${invoice.id}\n${invoice.description}\n€${invoice.amount}`;
                    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${invoice.id}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="text-ora-signal hover:opacity-80 transition-opacity inline-flex items-center gap-1 mt-1 cursor-pointer"
                  style={{ fontSize: "11px", fontWeight: 600 }}
                >
                  <Download size={11} />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <p className="text-muted-foreground inline-flex items-center gap-1.5" style={{ fontSize: "11px" }}>
          <Wallet size={12} />
          Purchased credits never expire. Monthly credits reset each billing cycle.
        </p>
      </div>
    </SettingsShell>
  );
}

