import { getBearerToken, getSupabaseUserFromToken, nowIso, profileKey } from "../server/auth.js";
import { getRedisConfig, parseBody, redisGetJson, redisSetJson } from "../server/redis.js";

const MAX_LOGS = 2000;

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function logsKey(userId) {
  return `ora:user:generations:${userId}`;
}

function transactionsKey(userId) {
  return `ora:user:transactions:${userId}`;
}

function normalizeLog(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const module = ["hub", "studio", "chat"].includes(asText(entry.module).toLowerCase())
    ? asText(entry.module).toLowerCase()
    : "hub";
  const category = ["text", "image", "video", "code", "audio"].includes(asText(entry.category).toLowerCase())
    ? asText(entry.category).toLowerCase()
    : "text";
  const format = asText(entry.format) || "free-prompt";
  const modelId = asText(entry.modelId) || "unknown-model";
  const modelName = asText(entry.modelName) || modelId;
  const provider = asText(entry.provider) || "unknown";

  return {
    id: asText(entry.id) || `gen-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: asText(entry.createdAt) || nowIso(),
    module,
    category,
    format,
    modelId,
    modelName,
    provider: provider.toLowerCase(),
    credits: Math.max(0, Math.round(toNumber(entry.credits, 0))),
    latencyMs: Math.max(0, Math.round(toNumber(entry.latencyMs, 0))),
    status: asText(entry.status) || "success",
    compliance: Math.max(0, Math.min(100, Math.round(toNumber(entry.compliance, 0)))),
    channel: asText(entry.channel),
  };
}

function normalizeArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => normalizeLog(entry)).filter((entry) => Boolean(entry));
}

async function appendUsageTransaction(userId, totalCredits, details = "Usage") {
  const key = transactionsKey(userId);
  const previous = await redisGetJson(key, []);
  const tx = Array.isArray(previous) ? previous : [];
  const next = [
    {
      id: `txn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      type: "usage",
      description: details,
      amount: 0,
      credits: -Math.max(0, totalCredits),
      createdAt: nowIso(),
    },
    ...tx,
  ].slice(0, 500);
  await redisSetJson(key, next);
}

async function consumeCredits(userId, totalCredits) {
  if (totalCredits <= 0) return null;
  const current = await redisGetJson(profileKey(userId), null);
  if (!current || typeof current !== "object" || Array.isArray(current)) return null;
  const monthly = Math.max(0, toNumber(current.creditsMonthly, 0));
  const purchased = Math.max(0, toNumber(current.creditsPurchased, 0));
  let remaining = Math.max(0, Math.round(totalCredits));

  const monthlyAfter = Math.max(0, monthly - remaining);
  remaining = Math.max(0, remaining - monthly);
  const purchasedAfter = Math.max(0, purchased - remaining);

  const next = {
    ...current,
    creditsMonthly: monthlyAfter,
    creditsPurchased: purchasedAfter,
    credits: monthlyAfter + purchasedAfter,
    updatedAt: nowIso(),
  };
  await redisSetJson(profileKey(userId), next);
  return next;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!["GET", "POST"].includes(req.method || "")) {
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

  const key = logsKey(userId);
  const previous = normalizeArray(await redisGetJson(key, []));

  if (req.method === "GET") {
    res.status(200).json({ ok: true, logs: previous });
    return;
  }

  const body = parseBody(req.body) || {};
  const incoming = Array.isArray(body.entries) ? body.entries : [body.entry || body];
  const entries = incoming.map((entry) => normalizeLog(entry)).filter((entry) => Boolean(entry));
  if (!entries.length) {
    res.status(400).json({ ok: false, error: "No valid generation entries." });
    return;
  }

  const nextLogs = [...entries, ...previous].slice(0, MAX_LOGS);
  await redisSetJson(key, nextLogs);

  const totalCredits = entries.reduce((sum, entry) => sum + (entry?.credits || 0), 0);
  await consumeCredits(userId, totalCredits);
  await appendUsageTransaction(
    userId,
    totalCredits,
    `${entries.length} generation${entries.length > 1 ? "s" : ""} (${entries[0].module})`,
  );

  res.status(200).json({ ok: true, logs: nextLogs.slice(0, 100), consumedCredits: totalCredits });
}

