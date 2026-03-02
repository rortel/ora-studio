import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Users } from "lucide-react";
import { getAccessToken } from "../lib/authToken";
import { SettingsShell } from "../components/SettingsShell";
import { useAuth } from "../lib/auth";
import { hasStudioAccess } from "../lib/studioAccess";
import { Link } from "react-router";

type TeamMember = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: "admin" | "approver" | "editor";
  vaultAccess: string[];
  status: "active" | "inactive";
};

type TeamInvitation = {
  id: string;
  email: string;
  role: "admin" | "approver" | "editor";
  status: string;
  createdAt: string;
  expiresAt: string;
};

type TeamPayload = {
  id: string;
  name: string;
  maxSeats: number;
  members: TeamMember[];
  invitations: TeamInvitation[];
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

export function SettingsTeamPage() {
  const { profile } = useAuth();
  const [team, setTeam] = useState<TeamPayload | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "approver" | "editor">("editor");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const authHeaders = useMemo(() => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/team", {
        method: "GET",
        headers: authHeaders,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(asText(payload?.error) || "Unable to load team.");
        return;
      }
      setTeam(payload?.team || null);
    } catch (_error) {
      setError("Unable to load team.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasStudioAccess(profile?.subscription)) {
      void refresh();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.subscription]);

  const runAction = async (action: string, body: Record<string, unknown>) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ action, ...body }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(asText(payload?.error) || "Action failed.");
        return;
      }
      setTeam(payload?.team || null);
      setNotice("Team updated.");
    } catch (_error) {
      setError("Action failed.");
    } finally {
      setSaving(false);
    }
  };

  if (!hasStudioAccess(profile?.subscription)) {
    return (
      <SettingsShell title="Team" description="Team management is available on Studio plan.">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-foreground mb-2" style={{ fontSize: "16px", fontWeight: 600 }}>
            Upgrade to Studio to unlock team workflows
          </p>
          <p className="text-muted-foreground mb-4" style={{ fontSize: "13px" }}>
            Invite editors and approvers, share vaults, and centralize approvals.
          </p>
          <Link to="/pricing" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity" style={{ fontSize: "13px", fontWeight: 600 }}>
            Upgrade to Studio
          </Link>
        </div>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell title="Team" description="Manage seats, members and invitations.">
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-foreground inline-flex items-center gap-2" style={{ fontSize: "15px", fontWeight: 600 }}>
            <Users size={15} />
            Team overview
          </h2>
          <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-1.5 border border-border rounded-lg px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer" style={{ fontSize: "12px", fontWeight: 500 }}>
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
            Loading team...
          </p>
        ) : (
          <>
            <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
              {team?.name || "Team"} — {team?.members?.length || 0}/{team?.maxSeats || 5} seats used
            </p>
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Your plan: Studio · Shared wallet and approvals enabled.
            </p>
          </>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-foreground mb-3" style={{ fontSize: "15px", fontWeight: 600 }}>
          Members
        </h2>
        <div className="space-y-2">
          {(team?.members || []).map((member) => (
            <div key={member.id} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                  {member.fullName || member.email}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                  {member.email} · {member.role}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={(event) => void runAction("update-member", { memberId: member.id, role: event.target.value })}
                  className="bg-background border border-border rounded-md px-2 py-1.5 text-foreground"
                  style={{ fontSize: "11px" }}
                >
                  <option value="admin">Admin</option>
                  <option value="approver">Approver</option>
                  <option value="editor">Editor</option>
                </select>
                {member.userId !== profile?.userId && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void runAction("remove-member", { memberId: member.id })}
                    className="border border-border rounded-md px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    style={{ fontSize: "11px", fontWeight: 600 }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-foreground mb-3" style={{ fontSize: "15px", fontWeight: 600 }}>
          Invite member
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@company.com" className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50" style={{ fontSize: "13px" }} />
          <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "admin" | "approver" | "editor")} className="bg-background border border-border rounded-lg px-3 py-2 text-foreground" style={{ fontSize: "13px" }}>
            <option value="editor">Editor</option>
            <option value="approver">Approver</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="button"
            disabled={saving || !inviteEmail.trim()}
            onClick={() => {
              void runAction("invite", { email: inviteEmail.trim(), role: inviteRole });
              setInviteEmail("");
            }}
            className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-70"
            style={{ fontSize: "13px", fontWeight: 600 }}
          >
            <Plus size={13} />
            Invite
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-foreground mb-3" style={{ fontSize: "15px", fontWeight: 600 }}>
          Pending invitations
        </h2>
        <div className="space-y-2">
          {(team?.invitations || []).length === 0 && (
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              No pending invitations.
            </p>
          )}
          {(team?.invitations || []).map((invitation) => (
            <div key={invitation.id} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                  {invitation.email}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                  {invitation.role} · Sent {formatDate(invitation.createdAt)} · Expires {formatDate(invitation.expiresAt)}
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void runAction("revoke-invite", { invitationId: invitation.id })}
                className="border border-border rounded-md px-2 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                style={{ fontSize: "11px", fontWeight: 600 }}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      </div>
    </SettingsShell>
  );
}

