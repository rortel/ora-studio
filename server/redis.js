function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }
  return "";
}

function firstRestUrl(...values) {
  for (const value of values) {
    const text = asText(value);
    if (text && text.startsWith("https://")) return text;
  }
  return "";
}

export function getRedisConfig() {
  const url =
    firstRestUrl(
      process.env.UPSTASH_REDIS_REST_URL,
      process.env.KV_REST_API_URL,
      process.env.KV_REST_REDIS_URL,
      process.env.REDIS_REST_URL,
      process.env.REDIS_URL,
    ) ||
    firstNonEmpty(
      process.env.UPSTASH_REDIS_REST_URL,
      process.env.KV_REST_API_URL,
      process.env.KV_REST_REDIS_URL,
      process.env.REDIS_REST_URL,
      process.env.REDIS_URL,
    );
  let token = firstNonEmpty(
    process.env.UPSTASH_REDIS_REST_TOKEN,
    process.env.KV_REST_API_TOKEN,
    process.env.KV_REST_API_READ_ONLY_TOKEN,
    process.env.KV_REST_REDIS_TOKEN,
    process.env.REDIS_REST_TOKEN,
    process.env.REDIS_TOKEN,
  );

  const isRestUrl = url.startsWith("https://");
  if (isRestUrl && !token) {
    try {
      const parsed = new URL(url);
      token = asText(parsed.searchParams.get("token"));
    } catch (_error) {
      // no-op
    }
  }

  const enabled = Boolean(isRestUrl && token);
  return { url, token, enabled };
}

function buildRedisError(response, payload, fallbackMessage) {
  const message = asText(payload?.error) || asText(payload?.message) || fallbackMessage;
  const error = new Error(message);
  error.status = response.status;
  return error;
}

async function redisCommandViaPost(url, token, args) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw buildRedisError(response, payload, "Redis command failed");
  }
  return payload?.result ?? null;
}

async function redisCommandViaGet(url, token, args) {
  const command = args.map((arg) => encodeURIComponent(String(arg))).join("/");
  const response = await fetch(`${url}/${command}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw buildRedisError(response, payload, "Redis command failed");
  }
  return payload?.result ?? null;
}

export async function redisCommand(args) {
  const { url, token, enabled } = getRedisConfig();
  if (!enabled) {
    throw new Error("Redis is not configured");
  }
  if (!Array.isArray(args) || !args.length) {
    throw new Error("Redis command args must be a non-empty array");
  }

  try {
    return await redisCommandViaPost(url, token, args);
  } catch (error) {
    const status = Number(error?.status);
    if (status && ![404, 405].includes(status)) {
      throw error;
    }
    return redisCommandViaGet(url, token, args);
  }
}

export async function redisGetJson(key, fallback = null) {
  try {
    const raw = await redisCommand(["GET", key]);
    if (!raw) return fallback;
    if (typeof raw === "string") {
      return JSON.parse(raw);
    }
    return raw;
  } catch (_error) {
    return fallback;
  }
}

export async function redisSetJson(key, value, ttlSeconds = 0) {
  const args = ["SET", key, JSON.stringify(value)];
  const ttl = Math.floor(Number(ttlSeconds));
  if (Number.isFinite(ttl) && ttl > 0) {
    args.push("EX", ttl);
  }
  await redisCommand(args);
}

export function parseBody(body) {
  if (!body) return null;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch (_error) {
      return null;
    }
  }
  if (typeof body === "object") return body;
  return null;
}
