import { getBearerToken, getSupabaseUserFromToken, profileKey } from "../server/auth.js";
import { getRedisConfig, redisGetJson } from "../server/redis.js";

const RETAIL_COSTS = {
  google: 20,
  openai: 20,
  anthropic: 20,
  mistral: 15,
  llama: 10,
  replicate: 10,
  runway: 15,
  default: 10,
};

const TOOL_COSTS = {
  image: 10,
  video: 15,
  audio: 11,
};

const MINUTES_BY_FORMAT = {
  "linkedin-post": 25,
  email: 20,
  "blog-post": 90,
  ad: 30,
  newsletter: 45,
  "instagram-caption": 15,
  tweet: 10,
  "free-prompt": 15,
};

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeReplicateModelSlug(value) {
  const raw = asText(value)
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[.,;:]+$/g, "")
    .replace(/^\/+|\/+$/g, "");
  if (!raw) return "";
  if (!raw.includes("://")) {
    return raw.includes("/") ? raw : "";
  }
  try {
    const parsed = new URL(raw);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const modelsIndex = parts.findIndex((part) => part === "models");
    if (modelsIndex >= 0 && parts.length >= modelsIndex + 3) {
      return `${parts[modelsIndex + 1]}/${parts[modelsIndex + 2]}`;
    }
    if (parts.length >= 2) return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`.replace(/[.,;:]+$/g, "");
    return "";
  } catch (_error) {
    return raw.includes("/") ? raw : "";
  }
}

function uniqueNonEmpty(values) {
  return Array.from(new Set(values.map((item) => normalizeReplicateModelSlug(item)).filter(Boolean)));
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function generationKey(userId) {
  return `ora:user:generations:${userId}`;
}

function inCurrentMonth(iso) {
  if (!iso) return false;
  const now = new Date();
  const date = new Date(iso);
  return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
}

function normalizeLogs(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      return {
        id: asText(entry.id),
        createdAt: asText(entry.createdAt),
        module: asText(entry.module) || "hub",
        category: asText(entry.category) || "text",
        format: asText(entry.format) || "free-prompt",
        modelId: asText(entry.modelId) || "unknown",
        modelName: asText(entry.modelName) || "Unknown model",
        provider: asText(entry.provider).toLowerCase() || "unknown",
        credits: Math.max(0, Math.round(toNumber(entry.credits, 0))),
        status: asText(entry.status) || "success",
        compliance: toNumber(entry.compliance, 0),
      };
    })
    .filter((entry) => Boolean(entry));
}

function computeSavings(logs, planPrice) {
  const monthLogs = logs.filter((entry) => inCurrentMonth(entry.createdAt));
  const providers = new Set(monthLogs.map((entry) => entry.provider));
  const categories = new Set(monthLogs.map((entry) => entry.category));

  let separate = 0;
  providers.forEach((provider) => {
    separate += RETAIL_COSTS[provider] || RETAIL_COSTS.default;
  });
  categories.forEach((category) => {
    if (category !== "text" && category !== "code") {
      separate += TOOL_COSTS[category] || 0;
    }
  });
  return Math.max(0, Math.round((separate - planPrice) * 100) / 100);
}

function computeTimeSaved(logs) {
  const monthLogs = logs.filter((entry) => inCurrentMonth(entry.createdAt));
  const totalMinutes = monthLogs.reduce((sum, entry) => {
    const byFormat = MINUTES_BY_FORMAT[entry.format];
    const fallback =
      entry.category === "image" ? 20 : entry.category === "video" ? 60 : entry.category === "code" ? 30 : entry.category === "audio" ? 15 : 15;
    return sum + (byFormat || fallback);
  }, 0);
  return Math.round((totalMinutes * 0.7) / 60 * 10) / 10;
}

function groupByDay(logs) {
  const map = new Map();
  logs
    .filter((entry) => inCurrentMonth(entry.createdAt))
    .forEach((entry) => {
      const day = entry.createdAt.slice(0, 10);
      if (!map.has(day)) {
        map.set(day, { day, hub: 0, studio: 0, chat: 0, totalCredits: 0 });
      }
      const row = map.get(day);
      row[entry.module] = (row[entry.module] || 0) + entry.credits;
      row.totalCredits += entry.credits;
    });
  return [...map.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
}

function computeBreakdowns(logs, field) {
  const monthLogs = logs.filter((entry) => inCurrentMonth(entry.createdAt));
  const countMap = new Map();
  monthLogs.forEach((entry) => {
    const key = asText(entry[field]) || "Unknown";
    countMap.set(key, (countMap.get(key) || 0) + 1);
  });
  const total = monthLogs.length || 1;
  return [...countMap.entries()]
    .map(([label, count]) => ({
      label,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function recentActivity(logs) {
  return logs.slice(0, 12).map((entry) => ({
    id: entry.id,
    module: entry.module,
    category: entry.category,
    modelName: entry.modelName,
    format: entry.format,
    createdAt: entry.createdAt,
    credits: entry.credits,
    status: entry.status,
    compliance: entry.compliance,
  }));
}

function planPrice(subscription) {
  const plan = asText(subscription).toLowerCase();
  if (plan.includes("studio")) return 149;
  if (plan.includes("advanced")) return 59;
  if (plan.includes("simple")) return 19;
  return 0;
}

function getReplicateToken() {
  return asText(process.env.REPLICATE_API_TOKEN) || asText(process.env.REPLICATE_API_KEY);
}

function getFalToken() {
  return asText(process.env.FAL_API_KEY) || asText(process.env.FAL_KEY);
}

function tokenFingerprint(value) {
  const token = asText(value);
  if (!token) return "";
  if (token.length <= 10) return `${token.slice(0, 2)}***${token.slice(-2)}`;
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function getReplicateImageModel() {
  return normalizeReplicateModelSlug(asText(process.env.REPLICATE_IMAGE_MODEL));
}

function getReplicateVideoModels() {
  return uniqueNonEmpty([
    process.env.REPLICATE_VIDEO_MODEL_KLING,
    process.env.REPLICATE_VIDEO_MODEL_RUNWAY,
    process.env.REPLICATE_VIDEO_MODEL_VEO,
    process.env.REPLICATE_VIDEO_MODEL,
  ]);
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

async function checkReplicateModel(token, modelSlug) {
  if (!modelSlug) {
    return { ok: false, state: "missing_model_slug", status: 0, message: "Model slug is empty" };
  }

  try {
    const response = await fetch(`https://api.replicate.com/v1/models/${modelSlug}`, {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    });
    const payload = await parseJsonSafe(response);
    const detail = asText(payload?.detail || payload?.error || payload?.message);

    if (response.ok) return { ok: true, state: "ok", status: response.status, message: detail || "Model reachable" };
    if (response.status === 401 || response.status === 403) {
      return { ok: false, state: "invalid_token", status: response.status, message: detail || "Replicate token rejected" };
    }
    if (response.status === 404) {
      return { ok: false, state: "model_not_found", status: response.status, message: detail || "Model slug not found" };
    }
    if (response.status === 429) {
      return { ok: true, state: "throttled", status: response.status, message: detail || "Replicate throttled" };
    }
    return { ok: false, state: "error", status: response.status, message: detail || `Replicate HTTP ${response.status}` };
  } catch (error) {
    return {
      ok: false,
      state: "network_error",
      status: 0,
      message: error instanceof Error ? error.message : "Replicate network error",
    };
  }
}

async function checkFalToken(token, modelPath) {
  const cleanModel = asText(modelPath).replace(/^\/+|\/+$/g, "");
  const probeUrl = `https://queue.fal.run/${cleanModel}/requests/ora-health-check/status`;

  try {
    const response = await fetch(probeUrl, {
      method: "GET",
      headers: {
        Authorization: `Key ${token}`,
        "Content-Type": "application/json",
      },
    });
    const payload = await parseJsonSafe(response);
    const detail = asText(payload?.detail || payload?.error || payload?.message);

    if (response.status === 401 || response.status === 403) {
      return { ok: false, state: "invalid_token", status: response.status, message: detail || "FAL key rejected" };
    }
    if (response.status === 404) {
      return { ok: true, state: "ok", status: response.status, message: "FAL key accepted (probe 404 expected)" };
    }
    if (response.status === 429) {
      return { ok: true, state: "throttled", status: response.status, message: detail || "FAL throttled" };
    }
    if (response.ok) return { ok: true, state: "ok", status: response.status, message: detail || "FAL reachable" };
    return { ok: false, state: "error", status: response.status, message: detail || `FAL HTTP ${response.status}` };
  } catch (error) {
    return {
      ok: false,
      state: "network_error",
      status: 0,
      message: error instanceof Error ? error.message : "FAL network error",
    };
  }
}

function summarizeProviderStatus(checks) {
  if (!checks.length) return "missing";
  if (checks.some((item) => item.state === "invalid_token")) return "invalid_token";
  if (checks.some((item) => item.state === "model_not_found")) return "model_not_found";
  if (checks.some((item) => item.state === "network_error")) return "network_error";
  if (checks.some((item) => item.state === "error")) return "error";
  if (checks.some((item) => item.state === "throttled")) return "throttled";
  if (checks.every((item) => item.ok)) return "ok";
  return "partial";
}

async function buildProvidersDiagnostic(options = {}) {
  const includeSensitive = Boolean(options.includeSensitive);
  const replicateVarName = asText(process.env.REPLICATE_API_TOKEN) ? "REPLICATE_API_TOKEN" : asText(process.env.REPLICATE_API_KEY) ? "REPLICATE_API_KEY" : "";
  const falVarName = asText(process.env.FAL_API_KEY) ? "FAL_API_KEY" : asText(process.env.FAL_KEY) ? "FAL_KEY" : "";
  const replicateToken = getReplicateToken();
  const falToken = getFalToken();
  const replicateImageModel = getReplicateImageModel();
  const replicateVideoModels = getReplicateVideoModels();
  const falImageModel = asText(process.env.FAL_IMAGE_MODEL || "fal-ai/flux/v1.1/pro");

  const replicateChecks = [];
  if (!replicateToken) {
    replicateChecks.push({
      scope: "token",
      model: "",
      ok: false,
      state: "missing_token",
      status: 0,
      message: "REPLICATE_API_KEY / REPLICATE_API_TOKEN missing",
    });
  } else {
    if (replicateImageModel) {
      const imageCheck = await checkReplicateModel(replicateToken, replicateImageModel);
      replicateChecks.push({ scope: "image", model: replicateImageModel, ...imageCheck });
    }
    if (!replicateVideoModels.length) {
      replicateChecks.push({
        scope: "video",
        model: "",
        ok: false,
        state: "missing_model_slug",
        status: 0,
        message: "REPLICATE_VIDEO_MODEL* missing",
      });
    } else {
      for (const model of replicateVideoModels) {
        const check = await checkReplicateModel(replicateToken, model);
        replicateChecks.push({ scope: "video", model, ...check });
      }
    }
  }

  const falChecks = [];
  if (!falToken) {
    falChecks.push({
      scope: "image",
      model: falImageModel,
      ok: false,
      state: "missing_token",
      status: 0,
      message: "FAL_API_KEY missing",
    });
  } else {
    const check = await checkFalToken(falToken, falImageModel);
    falChecks.push({ scope: "image", model: falImageModel, ...check });
  }

  const warnings = [];
  if (replicateChecks.some((item) => item.state === "throttled")) {
    warnings.push("Replicate is throttled (check account balance and request burst).");
  }
  if (replicateChecks.some((item) => item.state === "model_not_found")) {
    warnings.push("One or more Replicate model slugs are invalid.");
  }
  if (falChecks.some((item) => item.state === "invalid_token")) {
    warnings.push("FAL key is invalid.");
  }

  return {
    checkedAt: new Date().toISOString(),
    providers: {
      replicate: {
        configured: Boolean(replicateToken),
        tokenSource: includeSensitive ? replicateVarName || null : undefined,
        tokenFingerprint: includeSensitive ? tokenFingerprint(replicateToken) || null : undefined,
        imageModel: replicateImageModel || null,
        videoModels: replicateVideoModels,
        status: summarizeProviderStatus(replicateChecks),
        checks: replicateChecks,
      },
      fal: {
        configured: Boolean(falToken),
        tokenSource: includeSensitive ? falVarName || null : undefined,
        tokenFingerprint: includeSensitive ? tokenFingerprint(falToken) || null : undefined,
        imageModel: falImageModel,
        status: summarizeProviderStatus(falChecks),
        checks: falChecks,
      },
    },
    warnings,
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const parsedUrl = new URL(req.url, `https://${req.headers.host || "ora.local"}`);
  const section = asText(parsedUrl.searchParams.get("section"));
  const publicMode = asText(parsedUrl.searchParams.get("public")) === "1";
  const token = getBearerToken(req);

  if (section === "providers" && (publicMode || !token)) {
    const diagnostic = await buildProvidersDiagnostic({ includeSensitive: false });
    res.status(200).json({ ok: true, mode: "public", ...diagnostic });
    return;
  }
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

  const redis = getRedisConfig();
  const profile = redis.enabled ? await redisGetJson(profileKey(userId), null) : null;
  const logs = redis.enabled ? normalizeLogs(await redisGetJson(generationKey(userId), [])) : [];

  const stats = {
    savingsEuro: computeSavings(logs, planPrice(profile?.subscription)),
    hoursSaved: computeTimeSaved(logs),
    assetsCreated: logs.filter((entry) => inCurrentMonth(entry.createdAt)).length,
    credits: {
      total: toNumber(profile?.credits, 0),
      monthlyRemaining: toNumber(profile?.creditsMonthly, 0),
      monthlyTotal: toNumber(profile?.creditsMonthlyLimit, 500),
      purchased: toNumber(profile?.creditsPurchased, 0),
      resetAt: asText(profile?.creditsResetAt),
    },
    studioHealth: {
      avgCompliance:
        logs.filter((entry) => entry.module === "studio" && entry.compliance > 0).length > 0
          ? Math.round(
              logs
                .filter((entry) => entry.module === "studio" && entry.compliance > 0)
                .reduce((sum, entry) => sum + entry.compliance, 0) /
                logs.filter((entry) => entry.module === "studio" && entry.compliance > 0).length,
            )
          : 0,
      approvalRate:
        logs.filter((entry) => entry.module === "studio").length > 0
          ? Math.round(
              (logs.filter((entry) => entry.module === "studio" && entry.compliance >= 98).length /
                logs.filter((entry) => entry.module === "studio").length) *
                100,
            )
          : 0,
      avgRevisions: 0,
    },
  };

  const payload = {
    ok: true,
    storage: redis.enabled ? "redis" : "fallback",
    stats,
    activity: recentActivity(logs),
    models: computeBreakdowns(logs, "modelName"),
    formats: computeBreakdowns(logs, "format"),
    creditsByDay: groupByDay(logs),
  };

  if (section === "stats") {
    res.status(200).json({ ok: true, stats: payload.stats, creditsByDay: payload.creditsByDay });
    return;
  }
  if (section === "activity") {
    res.status(200).json({ ok: true, activity: payload.activity });
    return;
  }
  if (section === "models") {
    res.status(200).json({ ok: true, models: payload.models });
    return;
  }
  if (section === "formats") {
    res.status(200).json({ ok: true, formats: payload.formats });
    return;
  }
  if (section === "providers") {
    const diagnostic = await buildProvidersDiagnostic({ includeSensitive: true });
    res.status(200).json({ ok: true, ...diagnostic });
    return;
  }

  res.status(200).json(payload);
}
