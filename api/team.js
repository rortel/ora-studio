import { getBearerToken, getSupabaseUserFromToken, profileKey } from "../server/auth.js";
import { getRedisConfig, parseBody, redisGetJson, redisSetJson } from "../server/redis.js";

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nowIso() {
  return new Date().toISOString();
}

function teamKey(ownerId) {
  return `ora:team:${ownerId}`;
}

function hasStudioPlan(subscription) {
  const value = asText(subscription).toLowerCase();
  return value.includes("studio") || value.includes("enterprise");
}

function normalizeTeam(value, owner) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    const ownerName = asText(owner?.fullName || owner?.email || "Owner");
    return {
      id: `team-${owner.userId}`,
      name: asText(owner.company) || `${ownerName}'s Team`,
      ownerId: owner.userId,
      plan: "studio",
      maxSeats: 5,
      createdAt: nowIso(),
      members: [
        {
          id: `member-${owner.userId}`,
          userId: owner.userId,
          email: owner.email,
          fullName: owner.fullName || owner.email,
          role: "admin",
          vaultAccess: ["all"],
          status: "active",
          joinedAt: nowIso(),
        },
      ],
      invitations: [],
    };
  }
  const members = Array.isArray(value.members) ? value.members : [];
  const invitations = Array.isArray(value.invitations) ? value.invitations : [];
  return {
    ...value,
    members,
    invitations,
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!["GET", "POST", "PUT", "DELETE"].includes(req.method || "")) {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const redis = getRedisConfig();
  if (!redis.enabled) {
    res.status(503).json({ error: "Redis is not configured" });
    return;
  }

  const token = getBearerToken(req);
  const auth = await getSupabaseUserFromToken(token);
  if (!auth.ok) {
    res.status(401).json({ error: auth.error || "Unauthorized" });
    return;
  }

  const userId = asText(auth.user?.id);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profile = await redisGetJson(profileKey(userId), null);
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  if (!hasStudioPlan(profile.subscription)) {
    res.status(403).json({ ok: false, error: "Team is available on Studio plan only." });
    return;
  }

  const key = teamKey(userId);
  const currentTeam = normalizeTeam(await redisGetJson(key, null), {
    userId,
    email: profile.email,
    fullName: profile.fullName,
    company: profile.company,
  });

  if (req.method === "GET") {
    await redisSetJson(key, currentTeam);
    res.status(200).json({ ok: true, team: currentTeam });
    return;
  }

  const body = parseBody(req.body) || {};
  const action = asText(body.action);

  if (action === "invite") {
    const email = asText(body.email).toLowerCase();
    if (!email.includes("@")) {
      res.status(400).json({ ok: false, error: "Valid email is required." });
      return;
    }
    const role = ["admin", "approver", "editor"].includes(asText(body.role).toLowerCase())
      ? asText(body.role).toLowerCase()
      : "editor";
    const vaultAccess = Array.isArray(body.vaultAccess) ? body.vaultAccess.map((entry) => asText(entry)).filter(Boolean) : [];
    const invitation = {
      id: `invite-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      email,
      role,
      vaultAccess,
      status: "pending",
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    const next = {
      ...currentTeam,
      invitations: [invitation, ...currentTeam.invitations].slice(0, 100),
    };
    await redisSetJson(key, next);
    res.status(200).json({ ok: true, team: next });
    return;
  }

  if (action === "update-member") {
    const memberId = asText(body.memberId);
    const role = ["admin", "approver", "editor"].includes(asText(body.role).toLowerCase())
      ? asText(body.role).toLowerCase()
      : "";
    const vaultAccess = Array.isArray(body.vaultAccess) ? body.vaultAccess.map((entry) => asText(entry)).filter(Boolean) : null;
    const next = {
      ...currentTeam,
      members: currentTeam.members.map((member) => {
        if (member.id !== memberId) return member;
        return {
          ...member,
          role: role || member.role,
          vaultAccess: vaultAccess || member.vaultAccess,
        };
      }),
    };
    await redisSetJson(key, next);
    res.status(200).json({ ok: true, team: next });
    return;
  }

  if (action === "remove-member") {
    const memberId = asText(body.memberId);
    const next = {
      ...currentTeam,
      members: currentTeam.members.filter((member) => member.id !== memberId || member.userId === userId),
    };
    await redisSetJson(key, next);
    res.status(200).json({ ok: true, team: next });
    return;
  }

  if (action === "revoke-invite") {
    const invitationId = asText(body.invitationId);
    const next = {
      ...currentTeam,
      invitations: currentTeam.invitations.filter((invitation) => invitation.id !== invitationId),
    };
    await redisSetJson(key, next);
    res.status(200).json({ ok: true, team: next });
    return;
  }

  res.status(400).json({ ok: false, error: "Unknown team action" });
}

