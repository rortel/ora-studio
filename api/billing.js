import { getBearerToken, getSupabaseUserFromToken, nowIso, profileKey } from "../server/auth.js";
import { getRedisConfig, parseBody, redisGetJson, redisSetJson } from "../server/redis.js";

const PLAN_CONFIG = {
  free: { id: "free", label: "Free", price: 0, monthlyCredits: 0 },
  simple: { id: "simple", label: "Simple Generation", price: 19, monthlyCredits: 500 },
  advanced: { id: "advanced", label: "Advanced Models", price: 59, monthlyCredits: 1500 },
  studio: { id: "studio", label: "Studio + Brand Vault", price: 149, monthlyCredits: 4000 },
};

const CREDIT_PACKS = {
  starter: { id: "starter", label: "Starter", price: 9, credits: 100 },
  builder: { id: "builder", label: "Builder", price: 29, credits: 400 },
  production: { id: "production", label: "Production", price: 59, credits: 1000 },
};

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function pickPlan(input) {
  const raw = asText(input).toLowerCase();
  if (!raw) return PLAN_CONFIG.simple;
  if (raw.includes("studio")) return PLAN_CONFIG.studio;
  if (raw.includes("advanced")) return PLAN_CONFIG.advanced;
  if (raw.includes("free")) return PLAN_CONFIG.free;
  return PLAN_CONFIG.simple;
}

function transactionsKey(userId) {
  return `ora:user:transactions:${userId}`;
}

function nowPlusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return null;
  return profile;
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
        credits: toNumber(entry.credits, 0),
        createdAt: asText(entry.createdAt) || nowIso(),
      };
    })
    .filter((entry) => Boolean(entry));
}

async function appendTransaction(userId, transaction) {
  const key = transactionsKey(userId);
  const previous = normalizeTransactions(await redisGetJson(key, []));
  const next = [
    {
      id: transaction.id || `txn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      type: transaction.type || "manual",
      description: transaction.description || "Transaction",
      amount: toNumber(transaction.amount, 0),
      credits: toNumber(transaction.credits, 0),
      createdAt: transaction.createdAt || nowIso(),
    },
    ...previous,
  ].slice(0, 300);
  await redisSetJson(key, next);
  return next;
}

function buildInvoices(transactions) {
  return transactions
    .filter((entry) => entry.amount > 0)
    .map((entry) => ({
      id: entry.id,
      date: entry.createdAt,
      description: entry.description,
      amount: entry.amount,
      currency: "EUR",
      pdfUrl: `#invoice-${entry.id}`,
    }));
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

  const profile = normalizeProfile(await redisGetJson(profileKey(userId), null));
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  if (req.method === "POST") {
    const body = parseBody(req.body) || {};
    const action = asText(body.action);

    if (action === "change-plan") {
      const plan = pickPlan(body.plan);
      const next = {
        ...profile,
        subscription: plan.label,
        creditsMonthlyLimit: plan.monthlyCredits,
        creditsMonthly: plan.monthlyCredits,
        credits: plan.monthlyCredits + toNumber(profile.creditsPurchased, 0),
        creditsResetAt: nowPlusDays(30),
        updatedAt: nowIso(),
      };
      await redisSetJson(profileKey(userId), next);
      const transactions = await appendTransaction(userId, {
        type: "subscription",
        description: `${plan.label} — Monthly`,
        amount: plan.price,
        credits: plan.monthlyCredits,
      });
      res.status(200).json({
        ok: true,
        plan,
        profile: next,
        invoices: buildInvoices(transactions),
      });
      return;
    }

    if (action === "buy-credits") {
      const pack = CREDIT_PACKS[asText(body.pack).toLowerCase()];
      if (!pack) {
        res.status(400).json({ ok: false, error: "Unknown credit pack." });
        return;
      }
      const next = {
        ...profile,
        creditsPurchased: toNumber(profile.creditsPurchased, 0) + pack.credits,
        credits: toNumber(profile.credits, 0) + pack.credits,
        updatedAt: nowIso(),
      };
      await redisSetJson(profileKey(userId), next);
      const transactions = await appendTransaction(userId, {
        type: "credit-pack",
        description: `Credit Pack ${pack.credits}`,
        amount: pack.price,
        credits: pack.credits,
      });
      res.status(200).json({
        ok: true,
        pack,
        profile: next,
        invoices: buildInvoices(transactions),
      });
      return;
    }

    if (action === "cancel") {
      const next = {
        ...profile,
        subscription: "Free",
        creditsMonthlyLimit: 0,
        creditsMonthly: 0,
        credits: toNumber(profile.creditsPurchased, 0),
        updatedAt: nowIso(),
      };
      await redisSetJson(profileKey(userId), next);
      res.status(200).json({ ok: true, profile: next });
      return;
    }

    res.status(400).json({ ok: false, error: "Unknown billing action" });
    return;
  }

  const plan = pickPlan(profile.subscription);
  const transactions = normalizeTransactions(await redisGetJson(transactionsKey(userId), []));
  const invoices = buildInvoices(transactions);

  res.status(200).json({
    ok: true,
    currentPlan: {
      id: plan.id,
      label: plan.label,
      price: plan.price,
      nextBillingAt: asText(profile.creditsResetAt) || nowPlusDays(30),
      paymentMethod: "Visa •••• 4242",
    },
    credits: {
      monthlyUsed: Math.max(0, toNumber(profile.creditsMonthlyLimit, plan.monthlyCredits) - toNumber(profile.creditsMonthly, plan.monthlyCredits)),
      monthlyTotal: toNumber(profile.creditsMonthlyLimit, plan.monthlyCredits),
      monthlyRemaining: toNumber(profile.creditsMonthly, plan.monthlyCredits),
      purchased: toNumber(profile.creditsPurchased, 0),
      total: toNumber(profile.credits, 0),
      resetAt: asText(profile.creditsResetAt) || nowPlusDays(30),
    },
    invoices,
    creditPacks: Object.values(CREDIT_PACKS),
  });
}

