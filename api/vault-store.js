import { getBearerToken, getSupabaseUserFromToken } from "../server/auth.js";
import { getRedisConfig, parseBody, redisGetJson, redisSetJson } from "../server/redis.js";

const VAULT_STORE_PREFIX = process.env.VAULT_USER_STORE_PREFIX || "ora:vault-store:user";
const DEFAULT_TIMEOUT_MS = 9000;
const DEFAULT_MISTRAL_MODEL = process.env.MISTRAL_MODEL || "mistral-large-latest";

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "vault") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueStrings(values) {
  return Array.from(new Set(values.map((value) => asText(value)).filter(Boolean)));
}

function inferDefaultVaultName(user) {
  const company = asText(user?.user_metadata?.company || user?.user_metadata?.organization_name);
  if (company) return company;
  const fullName = asText(user?.user_metadata?.full_name || user?.user_metadata?.name);
  if (fullName) return `${fullName}'s Brand Vault`;
  return "Default Vault";
}

function emptyVault(user) {
  return {
    id: "default-vault",
    name: inferDefaultVaultName(user),
    websiteUrl: "",
    sourceUrls: [],
    documents: [],
    logoUrl: "",
    summary: "",
    semanticTone: {
      formality: "--",
      warmth: "--",
      boldness: "--",
      technicality: "--",
      humor: "--",
    },
    vocabulary: {
      approved: [],
      forbidden: [],
      expertise: [],
    },
    structure: {
      titleStyle: "--",
      headlinePattern: "--",
      ctaStyle: "--",
    },
    visualIntent: {
      palette: [],
      lighting: "--",
      humanPresence: "--",
      mood: "--",
    },
    positioning: {
      expertise: "--",
      positioning: "--",
      target: "--",
      competitors: [],
    },
    status: "pending",
    lastAnalyzedAt: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function emptyStore(user) {
  const vault = emptyVault(user);
  return {
    activeVaultId: vault.id,
    vaults: [vault],
    updatedAt: nowIso(),
  };
}

function normalizeDoc(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const name = asText(entry.name || entry.title || entry.fileName);
  if (!name) return null;
  return {
    id: asText(entry.id) || makeId("doc"),
    name,
    type: asText(entry.type || entry.mimeType || ""),
    size: Number.isFinite(Number(entry.size)) ? Number(entry.size) : undefined,
    addedAt: asText(entry.addedAt) || nowIso(),
  };
}

function normalizeVault(value, fallbackName = "Brand Vault") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value;
  const id = asText(source.id) || makeId("vault");

  return {
    id,
    name: asText(source.name) || fallbackName,
    websiteUrl: asText(source.websiteUrl),
    sourceUrls: uniqueStrings(Array.isArray(source.sourceUrls) ? source.sourceUrls : []),
    documents: Array.isArray(source.documents) ? source.documents.map((doc) => normalizeDoc(doc)).filter(Boolean) : [],
    logoUrl: asText(source.logoUrl),
    summary: asText(source.summary),
    semanticTone: {
      formality: asText(source?.semanticTone?.formality) || "--",
      warmth: asText(source?.semanticTone?.warmth) || "--",
      boldness: asText(source?.semanticTone?.boldness) || "--",
      technicality: asText(source?.semanticTone?.technicality) || "--",
      humor: asText(source?.semanticTone?.humor) || "--",
    },
    vocabulary: {
      approved: uniqueStrings(Array.isArray(source?.vocabulary?.approved) ? source.vocabulary.approved : []),
      forbidden: uniqueStrings(Array.isArray(source?.vocabulary?.forbidden) ? source.vocabulary.forbidden : []),
      expertise: uniqueStrings(Array.isArray(source?.vocabulary?.expertise) ? source.vocabulary.expertise : []),
    },
    structure: {
      titleStyle: asText(source?.structure?.titleStyle) || "--",
      headlinePattern: asText(source?.structure?.headlinePattern) || "--",
      ctaStyle: asText(source?.structure?.ctaStyle) || "--",
    },
    visualIntent: {
      palette: uniqueStrings(Array.isArray(source?.visualIntent?.palette) ? source.visualIntent.palette : []),
      lighting: asText(source?.visualIntent?.lighting) || "--",
      humanPresence: asText(source?.visualIntent?.humanPresence) || "--",
      mood: asText(source?.visualIntent?.mood) || "--",
    },
    positioning: {
      expertise: asText(source?.positioning?.expertise) || "--",
      positioning: asText(source?.positioning?.positioning) || "--",
      target: asText(source?.positioning?.target) || "--",
      competitors: uniqueStrings(Array.isArray(source?.positioning?.competitors) ? source.positioning.competitors : []),
    },
    status: asText(source.status) || "pending",
    lastAnalyzedAt: asText(source.lastAnalyzedAt),
    createdAt: asText(source.createdAt) || nowIso(),
    updatedAt: asText(source.updatedAt) || nowIso(),
  };
}

function normalizeStore(value, user) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyStore(user);
  const source = value;
  const fallback = emptyStore(user);
  const vaults = Array.isArray(source.vaults)
    ? source.vaults
        .map((vault) => normalizeVault(vault, fallback.vaults[0].name))
        .filter(Boolean)
    : [];
  const safeVaults = vaults.length ? vaults : fallback.vaults;
  const activeVaultId = asText(source.activeVaultId);
  const safeActive = safeVaults.some((vault) => vault.id === activeVaultId) ? activeVaultId : safeVaults[0].id;
  return {
    activeVaultId: safeActive,
    vaults: safeVaults,
    updatedAt: asText(source.updatedAt) || nowIso(),
  };
}

function vaultStoreKey(userId) {
  return `${VAULT_STORE_PREFIX}:${userId}:v1`;
}

function stripHtml(html) {
  return asText(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickHexColors(html) {
  const matches = asText(html).match(/#(?:[0-9a-fA-F]{3}){1,2}\b/g) || [];
  return uniqueStrings(matches).slice(0, 8);
}

function extractMeta(html) {
  const titleMatch = asText(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descriptionMatch = asText(html).match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  const h1Matches = [...asText(html).matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((match) => asText(match[1]).replace(/<[^>]+>/g, ""))
    .filter(Boolean)
    .slice(0, 4);
  return {
    title: titleMatch ? asText(titleMatch[1]).replace(/<[^>]+>/g, "") : "",
    description: descriptionMatch ? asText(descriptionMatch[1]) : "",
    h1: h1Matches,
  };
}

function inferHumanPresence(text) {
  const sample = asText(text).toLowerCase();
  if (!sample) return "unknown";
  const humanWords = ["team", "people", "customer", "client", "portrait", "employee", "founder", "human"];
  const productWords = ["product", "device", "interface", "logo", "object", "packshot", "vehicle"];
  const humanHits = humanWords.filter((word) => sample.includes(word)).length;
  const productHits = productWords.filter((word) => sample.includes(word)).length;
  if (humanHits > productHits) return "yes";
  if (productHits > humanHits) return "no";
  return "mixed";
}

function inferCompetitors(text) {
  const sample = asText(text);
  if (!sample) return [];
  const candidates = sample.match(/\b[A-Z][a-zA-Z0-9&.-]{2,}\b/g) || [];
  return uniqueStrings(candidates).slice(0, 8);
}

function getMistralKey() {
  return asText(process.env.MISTRAL_API_KEY) || asText(process.env.MISTRAL_API);
}

function parseJsonSafe(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

async function callMistralBrandAnalysis({ url, title, description, text, colors }) {
  const apiKey = getMistralKey();
  if (!apiKey) return { ok: false, error: "MISTRAL_API_KEY missing" };

  const excerpt = asText(text).slice(0, 12000);
  const systemPrompt =
    "You are ORA Brand Analyst. Return only valid JSON. Extract concise brand constraints, never marketing fluff.";

  const userPrompt = [
    "Analyze the website content and extract brand rules.",
    `URL: ${url}`,
    `Title: ${title || "(none)"}`,
    `Description: ${description || "(none)"}`,
    `Detected colors: ${colors.length ? colors.join(", ") : "(none)"}`,
    "Return JSON with this schema:",
    "{",
    '  "summary": "string",',
    '  "semanticTone": {"formality":"string","warmth":"string","boldness":"string","technicality":"string","humor":"string"},',
    '  "vocabulary": {"approved":["string"],"forbidden":["string"],"expertise":["string"]},',
    '  "structure": {"titleStyle":"string","headlinePattern":"string","ctaStyle":"string"},',
    '  "visualIntent": {"palette":["string"],"lighting":"string","humanPresence":"yes|no|mixed|unknown","mood":"string"},',
    '  "positioning": {"expertise":"string","positioning":"string","target":"string","competitors":["string"]}',
    "}",
    "Website text excerpt:",
    excerpt,
  ].join("\n");

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MISTRAL_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = asText(payload?.error?.message || payload?.message || payload?.error);
      return { ok: false, error: detail || `Mistral HTTP ${response.status}` };
    }

    const raw = payload?.choices?.[0]?.message?.content;
    const content = Array.isArray(raw)
      ? raw.map((part) => (typeof part === "string" ? part : asText(part?.text))).join("\n")
      : asText(raw);
    const parsed = parseJsonSafe(content);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Mistral returned invalid JSON" };
    }
    return { ok: true, data: parsed };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Mistral request failed" };
  }
}

async function fetchWebsiteSnapshot(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "ORA-Studio-BrandVault/1.0 (+https://ora-studio.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const html = await response.text();
    const meta = extractMeta(html);
    const text = stripHtml(html);
    return {
      ok: response.ok,
      status: response.status,
      html,
      text,
      title: meta.title,
      description: meta.description,
      h1: meta.h1,
      colors: pickHexColors(html),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      html: "",
      text: "",
      title: "",
      description: "",
      h1: [],
      colors: [],
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function analyzeWebsite(url) {
  const snapshot = await fetchWebsiteSnapshot(url);
  if (!snapshot.ok) {
    return {
      ok: false,
      error: snapshot.error || `Unable to fetch URL (HTTP ${snapshot.status})`,
    };
  }

  const heuristic = {
    summary: [snapshot.title, snapshot.description].filter(Boolean).join(" — ").slice(0, 260),
    semanticTone: {
      formality: "medium",
      warmth: "medium",
      boldness: "medium",
      technicality: snapshot.text.toLowerCase().includes("api") ? "high" : "medium",
      humor: "low",
    },
    vocabulary: {
      approved: uniqueStrings([...snapshot.h1, ...snapshot.text.split(/\s+/).slice(0, 24)]).slice(0, 18),
      forbidden: [],
      expertise: uniqueStrings(snapshot.h1).slice(0, 10),
    },
    structure: {
      titleStyle: snapshot.h1[0] ? "direct value-first headlines" : "short descriptive headlines",
      headlinePattern: snapshot.h1[0] || snapshot.title || "Short headline + supporting subheadline",
      ctaStyle: "clear action verbs with business outcome",
    },
    visualIntent: {
      palette: snapshot.colors,
      lighting: "neutral",
      humanPresence: inferHumanPresence(snapshot.text),
      mood: "professional",
    },
    positioning: {
      expertise: snapshot.h1[0] || snapshot.title || "Industry expertise",
      positioning: snapshot.description || "Value-focused positioning",
      target: "B2B decision makers",
      competitors: inferCompetitors(snapshot.text),
    },
  };

  const ai = await callMistralBrandAnalysis({
    url,
    title: snapshot.title,
    description: snapshot.description,
    text: snapshot.text,
    colors: snapshot.colors,
  });

  if (!ai.ok) {
    return {
      ok: true,
      data: heuristic,
      warning: ai.error || "",
    };
  }

  const parsed = ai.data;
  return {
    ok: true,
    data: {
      summary: asText(parsed.summary) || heuristic.summary,
      semanticTone: {
        formality: asText(parsed?.semanticTone?.formality) || heuristic.semanticTone.formality,
        warmth: asText(parsed?.semanticTone?.warmth) || heuristic.semanticTone.warmth,
        boldness: asText(parsed?.semanticTone?.boldness) || heuristic.semanticTone.boldness,
        technicality: asText(parsed?.semanticTone?.technicality) || heuristic.semanticTone.technicality,
        humor: asText(parsed?.semanticTone?.humor) || heuristic.semanticTone.humor,
      },
      vocabulary: {
        approved: uniqueStrings([...(parsed?.vocabulary?.approved || []), ...heuristic.vocabulary.approved]).slice(0, 24),
        forbidden: uniqueStrings(parsed?.vocabulary?.forbidden || []).slice(0, 24),
        expertise: uniqueStrings([...(parsed?.vocabulary?.expertise || []), ...heuristic.vocabulary.expertise]).slice(0, 24),
      },
      structure: {
        titleStyle: asText(parsed?.structure?.titleStyle) || heuristic.structure.titleStyle,
        headlinePattern: asText(parsed?.structure?.headlinePattern) || heuristic.structure.headlinePattern,
        ctaStyle: asText(parsed?.structure?.ctaStyle) || heuristic.structure.ctaStyle,
      },
      visualIntent: {
        palette: uniqueStrings([...(parsed?.visualIntent?.palette || []), ...snapshot.colors]).slice(0, 10),
        lighting: asText(parsed?.visualIntent?.lighting) || heuristic.visualIntent.lighting,
        humanPresence: asText(parsed?.visualIntent?.humanPresence) || heuristic.visualIntent.humanPresence,
        mood: asText(parsed?.visualIntent?.mood) || heuristic.visualIntent.mood,
      },
      positioning: {
        expertise: asText(parsed?.positioning?.expertise) || heuristic.positioning.expertise,
        positioning: asText(parsed?.positioning?.positioning) || heuristic.positioning.positioning,
        target: asText(parsed?.positioning?.target) || heuristic.positioning.target,
        competitors: uniqueStrings([...(parsed?.positioning?.competitors || []), ...heuristic.positioning.competitors]).slice(0, 12),
      },
    },
    warning: "",
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!["GET", "PUT", "POST"].includes(req.method || "")) {
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

  const redis = getRedisConfig();
  const key = vaultStoreKey(userId);
  const existing = redis.enabled ? await redisGetJson(key, null) : null;
  let store = normalizeStore(existing, auth.user);

  if (req.method === "GET") {
    res.status(200).json({ ok: true, store, storage: redis.enabled ? "redis" : "fallback" });
    return;
  }

  const body = parseBody(req.body) || {};

  if (req.method === "PUT") {
    const nextStore = normalizeStore(body.store, auth.user);
    if (redis.enabled) {
      await redisSetJson(key, nextStore);
    }
    res.status(200).json({ ok: true, store: nextStore, storage: redis.enabled ? "redis" : "fallback" });
    return;
  }

  const action = asText(body.action || "analyze").toLowerCase();
  if (action !== "analyze") {
    res.status(400).json({ ok: false, error: "Unsupported action" });
    return;
  }

  const targetVaultId = asText(body.vaultId) || store.activeVaultId || store.vaults[0]?.id;
  const inputName = asText(body.name);
  const inputUrl = asText(body.url);
  const inputLogoUrl = asText(body.logoUrl);
  const inputDocs = Array.isArray(body.documents) ? body.documents.map((doc) => normalizeDoc(doc)).filter(Boolean) : [];

  const vaultIndex = store.vaults.findIndex((vault) => vault.id === targetVaultId);
  if (vaultIndex < 0) {
    const created = normalizeVault({ ...emptyVault(auth.user), id: targetVaultId, name: inputName || inferDefaultVaultName(auth.user) });
    store = {
      ...store,
      activeVaultId: created.id,
      vaults: [created, ...store.vaults],
      updatedAt: nowIso(),
    };
  }

  const nextIndex = store.vaults.findIndex((vault) => vault.id === targetVaultId);
  const current = store.vaults[nextIndex];
  if (!current) {
    res.status(500).json({ ok: false, error: "Unable to resolve vault" });
    return;
  }

  let analysis = null;
  let warning = "";

  if (inputUrl) {
    const result = await analyzeWebsite(inputUrl);
    if (!result.ok) {
      res.status(200).json({
        ok: false,
        error: result.error || "URL analysis failed",
        store,
        storage: redis.enabled ? "redis" : "fallback",
      });
      return;
    }
    analysis = result.data;
    warning = asText(result.warning);
  }

  const mergedVault = normalizeVault({
    ...current,
    name: inputName || current.name,
    websiteUrl: inputUrl || current.websiteUrl,
    sourceUrls: uniqueStrings([...current.sourceUrls, inputUrl]),
    documents: [...current.documents, ...inputDocs],
    logoUrl: inputLogoUrl || current.logoUrl,
    summary: analysis?.summary || current.summary,
    semanticTone: analysis?.semanticTone || current.semanticTone,
    vocabulary: analysis?.vocabulary || current.vocabulary,
    structure: analysis?.structure || current.structure,
    visualIntent: analysis?.visualIntent || current.visualIntent,
    positioning: analysis?.positioning || current.positioning,
    status: analysis ? "analyzed" : current.status,
    lastAnalyzedAt: analysis ? nowIso() : current.lastAnalyzedAt,
    updatedAt: nowIso(),
  });

  const nextStore = normalizeStore(
    {
      ...store,
      activeVaultId: mergedVault.id,
      vaults: store.vaults.map((vault) => (vault.id === mergedVault.id ? mergedVault : vault)),
      updatedAt: nowIso(),
    },
    auth.user,
  );

  if (redis.enabled) {
    await redisSetJson(key, nextStore);
  }

  res.status(200).json({
    ok: true,
    store: nextStore,
    vault: mergedVault,
    warning,
    storage: redis.enabled ? "redis" : "fallback",
  });
}
