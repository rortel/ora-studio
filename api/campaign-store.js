import { getBearerToken, getSupabaseUserFromToken, nowIso, profileKey } from "../server/auth.js";
import { getRedisConfig, parseBody, redisGetJson, redisSetJson } from "../server/redis.js";

const LEGACY_STORE_KEY = process.env.CAMPAIGN_STORE_KEY || "ora:campaign-store:v1";
const USER_STORE_PREFIX = process.env.CAMPAIGN_USER_STORE_PREFIX || "ora:campaign-store:user";

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function emptyStore() {
  return { campaigns: [], folders: [] };
}

function normalizeStore(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyStore();
  const campaigns = Array.isArray(value.campaigns) ? value.campaigns : [];
  const folders = Array.isArray(value.folders) ? value.folders : [];
  return { campaigns, folders };
}

function storeKeyForUser(userId) {
  return `${USER_STORE_PREFIX}:${userId}:v2`;
}

function computeCounters(store) {
  const campaigns = Array.isArray(store?.campaigns) ? store.campaigns : [];
  const campaignCount = campaigns.length;
  const pieceCount = campaigns.reduce((sum, campaign) => {
    const pieces = typeof campaign?.pieces === "number" ? campaign.pieces : Array.isArray(campaign?.assets) ? campaign.assets.length : 0;
    return sum + (Number.isFinite(pieces) ? pieces : 0);
  }, 0);
  return { campaignCount, pieceCount };
}

async function loadStoreForUser(userId) {
  const redis = getRedisConfig();
  if (!redis.enabled) return { store: emptyStore(), source: "local-fallback" };

  const userKey = storeKeyForUser(userId);
  const userStore = await redisGetJson(userKey, null);
  if (userStore) {
    return { store: normalizeStore(userStore), source: "redis-user" };
  }

  const legacyStore = await redisGetJson(LEGACY_STORE_KEY, null);
  const normalizedLegacy = normalizeStore(legacyStore);
  if (normalizedLegacy.campaigns.length || normalizedLegacy.folders.length) {
    await redisSetJson(userKey, normalizedLegacy);
    return { store: normalizedLegacy, source: "redis-legacy-migrated" };
  }

  return { store: emptyStore(), source: "redis-user-empty" };
}

async function syncProfileCounters(userId, store) {
  const redis = getRedisConfig();
  if (!redis.enabled) return;

  const key = profileKey(userId);
  const profile = await redisGetJson(key, null);
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return;

  const counters = computeCounters(store);
  const nextProfile = {
    ...profile,
    campaignCount: counters.campaignCount,
    pieceCount: counters.pieceCount,
    updatedAt: nowIso(),
  };

  await redisSetJson(key, nextProfile);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET" && req.method !== "PUT" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
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

  if (req.method === "GET") {
    const result = await loadStoreForUser(userId);
    res.status(200).json({
      ok: true,
      userId,
      store: result.store,
      source: result.source,
    });
    return;
  }

  const payload = parseBody(req.body);
  const store = normalizeStore(payload?.store);
  const redis = getRedisConfig();

  if (!redis.enabled) {
    res.status(200).json({
      ok: true,
      userId,
      store,
      source: "local-fallback",
    });
    return;
  }

  try {
    await redisSetJson(storeKeyForUser(userId), store);
    await syncProfileCounters(userId, store);
    res.status(200).json({
      ok: true,
      userId,
      store,
      source: "redis-user",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Redis write failed",
    });
  }
}
