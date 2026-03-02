import {
  ADMIN_LOGS_KEY,
  USER_INDEX_KEY,
  getBearerToken,
  getSupabaseUserFromToken,
  isAdminEmail,
  normalizeEmail,
  nowIso,
  profileKey,
} from "../server/auth.js";
import { getRedisConfig, parseBody, redisGetJson, redisSetJson } from "../server/redis.js";

const MAX_LOGS = 240;
const PROVIDER_COSTS = {
  openai: 0.012,
  anthropic: 0.01,
  google: 0.008,
  mistral: 0.006,
  replicate: 0.03,
  runway: 0.05,
  default: 0.005,
};

const PLAN_MONTHLY_PRICE = {
  free: 0,
  simple: 19,
  advanced: 59,
  studio: 149,
};

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toInt(value, fallback = 0) {
  return Math.round(toNumber(value, fallback));
}

function generationKey(userId) {
  return `ora:user:generations:${userId}`;
}

function transactionsKey(userId) {
  return `ora:user:transactions:${userId}`;
}

function planCode(subscription) {
  const value = asText(subscription).toLowerCase();
  if (!value) return "free";
  if (value.includes("studio")) return "studio";
  if (value.includes("advanced")) return "advanced";
  if (value.includes("simple")) return "simple";
  if (value.includes("pro")) return "advanced";
  if (value.includes("enterprise")) return "studio";
  if (value.includes("starter")) return "simple";
  if (value.includes("free")) return "free";
  return "simple";
}

function inCurrentMonth(iso) {
  if (!iso) return false;
  const now = new Date();
  const date = new Date(iso);
  return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
}

function inLastDays(iso, days) {
  if (!iso) return false;
  const date = new Date(iso);
  const threshold = Date.now() - days * 86400000;
  return date.getTime() >= threshold;
}

function normalizeProfile(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const userId = asText(raw.userId);
  const email = normalizeEmail(raw.email || "");
  if (!userId || !email) return null;
  return {
    userId,
    email,
    fullName: asText(raw.fullName),
    company: asText(raw.company || raw.organizationName),
    role: asText(raw.role || "client").toLowerCase(),
    status: asText(raw.status || "active").toLowerCase(),
    subscription: asText(raw.subscription || "Simple Generation"),
    credits: toInt(raw.credits, 0),
    creditsMonthly: toInt(raw.creditsMonthly, 0),
    creditsPurchased: toInt(raw.creditsPurchased, 0),
    campaignCount: toInt(raw.campaignCount, 0),
    pieceCount: toInt(raw.pieceCount, 0),
    createdAt: asText(raw.createdAt),
    updatedAt: asText(raw.updatedAt),
    lastLoginAt: asText(raw.lastLoginAt),
    isAdmin: Boolean(raw.isAdmin ?? raw.is_admin),
  };
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
        credits: Math.max(0, toInt(entry.credits, 0)),
        status: asText(entry.status) || "success",
        compliance: Math.max(0, Math.min(100, toInt(entry.compliance, 0))),
        latencyMs: Math.max(0, toInt(entry.latencyMs, 0)),
      };
    })
    .filter((entry) => Boolean(entry));
}

function normalizeTransactions(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      return {
        id: asText(entry.id),
        type: asText(entry.type),
        description: asText(entry.description),
        amount: toNumber(entry.amount, 0),
        credits: toInt(entry.credits, 0),
        createdAt: asText(entry.createdAt) || nowIso(),
      };
    })
    .filter((entry) => Boolean(entry));
}

async function readUserIds() {
  const ids = await redisGetJson(USER_INDEX_KEY, []);
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => asText(id)).filter(Boolean);
}

async function readAllProfiles() {
  const userIds = await readUserIds();
  const entries = await Promise.all(userIds.map((userId) => redisGetJson(profileKey(userId), null)));
  return entries
    .map((entry) => normalizeProfile(entry))
    .filter((entry) => Boolean(entry))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
}

async function readLogs() {
  const logs = await redisGetJson(ADMIN_LOGS_KEY, []);
  if (!Array.isArray(logs)) return [];
  return logs
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      return {
        id: asText(entry.id) || `${Date.now()}`,
        ts: asText(entry.ts) || nowIso(),
        actorId: asText(entry.actorId),
        actorEmail: normalizeEmail(entry.actorEmail || ""),
        action: asText(entry.action),
        targetUserId: asText(entry.targetUserId),
        details: asText(entry.details),
      };
    })
    .filter((entry) => Boolean(entry))
    .slice(0, MAX_LOGS);
}

async function appendLog(entry) {
  const previous = await readLogs();
  const next = [
    {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      ts: nowIso(),
      actorId: asText(entry.actorId),
      actorEmail: normalizeEmail(entry.actorEmail || ""),
      action: asText(entry.action),
      targetUserId: asText(entry.targetUserId),
      details: asText(entry.details),
    },
    ...previous,
  ].slice(0, MAX_LOGS);
  await redisSetJson(ADMIN_LOGS_KEY, next);
  return next;
}

async function readAnalyticsForUser(userId) {
  const [generations, transactions] = await Promise.all([
    redisGetJson(generationKey(userId), []),
    redisGetJson(transactionsKey(userId), []),
  ]);
  return {
    generations: normalizeLogs(generations),
    transactions: normalizeTransactions(transactions),
  };
}

function groupCount(entries, field, limit = 10) {
  const map = new Map();
  entries.forEach((entry) => {
    const key = asText(entry[field]) || "Unknown";
    map.set(key, (map.get(key) || 0) + 1);
  });
  const total = entries.length || 1;
  return [...map.entries()]
    .map(([label, count]) => ({
      label,
      count,
      percentage: Math.round((count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function summarizeUsers(profiles) {
  const totalUsers = profiles.length;
  const activeUsers = profiles.filter((user) => user.status === "active").length;
  const suspendedUsers = profiles.filter((user) => user.status === "suspended").length;
  const adminUsers = profiles.filter((user) => user.isAdmin).length;
  const totalCredits = profiles.reduce((sum, user) => sum + Math.max(0, toInt(user.credits, 0)), 0);
  const totalCampaigns = profiles.reduce((sum, user) => sum + Math.max(0, toInt(user.campaignCount, 0)), 0);
  const totalAssets = profiles.reduce((sum, user) => sum + Math.max(0, toInt(user.pieceCount, 0)), 0);
  return {
    totalUsers,
    activeUsers,
    suspendedUsers,
    adminUsers,
    totalCredits,
    totalCampaigns,
    totalAssets,
  };
}

function computeOverview(profiles, userAnalytics) {
  const allGenerations = userAnalytics.flatMap((entry) => entry.generations);
  const monthGenerations = allGenerations.filter((entry) => inCurrentMonth(entry.createdAt));

  const providerRowsMap = new Map();
  let apiCosts = 0;
  let latencyAccumulator = 0;
  let errors = 0;

  monthGenerations.forEach((entry) => {
    const provider = entry.provider || "unknown";
    const costPerCall = PROVIDER_COSTS[provider] || PROVIDER_COSTS.default;
    const callCost = costPerCall;
    apiCosts += callCost;
    latencyAccumulator += entry.latencyMs || 0;
    if ((entry.status || "").toLowerCase() !== "success") errors += 1;

    const row = providerRowsMap.get(provider) || { provider, calls: 0, cost: 0, errors: 0, latencyTotal: 0 };
    row.calls += 1;
    row.cost += callCost;
    row.latencyTotal += entry.latencyMs || 0;
    if ((entry.status || "").toLowerCase() !== "success") row.errors += 1;
    providerRowsMap.set(provider, row);
  });

  const activeSubscriptions = profiles.filter((profile) => planCode(profile.subscription) !== "free");
  const mrr = activeSubscriptions.reduce((sum, profile) => sum + (PLAN_MONTHLY_PRICE[planCode(profile.subscription)] || 0), 0);

  const monthTransactions = userAnalytics.flatMap((entry) => entry.transactions).filter((entry) => inCurrentMonth(entry.createdAt));
  const subsRevenue = monthTransactions
    .filter((entry) => (entry.type || "").includes("subscription"))
    .reduce((sum, entry) => sum + Math.max(0, entry.amount), 0);
  const packsRevenue = monthTransactions
    .filter((entry) => (entry.type || "").includes("credit-pack") || (entry.type || "").includes("topup"))
    .reduce((sum, entry) => sum + Math.max(0, entry.amount), 0);
  const revenueToday = monthTransactions
    .filter((entry) => inLastDays(entry.createdAt, 1))
    .reduce((sum, entry) => sum + Math.max(0, entry.amount), 0);
  const totalRevenue = subsRevenue + packsRevenue;
  const grossProfit = totalRevenue - apiCosts;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const providerRows = [...providerRowsMap.values()]
    .sort((a, b) => b.calls - a.calls)
    .map((row) => ({
      provider: row.provider,
      calls: row.calls,
      cost: Number(row.cost.toFixed(2)),
      revenue: Number((row.calls * 0.16).toFixed(2)),
      margin: Number(((1 - row.cost / Math.max(row.calls * 0.16, 0.01)) * 100).toFixed(1)),
      errorRate: Number(((row.errors / Math.max(row.calls, 1)) * 100).toFixed(2)),
      avgLatency: Number((row.latencyTotal / Math.max(row.calls, 1)).toFixed(0)),
    }));

  const plans = {
    free: profiles.filter((profile) => planCode(profile.subscription) === "free").length,
    simple: profiles.filter((profile) => planCode(profile.subscription) === "simple").length,
    advanced: profiles.filter((profile) => planCode(profile.subscription) === "advanced").length,
    studio: profiles.filter((profile) => planCode(profile.subscription) === "studio").length,
  };

  const newThisMonth = profiles.filter((profile) => inCurrentMonth(profile.createdAt)).length;
  const activeThisWeek = profiles.filter((profile) => inLastDays(profile.lastLoginAt, 7)).length;

  return {
    revenue: {
      mrr: Number(mrr.toFixed(2)),
      subscriptions: Number(subsRevenue.toFixed(2)),
      creditPacks: Number(packsRevenue.toFixed(2)),
      revenueToday: Number(revenueToday.toFixed(2)),
      apiCosts: Number(apiCosts.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossMargin: Number(grossMargin.toFixed(1)),
      avgRevenuePerPayingUser:
        activeSubscriptions.length > 0
          ? Number((totalRevenue / activeSubscriptions.length).toFixed(2))
          : 0,
    },
    users: {
      total: profiles.length,
      signedUpThisMonth: newThisMonth,
      newToday: profiles.filter((profile) => inLastDays(profile.createdAt, 1)).length,
      freeUsers: plans.free,
      simpleUsers: plans.simple,
      advancedUsers: plans.advanced,
      studioUsers: plans.studio,
      activeThisWeek,
      activeTeams: profiles.filter((profile) => planCode(profile.subscription) === "studio").length,
      churnRate:
        profiles.length > 0
          ? Number(((profiles.filter((profile) => profile.status === "suspended").length / profiles.length) * 100).toFixed(1))
          : 0,
      freeToPaidConversion: profiles.length > 0 ? Number((((plans.simple + plans.advanced + plans.studio) / profiles.length) * 100).toFixed(1)) : 0,
    },
    usage: {
      totalGenerations: monthGenerations.length,
      todayGenerations: monthGenerations.filter((entry) => inLastDays(entry.createdAt, 1)).length,
      hubGenerations: monthGenerations.filter((entry) => entry.module === "hub").length,
      studioGenerations: monthGenerations.filter((entry) => entry.module === "studio").length,
      chatGenerations: monthGenerations.filter((entry) => entry.module === "chat").length,
      arenaRuns: monthGenerations.filter((entry) => entry.modelId === "ora-mix" || entry.module === "studio").length,
      successRate: monthGenerations.length ? Number((((monthGenerations.length - errors) / monthGenerations.length) * 100).toFixed(1)) : 100,
      avgLatency: monthGenerations.length ? Number((latencyAccumulator / monthGenerations.length / 1000).toFixed(2)) : 0,
      errors,
    },
    providers: providerRows,
    modelStats: groupCount(monthGenerations, "modelName", 12).map((entry) => ({
      modelName: entry.label,
      calls: entry.count,
      percentage: entry.percentage,
    })),
    formatStats: groupCount(monthGenerations, "format", 12),
  };
}

async function ensureRequesterIsAdmin(req) {
  const token = getBearerToken(req);
  const auth = await getSupabaseUserFromToken(token);
  if (!auth.ok) return { ok: false, status: 401, error: auth.error || "Unauthorized" };

  const userId = asText(auth.user?.id);
  const email = normalizeEmail(auth.user?.email || "");
  if (!userId || !email) return { ok: false, status: 401, error: "Unauthorized" };

  const profile = normalizeProfile(await redisGetJson(profileKey(userId), null));
  const adminByEmail = isAdminEmail(email);
  const adminByRole = Boolean(profile?.isAdmin);
  if (!adminByEmail && !adminByRole) {
    return { ok: false, status: 403, error: "Admin access required" };
  }

  return {
    ok: true,
    requester: {
      userId,
      email,
    },
  };
}

async function updateUserProfile(userId, updates) {
  const current = normalizeProfile(await redisGetJson(profileKey(userId), null));
  if (!current) return null;
  const next = {
    ...current,
    ...updates,
    updatedAt: nowIso(),
  };
  if (typeof next.creditsMonthly === "number" || typeof next.creditsPurchased === "number") {
    next.credits = Math.max(0, toInt(next.creditsMonthly, 0) + toInt(next.creditsPurchased, 0));
  }
  await redisSetJson(profileKey(userId), next);
  return next;
}

function buildUserRow(profile, analytics) {
  const generations = analytics.generations || [];
  const lifetimeRevenue = (analytics.transactions || []).reduce((sum, entry) => sum + Math.max(0, entry.amount), 0);
  const apiCost = generations.reduce((sum, entry) => {
    const provider = asText(entry.provider).toLowerCase();
    return sum + (PROVIDER_COSTS[provider] || PROVIDER_COSTS.default);
  }, 0);
  return {
    userId: profile.userId,
    email: profile.email,
    fullName: profile.fullName || "",
    company: profile.company || "",
    role: profile.role,
    status: profile.status,
    subscription: profile.subscription,
    planCode: planCode(profile.subscription),
    credits: toInt(profile.credits, 0),
    creditsMonthly: toInt(profile.creditsMonthly, 0),
    creditsPurchased: toInt(profile.creditsPurchased, 0),
    campaignCount: toInt(profile.campaignCount, 0),
    pieceCount: toInt(profile.pieceCount, 0),
    totalGenerations: generations.length,
    lastActive: profile.lastLoginAt || profile.updatedAt || profile.createdAt,
    signupDate: profile.createdAt,
    lifetimeRevenue: Number(lifetimeRevenue.toFixed(2)),
    apiCost: Number(apiCost.toFixed(2)),
    stripeCustomerId: "",
  };
}

async function buildSnapshot() {
  const profiles = await readAllProfiles();
  const logs = await readLogs();
  const analyticsEntries = await Promise.all(
    profiles.map(async (profile) => ({
      userId: profile.userId,
      ...(await readAnalyticsForUser(profile.userId)),
    })),
  );
  const analyticsByUser = new Map(analyticsEntries.map((entry) => [entry.userId, entry]));
  const users = profiles.map((profile) => buildUserRow(profile, analyticsByUser.get(profile.userId) || { generations: [], transactions: [] }));
  const overview = computeOverview(profiles, analyticsEntries);

  return {
    summary: summarizeUsers(profiles),
    users,
    logs,
    overview,
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method || "")) {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const redis = getRedisConfig();
  if (!redis.enabled) {
    res.status(503).json({ error: "Redis is not configured" });
    return;
  }

  const adminCheck = await ensureRequesterIsAdmin(req);
  if (!adminCheck.ok) {
    res.status(adminCheck.status).json({ error: adminCheck.error });
    return;
  }

  if (req.method === "GET") {
    const snapshot = await buildSnapshot();
    await appendLog({
      actorId: adminCheck.requester.userId,
      actorEmail: adminCheck.requester.email,
      action: "view_dashboard",
      details: "Admin dashboard opened",
    });
    res.status(200).json({ ok: true, ...snapshot });
    return;
  }

  const payload = parseBody(req.body) || {};
  const action = asText(payload.action).toLowerCase();
  const userId = asText(payload.userId || payload.targetUserId);

  if (action === "export-csv") {
    await appendLog({
      actorId: adminCheck.requester.userId,
      actorEmail: adminCheck.requester.email,
      action: "export_csv",
      details: asText(payload.table || "overview"),
    });
    const snapshot = await buildSnapshot();
    res.status(200).json({ ok: true, ...snapshot });
    return;
  }

  if ((action === "update-user" || action === "change-plan" || action === "disable-user" || action === "delete-user" || action === "adjust-credits" || action === "grant-credits") && !userId) {
    res.status(400).json({ ok: false, error: "Missing userId" });
    return;
  }

  if (action === "update-user") {
    const updates = payload.updates && typeof payload.updates === "object" ? payload.updates : {};
    const next = await updateUserProfile(userId, {
      fullName: asText(updates.fullName),
      company: asText(updates.company),
      status: asText(updates.status || "active").toLowerCase(),
      role: asText(updates.role || "client").toLowerCase(),
      subscription: asText(updates.subscription) || "Simple Generation",
    });
    if (!next) {
      res.status(404).json({ ok: false, error: "User not found" });
      return;
    }
    await appendLog({
      actorId: adminCheck.requester.userId,
      actorEmail: adminCheck.requester.email,
      action: "update_user",
      targetUserId: userId,
      details: JSON.stringify(updates),
    });
  } else if (action === "adjust-credits" || action === "grant-credits") {
    const delta = toInt(payload.delta || payload.amount, 0);
    const current = normalizeProfile(await redisGetJson(profileKey(userId), null));
    if (!current) {
      res.status(404).json({ ok: false, error: "User not found" });
      return;
    }
    const next = await updateUserProfile(userId, {
      creditsPurchased: Math.max(0, toInt(current.creditsPurchased, 0) + delta),
    });
    if (!next) {
      res.status(500).json({ ok: false, error: "Unable to update credits" });
      return;
    }
    const txKey = transactionsKey(userId);
    const tx = normalizeTransactions(await redisGetJson(txKey, []));
    tx.unshift({
      id: `txn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      type: "admin-grant",
      description: `Admin grant ${delta > 0 ? "+" : ""}${delta} credits`,
      amount: 0,
      credits: delta,
      createdAt: nowIso(),
    });
    await redisSetJson(txKey, tx.slice(0, 500));
    await appendLog({
      actorId: adminCheck.requester.userId,
      actorEmail: adminCheck.requester.email,
      action: "grant_credits",
      targetUserId: userId,
      details: `${delta}`,
    });
  } else if (action === "change-plan") {
    const nextPlan = asText(payload.plan) || "Simple Generation";
    const next = await updateUserProfile(userId, {
      subscription: nextPlan,
      creditsMonthly:
        planCode(nextPlan) === "studio" ? 4000 : planCode(nextPlan) === "advanced" ? 1500 : planCode(nextPlan) === "simple" ? 500 : 0,
    });
    if (!next) {
      res.status(404).json({ ok: false, error: "User not found" });
      return;
    }
    await appendLog({
      actorId: adminCheck.requester.userId,
      actorEmail: adminCheck.requester.email,
      action: "change_plan",
      targetUserId: userId,
      details: nextPlan,
    });
  } else if (action === "disable-user") {
    const next = await updateUserProfile(userId, { status: "disabled" });
    if (!next) {
      res.status(404).json({ ok: false, error: "User not found" });
      return;
    }
    await appendLog({
      actorId: adminCheck.requester.userId,
      actorEmail: adminCheck.requester.email,
      action: "disable_user",
      targetUserId: userId,
      details: asText(payload.reason || ""),
    });
  } else if (action === "delete-user") {
    const next = await updateUserProfile(userId, { status: "disabled", deletedAt: nowIso() });
    if (!next) {
      res.status(404).json({ ok: false, error: "User not found" });
      return;
    }
    await appendLog({
      actorId: adminCheck.requester.userId,
      actorEmail: adminCheck.requester.email,
      action: "delete_user",
      targetUserId: userId,
      details: "soft delete",
    });
  } else if (action === "add-note") {
    await appendLog({
      actorId: adminCheck.requester.userId,
      actorEmail: adminCheck.requester.email,
      action: "note",
      targetUserId: userId,
      details: asText(payload.details || payload.note),
    });
  } else {
    res.status(400).json({ ok: false, error: "Unknown action" });
    return;
  }

  const snapshot = await buildSnapshot();
  res.status(200).json({ ok: true, ...snapshot });
}
