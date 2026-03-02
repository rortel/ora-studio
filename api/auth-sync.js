import {
  getBearerToken,
  getSupabaseUserFromToken,
  isAdminEmail,
  normalizeEmail,
  nowIso,
  profileKey,
  USER_INDEX_KEY,
} from "../server/auth.js";
import { getRedisConfig, parseBody, redisGetJson, redisSetJson } from "../server/redis.js";

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUserProfile(user, existing, defaults) {
  const createdAt = asText(existing?.createdAt) || defaults.createdAt;
  const firstName =
    asText(user?.user_metadata?.full_name) ||
    asText(user?.user_metadata?.name) ||
    asText(existing?.fullName) ||
    "";

  const role = defaults.forceAdmin ? "admin" : "client";
  const subscription =
    role === "admin"
      ? asText(existing?.subscription) || defaults.subscription || "Studio + Brand Vault"
      : asText(existing?.subscription) || defaults.subscription || "Simple Generation";
  const creditsMonthly =
    typeof existing?.creditsMonthly === "number"
      ? existing.creditsMonthly
      : typeof existing?.credits_monthly === "number"
        ? existing.credits_monthly
        : defaults.creditsMonthly;
  const creditsPurchased =
    typeof existing?.creditsPurchased === "number"
      ? existing.creditsPurchased
      : typeof existing?.credits_purchased === "number"
        ? existing.credits_purchased
        : defaults.creditsPurchased;
  const credits =
    typeof existing?.credits === "number" ? existing.credits : Math.max(0, Number(creditsMonthly || 0) + Number(creditsPurchased || 0));

  return {
    userId: asText(user?.id),
    email: normalizeEmail(user?.email || ""),
    fullName: firstName,
    company: asText(existing?.company) || "",
    timezone: asText(existing?.timezone) || "Europe/Paris",
    language: asText(existing?.language) || "en",
    avatarUrl: asText(existing?.avatarUrl || existing?.avatar_url) || "",
    twoFactorEnabled: Boolean(existing?.twoFactorEnabled || existing?.two_factor_enabled),
    isAdmin: role === "admin",
    role,
    status: asText(existing?.status) || "active",
    subscription,
    credits,
    creditsMonthly,
    creditsPurchased,
    organizationId: asText(existing?.organizationId) || "",
    organizationName: asText(existing?.organizationName) || "",
    campaignCount: typeof existing?.campaignCount === "number" ? existing.campaignCount : 0,
    pieceCount: typeof existing?.pieceCount === "number" ? existing.pieceCount : 0,
    createdAt,
    updatedAt: nowIso(),
    lastLoginAt: nowIso(),
  };
}

async function ensureUserProfile(user) {
  const redis = getRedisConfig();
  const userId = asText(user?.id);
  const email = normalizeEmail(user?.email || "");
  const key = profileKey(userId);

  const usersIndex = redis.enabled ? (await redisGetJson(USER_INDEX_KEY, [])) : [];
  const safeIndex = Array.isArray(usersIndex) ? usersIndex.filter((id) => typeof id === "string" && id.trim()) : [];

  const existing = redis.enabled ? await redisGetJson(key, null) : null;
  const forcedAdmin = isAdminEmail(email);
  const defaults = {
    forceAdmin: forcedAdmin,
    role: forcedAdmin ? "admin" : "client",
    subscription: forcedAdmin ? "Studio + Brand Vault" : "Simple Generation",
    creditsMonthly: forcedAdmin ? 4000 : 50,
    creditsPurchased: 0,
    createdAt: nowIso(),
  };

  const profile = normalizeUserProfile(user, existing, defaults);

  if (redis.enabled) {
    await redisSetJson(key, profile);
    if (!safeIndex.includes(userId)) {
      await redisSetJson(USER_INDEX_KEY, [userId, ...safeIndex]);
    }
  }

  return profile;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = getBearerToken(req);
  const auth = await getSupabaseUserFromToken(token);
  if (!auth.ok) {
    res.status(401).json({ error: auth.error || "Unauthorized" });
    return;
  }

  const body = parseBody(req.body) || {};
  const action = asText(body.action || "sync");
  const profile = await ensureUserProfile(auth.user);

  if (action === "update-profile") {
    const patchName = asText(body.fullName);
    if (patchName) {
      profile.fullName = patchName;
      profile.updatedAt = nowIso();
      const redis = getRedisConfig();
      if (redis.enabled) {
        await redisSetJson(profileKey(profile.userId), profile);
      }
    }
  }

  res.status(200).json({
    ok: true,
    user: {
      id: profile.userId,
      email: profile.email,
    },
    profile,
  });
}
