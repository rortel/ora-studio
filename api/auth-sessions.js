import { getBearerToken, getSupabaseUserFromToken } from "../server/auth.js";
import { getRedisConfig, redisGetJson, redisSetJson } from "../server/redis.js";

const MAX_SESSIONS = 20;

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nowIso() {
  return new Date().toISOString();
}

function sessionKey(userId) {
  return `ora:user:sessions:${userId}`;
}

function sessionFromToken(token) {
  if (!token) return "";
  return token.slice(-16);
}

function parseDeviceInfo(userAgent) {
  const raw = asText(userAgent).toLowerCase();
  const browser =
    raw.includes("chrome") ? "Chrome" : raw.includes("safari") ? "Safari" : raw.includes("firefox") ? "Firefox" : "Unknown";
  const os =
    raw.includes("mac os") || raw.includes("macintosh")
      ? "macOS"
      : raw.includes("windows")
        ? "Windows"
        : raw.includes("iphone") || raw.includes("ios")
          ? "iOS"
          : raw.includes("android")
            ? "Android"
            : "Unknown";
  const device = raw.includes("mobile") || raw.includes("iphone") || raw.includes("android") ? "mobile" : "desktop";
  return { browser, os, device };
}

function normalizeSession(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  return {
    id: asText(entry.id),
    supabaseSessionId: asText(entry.supabaseSessionId),
    deviceInfo: entry.deviceInfo && typeof entry.deviceInfo === "object" ? entry.deviceInfo : {},
    ipAddress: asText(entry.ipAddress),
    city: asText(entry.city),
    country: asText(entry.country),
    createdAt: asText(entry.createdAt),
    lastActiveAt: asText(entry.lastActiveAt),
    revokedAt: asText(entry.revokedAt),
  };
}

function sanitizeSessions(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => normalizeSession(entry)).filter((entry) => Boolean(entry));
}

function requesterIp(req) {
  const raw = asText(req.headers["x-forwarded-for"] || "");
  if (!raw) return "";
  return raw.split(",")[0].trim();
}

async function ensureCurrentSession(userId, token, req) {
  const key = sessionKey(userId);
  const previous = sanitizeSessions(await redisGetJson(key, []));
  const sessionId = sessionFromToken(token);
  const existing = previous.find((entry) => entry.supabaseSessionId === sessionId && !entry.revokedAt);

  const nextSession = {
    id: existing?.id || `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    supabaseSessionId: sessionId,
    deviceInfo: parseDeviceInfo(req.headers["user-agent"] || ""),
    ipAddress: requesterIp(req),
    city: asText(existing?.city),
    country: asText(existing?.country),
    createdAt: existing?.createdAt || nowIso(),
    lastActiveAt: nowIso(),
    revokedAt: "",
  };

  const withoutCurrent = previous.filter((entry) => entry.supabaseSessionId !== sessionId);
  const next = [nextSession, ...withoutCurrent].slice(0, MAX_SESSIONS);
  await redisSetJson(key, next);
  return next;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!["GET", "DELETE"].includes(req.method || "")) {
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

  const key = sessionKey(userId);
  const sessions = await ensureCurrentSession(userId, token, req);
  const currentSessionId = sessionFromToken(token);

  if (req.method === "GET") {
    res.status(200).json({
      ok: true,
      sessions: sessions.filter((entry) => !entry.revokedAt),
      currentSessionId,
    });
    return;
  }

  const url = new URL(req.url, `https://${req.headers.host || "ora.local"}`);
  const id = asText(url.searchParams.get("id"));
  const revokeOthers = url.searchParams.get("allOthers") === "1";
  const stamp = nowIso();
  const next = sessions.map((entry) => {
    if (entry.revokedAt) return entry;
    if (revokeOthers) {
      return entry.supabaseSessionId === currentSessionId ? entry : { ...entry, revokedAt: stamp };
    }
    if (id && entry.id === id) {
      return { ...entry, revokedAt: stamp };
    }
    return entry;
  });
  await redisSetJson(key, next);

  res.status(200).json({
    ok: true,
    sessions: next.filter((entry) => !entry.revokedAt),
    currentSessionId,
  });
}

