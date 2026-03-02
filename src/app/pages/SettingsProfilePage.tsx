import { useEffect, useMemo, useState } from "react";
import { Shield, Trash2 } from "lucide-react";
import { getAccessToken } from "../lib/authToken";
import { useAuth } from "../lib/auth";
import { SettingsShell } from "../components/SettingsShell";

type SessionRow = {
  id: string;
  supabaseSessionId: string;
  deviceInfo?: { browser?: string; os?: string; device?: string };
  ipAddress?: string;
  city?: string;
  country?: string;
  createdAt?: string;
  lastActiveAt?: string;
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatDate(value?: string) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

export function SettingsProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [company, setCompany] = useState(profile?.company || "");
  const [roleLabel, setRoleLabel] = useState(profile?.role || "Creative Director");
  const [timezone, setTimezone] = useState(profile?.timezone || "Europe/Paris");
  const [language, setLanguage] = useState(profile?.language || "en");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || "");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(Boolean(profile?.twoFactorEnabled));
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const authHeaders = useMemo(() => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    setFullName(profile?.fullName || "");
    setCompany(profile?.company || "");
    setRoleLabel(profile?.role || "Creative Director");
    setTimezone(profile?.timezone || "Europe/Paris");
    setLanguage(profile?.language || "en");
    setAvatarUrl(profile?.avatarUrl || "");
    setTwoFactorEnabled(Boolean(profile?.twoFactorEnabled));
  }, [profile]);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/auth-sessions", {
        method: "GET",
        headers: {
          ...authHeaders,
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) return;
      setSessions(Array.isArray(payload?.sessions) ? payload.sessions : []);
      setCurrentSessionId(asText(payload?.currentSessionId));
    } catch (_error) {
      // ignore
    }
  };

  useEffect(() => {
    void fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          fullName,
          company,
          roleLabel,
          timezone,
          language,
          avatarUrl,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(asText(payload?.error) || "Unable to save profile.");
        return;
      }
      await refreshProfile();
      setNotice("Profile updated.");
    } catch (_error) {
      setError("Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const toggle2fa = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          action: "2fa",
          enabled: !twoFactorEnabled,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(asText(payload?.error) || "Unable to update 2FA.");
        return;
      }
      setTwoFactorEnabled(!twoFactorEnabled);
      await refreshProfile();
      setNotice(!twoFactorEnabled ? "2FA enabled." : "2FA disabled.");
    } catch (_error) {
      setError("Unable to update 2FA.");
    } finally {
      setSaving(false);
    }
  };

  const revokeSession = async (id: string) => {
    await fetch(`/api/auth-sessions?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders,
    });
    await fetchSessions();
  };

  const revokeOthers = async () => {
    await fetch("/api/auth-sessions?allOthers=1", {
      method: "DELETE",
      headers: authHeaders,
    });
    await fetchSessions();
  };

  const deleteAccount = async () => {
    if (!window.confirm("Delete your account permanently? This cannot be undone.")) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "DELETE",
        headers: authHeaders,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(asText(payload?.error) || "Unable to delete account.");
        return;
      }
      setNotice("Account disabled. Contact support for full deletion workflow.");
      await refreshProfile();
    } catch (_error) {
      setError("Unable to delete account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsShell title="Profile" description="Manage identity, security, sessions and account lifecycle.">
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
        <h2 className="text-foreground mb-4" style={{ fontSize: "15px", fontWeight: 600 }}>
          Profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-muted-foreground" style={{ fontSize: "12px" }}>
            Full name
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground" style={{ fontSize: "13px" }} />
          </label>
          <label className="text-muted-foreground" style={{ fontSize: "12px" }}>
            Email
            <input value={profile?.email || ""} disabled className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-muted-foreground" style={{ fontSize: "13px" }} />
          </label>
          <label className="text-muted-foreground" style={{ fontSize: "12px" }}>
            Company
            <input value={company} onChange={(event) => setCompany(event.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground" style={{ fontSize: "13px" }} />
          </label>
          <label className="text-muted-foreground" style={{ fontSize: "12px" }}>
            Role
            <input value={roleLabel} onChange={(event) => setRoleLabel(event.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground" style={{ fontSize: "13px" }} />
          </label>
          <label className="text-muted-foreground" style={{ fontSize: "12px" }}>
            Timezone
            <input value={timezone} onChange={(event) => setTimezone(event.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground" style={{ fontSize: "13px" }} />
          </label>
          <label className="text-muted-foreground" style={{ fontSize: "12px" }}>
            Language
            <input value={language} onChange={(event) => setLanguage(event.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground" style={{ fontSize: "13px" }} />
          </label>
          <label className="text-muted-foreground md:col-span-2" style={{ fontSize: "12px" }}>
            Avatar URL
            <input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground" style={{ fontSize: "13px" }} placeholder="https://..." />
          </label>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveProfile()}
          className="mt-4 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-70 cursor-pointer"
          style={{ fontSize: "13px", fontWeight: 600 }}
        >
          Save changes
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-foreground mb-4" style={{ fontSize: "15px", fontWeight: 600 }}>
          Security
        </h2>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => (window.location.href = "/reset-password")}
            className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            style={{ fontSize: "12px", fontWeight: 500 }}
          >
            Change password
          </button>
          <button
            type="button"
            onClick={() => void toggle2fa()}
            className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer inline-flex items-center gap-1.5"
            style={{ fontSize: "12px", fontWeight: 500 }}
          >
            <Shield size={13} />
            {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
          </button>
        </div>
        <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
          Two-factor status: {twoFactorEnabled ? "Enabled" : "Disabled"}.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-foreground" style={{ fontSize: "15px", fontWeight: 600 }}>
            Active sessions
          </h2>
          <button type="button" onClick={() => void revokeOthers()} className="text-ora-signal hover:opacity-80 transition-opacity cursor-pointer" style={{ fontSize: "12px", fontWeight: 600 }}>
            Revoke all other sessions
          </button>
        </div>
        <div className="space-y-2">
          {!sessions.length && (
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              No active sessions found.
            </p>
          )}
          {sessions.map((session) => (
            <div key={session.id} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                  {asText(session.deviceInfo?.browser)} · {asText(session.deviceInfo?.os)} · {asText(session.city) || "Unknown city"}
                  {session.supabaseSessionId === currentSessionId ? " · Current session" : ""}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                  Last active: {formatDate(session.lastActiveAt)}
                </p>
              </div>
              {session.supabaseSessionId !== currentSessionId && (
                <button
                  type="button"
                  onClick={() => void revokeSession(session.id)}
                  className="border border-border rounded-lg px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  style={{ fontSize: "11px", fontWeight: 600 }}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-red-300/40 rounded-xl p-5">
        <h2 className="text-foreground mb-2" style={{ fontSize: "15px", fontWeight: 600 }}>
          Danger zone
        </h2>
        <p className="text-muted-foreground mb-3" style={{ fontSize: "12px" }}>
          Permanently disable your account and remove access. This action cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => void deleteAccount()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 border border-red-300/50 rounded-lg px-3 py-2 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          style={{ fontSize: "12px", fontWeight: 600 }}
        >
          <Trash2 size={13} />
          Delete my account
        </button>
      </div>
    </SettingsShell>
  );
}

