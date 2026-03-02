import { getBearerToken, getSupabaseUserFromToken, isAdminEmail, normalizeEmail, nowIso, profileKey, USER_INDEX_KEY } from "../server/auth.js";
import { getRedisConfig, parseBody, redisGetJson, redisSetJson } from "../server/redis.js";

const ALLOWED_ROLE_LABELS = new Set([
  "Creative Director",
  "Brand Lead",
  "Founder",
  "CMO",
  "Head of Content",
  "Marketing Manager",
  "Designer",
  "Editor",
  "Approver",
  "Admin",
]);

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return fallback;
}

function nowPlusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function normalizeProfileRecord(user, existing) {
  const email = normalizeEmail(user?.email || existing?.email || "");
  const fullName =
    asText(existing?.fullName) ||
    asText(user?.user_metadata?.full_name || user?.user_metadata?.name) ||
    "";
  const forcedAdmin = isAdminEmail(email);
  const existingRole = asText(existing?.role || "client").toLowerCase();
  const role = forcedAdmin ? "admin" : existingRole === "admin" ? "client" : existingRole || "client";
  const creditsMonthly =
    typeof existing?.creditsMonthly === "number"
      ? existing.creditsMonthly
      : typeof existing?.credits_monthly === "number"
        ? existing.credits_monthly
        : forcedAdmin
          ? 4000
          : 50;
  const creditsPurchased =
    typeof existing?.creditsPurchased === "number"
      ? existing.creditsPurchased
      : typeof existing?.credits_purchased === "number"
        ? existing.credits_purchased
        : 0;
  const credits = typeof existing?.credits === "number" ? existing.credits : Math.max(0, creditsMonthly + creditsPurchased);

  return {
    userId: asText(user?.id || existing?.userId),
    email,
    fullName,
    company: asText(existing?.company),
    roleLabel: ALLOWED_ROLE_LABELS.has(asText(existing?.roleLabel)) ? asText(existing?.roleLabel) : "Creative Director",
    timezone: asText(existing?.timezone) || "Europe/Paris",
    language: asText(existing?.language) || "en",
    avatarUrl: asText(existing?.avatarUrl || existing?.avatar_url),
    twoFactorEnabled: toBool(existing?.twoFactorEnabled || existing?.two_factor_enabled, false),
    isAdmin: forcedAdmin,
    role,
    status: asText(existing?.status) || "active",
    subscription: asText(existing?.subscription) || (forcedAdmin ? "Studio + Brand Vault" : "Simple Generation"),
    credits,
    creditsMonthly,
    creditsPurchased,
    creditsMonthlyLimit:
      typeof existing?.creditsMonthlyLimit === "number"
        ? existing.creditsMonthlyLimit
        : forcedAdmin
          ? 4000
          : asText(existing?.subscription).toLowerCase().includes("advanced")
            ? 1500
            : 500,
    creditsResetAt: asText(existing?.creditsResetAt) || nowPlusDays(30),
    organizationId: asText(existing?.organizationId),
    organizationName: asText(existing?.organizationName),
    campaignCount: typeof existing?.campaignCount === "number" ? existing.campaignCount : 0,
    pieceCount: typeof existing?.pieceCount === "number" ? existing.pieceCount : 0,
    createdAt: asText(existing?.createdAt) || nowIso(),
    updatedAt: nowIso(),
    lastLoginAt: asText(existing?.lastLoginAt) || nowIso(),
    deletedAt: asText(existing?.deletedAt) || "",
  };
}

async function ensureProfile(user) {
  const redis = getRedisConfig();
  if (!redis.enabled) return null;

  const userId = asText(user?.id);
  if (!userId) return null;
  const key = profileKey(userId);
  const existing = await redisGetJson(key, null);
  const profile = normalizeProfileRecord(user, existing || {});
  await redisSetJson(key, profile);

  const index = await redisGetJson(USER_INDEX_KEY, []);
  const safeIndex = Array.isArray(index) ? index.map((entry) => asText(entry)).filter(Boolean) : [];
  if (!safeIndex.includes(userId)) {
    await redisSetJson(USER_INDEX_KEY, [userId, ...safeIndex]);
  }

  return profile;
}

function sanitizePatch(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const patch = {};
  const fullName = asText(payload.fullName);
  const company = asText(payload.company);
  const roleLabel = asText(payload.roleLabel);
  const timezone = asText(payload.timezone);
  const language = asText(payload.language);
  const avatarUrl = asText(payload.avatarUrl);
  const organizationName = asText(payload.organizationName);

  if (fullName) patch.fullName = fullName;
  patch.company = company;
  if (roleLabel && ALLOWED_ROLE_LABELS.has(roleLabel)) patch.roleLabel = roleLabel;
  if (timezone) patch.timezone = timezone;
  if (language) patch.language = language;
  if (avatarUrl || avatarUrl === "") patch.avatarUrl = avatarUrl;
  if (organizationName || organizationName === "") patch.organizationName = organizationName;
  return patch;
}

function buildFallbackProfile(user) {
  return normalizeProfileRecord(user, {});
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!["GET", "PUT", "DELETE"].includes(req.method || "")) {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const redis = getRedisConfig();

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

  if (!redis.enabled) {
    const fallback = buildFallbackProfile(auth.user);

    if (req.method === "GET") {
      res.status(200).json({ ok: true, profile: fallback, storage: "fallback" });
      return;
    }

    if (req.method === "DELETE") {
      res.status(200).json({
        ok: true,
        profile: { ...fallback, status: "disabled", deletedAt: nowIso(), updatedAt: nowIso() },
        storage: "fallback",
      });
      return;
    }

    const payload = parseBody(req.body) || {};
    const action = asText(payload.action);

    if (action === "password") {
      const password = asText(payload.password);
      if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        res.status(400).json({ ok: false, error: "Password must be at least 8 chars with 1 uppercase and 1 number." });
        return;
      }
      res.status(200).json({ ok: true, message: "Password policy validated. Update is managed by Supabase Auth.", storage: "fallback" });
      return;
    }

    const patch = sanitizePatch(payload);
    res.status(200).json({
      ok: true,
      profile: {
        ...fallback,
        ...patch,
        twoFactorEnabled: action === "2fa" ? toBool(payload.enabled, false) : fallback.twoFactorEnabled,
        updatedAt: nowIso(),
      },
      storage: "fallback",
    });
    return;
  }

  const current = await ensureProfile(auth.user);
  if (!current) {
    res.status(500).json({ error: "Unable to load profile" });
    return;
  }

  if (req.method === "GET") {
    res.status(200).json({ ok: true, profile: current });
    return;
  }

  if (req.method === "DELETE") {
    const next = {
      ...current,
      status: "disabled",
      deletedAt: nowIso(),
      updatedAt: nowIso(),
    };
    await redisSetJson(profileKey(userId), next);
    res.status(200).json({ ok: true, profile: next });
    return;
  }

  const payload = parseBody(req.body) || {};
  const action = asText(payload.action);

  if (action === "password") {
    const password = asText(payload.password);
    if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      res.status(400).json({ ok: false, error: "Password must be at least 8 chars with 1 uppercase and 1 number." });
      return;
    }
    res.status(200).json({ ok: true, message: "Password policy validated. Update is managed by Supabase Auth." });
    return;
  }

  if (action === "2fa") {
    const enabled = toBool(payload.enabled, false);
    const next = {
      ...current,
      twoFactorEnabled: enabled,
      updatedAt: nowIso(),
    };
    await redisSetJson(profileKey(userId), next);
    res.status(200).json({ ok: true, profile: next });
    return;
  }

  const patch = sanitizePatch(payload);
  const next = {
    ...current,
    ...patch,
    updatedAt: nowIso(),
  };
  await redisSetJson(profileKey(userId), next);
  res.status(200).json({ ok: true, profile: next });
}
