const DEFAULT_MISTRAL_MODEL = process.env.MISTRAL_MODEL || "mistral-large-latest";
const DEFAULT_FAL_IMAGE_MODEL = process.env.FAL_IMAGE_MODEL || "fal-ai/flux/v1.1/pro";
const DEFAULT_FAL_VIDEO_MODEL = process.env.FAL_VIDEO_MODEL || "fal-ai/minimax-video/hailuo-02";
const DEFAULT_VIDEO_MODEL = process.env.REPLICATE_VIDEO_MODEL || "";
const DEFAULT_WAIT_SECONDS = Number(process.env.REPLICATE_WAIT_SECONDS || "18");
const DEFAULT_STRICT_THRESHOLD = Number(process.env.ASSET_STRICT_THRESHOLD || "98");
const MAX_LEAK_NGRAM_RATIO = Number(process.env.BRAND_LEAK_MAX_RATIO || "0.18");
const MAX_LEAK_WORD_WINDOW = Number(process.env.BRAND_LEAK_MAX_WORD_WINDOW || "16");
const MIN_CREATION_ANCHOR_HITS = Number(process.env.CREATION_ANCHOR_MIN_HITS || "2");

const STOP_WORDS = new Set([
  "a",
  "about",
  "above",
  "after",
  "again",
  "against",
  "all",
  "also",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "being",
  "between",
  "both",
  "but",
  "by",
  "can",
  "de",
  "des",
  "du",
  "dans",
  "do",
  "does",
  "doing",
  "dont",
  "each",
  "en",
  "for",
  "from",
  "have",
  "has",
  "had",
  "he",
  "her",
  "here",
  "hers",
  "him",
  "his",
  "how",
  "i",
  "if",
  "il",
  "ils",
  "in",
  "into",
  "is",
  "it",
  "its",
  "la",
  "le",
  "les",
  "leur",
  "leurs",
  "me",
  "mes",
  "more",
  "most",
  "my",
  "ne",
  "new",
  "no",
  "not",
  "nos",
  "nous",
  "of",
  "on",
  "or",
  "our",
  "ours",
  "out",
  "par",
  "pas",
  "pour",
  "plus",
  "que",
  "qui",
  "sa",
  "ses",
  "she",
  "so",
  "son",
  "sur",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "too",
  "un",
  "une",
  "up",
  "us",
  "very",
  "vos",
  "votre",
  "vous",
  "we",
  "were",
  "what",
  "when",
  "where",
  "which",
  "who",
  "with",
  "would",
  "your",
  "yours",
]);

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
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

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function scoreClamp(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function computeWeightedCompliance({ semantic, layout, visual }) {
  const weighted = semantic * 0.4 + layout * 0.3 + visual * 0.3;
  return Math.max(0, Math.min(100, Math.round(weighted)));
}

function normalizeWhitespace(value) {
  return asText(value)
    .replace(/\s+/g, " ")
    .trim();
}

function campaignNameFromBrief(brief) {
  const clean = normalizeWhitespace(brief);
  if (!clean) return "Nouvelle campagne";
  if (clean.length <= 52) return clean;
  return `${clean.slice(0, 49).trimEnd()}...`;
}

function getReplicateToken() {
  return asText(process.env.REPLICATE_API_TOKEN) || asText(process.env.REPLICATE_API_KEY);
}

function getFalToken() {
  return asText(process.env.FAL_API_KEY) || asText(process.env.FAL_KEY);
}

function getMistralKey() {
  return asText(process.env.MISTRAL_API_KEY) || asText(process.env.MISTRAL_API);
}

function uniqueStrings(values) {
  return Array.from(new Set(values.map((value) => normalizeWhitespace(value)).filter(Boolean)));
}

function toTokenArray(text) {
  return normalizeWhitespace(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function takeTopKeywords(texts, limit = 14) {
  const scoreMap = new Map();
  texts
    .map((text) => toTokenArray(text))
    .forEach((tokens) => {
      tokens.forEach((token) => {
        scoreMap.set(token, (scoreMap.get(token) || 0) + 1);
      });
    });

  return [...scoreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token]) => token);
}

function extractUrlsFromText(text) {
  const matches = asText(text).match(/https?:\/\/[^\s)]+/gi);
  return matches ? uniqueStrings(matches) : [];
}

function normalizeReference(entry, fallbackType) {
  if (!entry) return null;
  if (typeof entry === "string") {
    const text = normalizeWhitespace(entry);
    if (!text) return null;
    return {
      type: fallbackType,
      title: "",
      url: text.startsWith("http") ? text : "",
      text,
    };
  }
  if (typeof entry !== "object" || Array.isArray(entry)) return null;

  const title = normalizeWhitespace(entry.title || entry.name || "");
  const url = normalizeWhitespace(entry.url || entry.link || "");
  const text = normalizeWhitespace(entry.text || entry.summary || entry.content || entry.extractedText || "");
  if (!title && !url && !text) return null;

  return {
    type: normalizeWhitespace(entry.type || fallbackType) || fallbackType,
    title,
    url,
    text: text || title || url,
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function collectCreationCenterContext(payload, brief) {
  const source = parseJsonSafe(payload?.creationCenter) || {};
  const support = normalizeWhitespace(
    source.support || source.format || source.channel || source.canal || source.platform || payload.support || "",
  );
  const target = normalizeWhitespace(
    source.target || source.cible || source.audience || source.persona || payload.target || payload.cible || "",
  );
  const objective = normalizeWhitespace(
    source.objective || source.goal || source.objectif || source.intent || payload.objective || payload.objectif || "",
  );
  const message = normalizeWhitespace(
    source.message || source.request || source.brief || source.prompt || payload.message || brief,
  );
  const request = normalizeWhitespace(source.request || source.brief || message || brief);
  const topic = normalizeWhitespace(source.topic || "");

  const rawUrls = [
    ...extractUrlsFromText(message),
    ...extractUrlsFromText(request),
    ...extractUrlsFromText(topic),
    ...extractUrlsFromText(asText(source.url)),
    ...extractUrlsFromText(asText(source.productUrl)),
    ...extractUrlsFromText(asText(payload.url)),
    ...extractUrlsFromText(asText(payload.productUrl)),
    ...asArray(source.urls)
      .map((entry) => (typeof entry === "string" ? entry : asText(entry?.url || entry?.link || "")))
      .flatMap((url) => extractUrlsFromText(url)),
  ];

  const urlRefs = uniqueStrings(rawUrls).map((url) => ({
    type: "creation-url",
    title: "",
    url,
    text: url,
  }));

  const fileRefs = [
    ...asArray(source.files),
    ...asArray(source.documents),
    ...asArray(source.attachments),
    ...asArray(source.references),
  ]
    .map((entry) => normalizeReference(entry, "creation-doc"))
    .filter(Boolean);

  const references = [...urlRefs, ...fileRefs];
  const sourceTexts = uniqueStrings([
    support,
    target,
    objective,
    message,
    request,
    topic,
    ...references.map((ref) => ref.text),
    ...references.map((ref) => ref.title),
  ]);

  return {
    support,
    target,
    objective,
    message,
    request,
    topic,
    references,
    sourceTexts,
    keywords: takeTopKeywords(sourceTexts),
    referenceCount: references.length,
    urlCount: urlRefs.length,
    docCount: fileRefs.length,
  };
}

function collectBrandVaultContext(payload) {
  const source = parseJsonSafe(payload?.brandVault) || {};
  const refs = [
    ...asArray(source.references),
    ...asArray(source.urls),
    ...asArray(source.files),
    ...asArray(source.documents),
    ...asArray(source.assets),
  ]
    .map((entry) => normalizeReference(entry, "brand-vault"))
    .filter(Boolean);

  const guardrails = uniqueStrings([
    asText(source.summary),
    asText(source.voice),
    asText(source.tone),
    asText(source.visualIntent),
    asText(source.semanticIntent),
    ...refs.map((ref) => ref.text),
    ...refs.map((ref) => ref.title),
  ]);

  return {
    references: refs,
    guardrails,
    guardrailText: guardrails.join("\n"),
    keywords: takeTopKeywords(guardrails, 20),
    referenceCount: refs.length,
  };
}

function getMissingCreationFields(context) {
  const missing = [];
  if (!asText(context.support)) missing.push("support");
  if (!asText(context.target)) missing.push("cible");
  if (!asText(context.objective)) missing.push("objectif");
  if (!asText(context.message)) missing.push("message");
  return missing;
}

function compactReferenceForPrompt(ref) {
  const title = asText(ref.title);
  const url = asText(ref.url);
  const text = normalizeWhitespace(ref.text).slice(0, 280);
  return [title ? `title=${title}` : "", url ? `url=${url}` : "", text ? `text=${text}` : ""]
    .filter(Boolean)
    .join(" | ");
}

function normalizeMistralContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) return asText(part.text);
      return "";
    })
    .join("\n")
    .trim();
}

async function callMistralJson({ systemPrompt, userPrompt, temperature = 0.2 }) {
  const apiKey = getMistralKey();
  if (!apiKey) {
    return { ok: false, error: "MISTRAL_API_KEY missing" };
  }

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MISTRAL_MODEL,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        ok: false,
        error: `Mistral HTTP ${response.status}${text ? `: ${text.slice(0, 220)}` : ""}`,
      };
    }

    const payload = await response.json();
    const raw = normalizeMistralContent(payload?.choices?.[0]?.message?.content);
    const parsed = parseJsonSafe(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Invalid JSON response from Mistral" };
    }

    return { ok: true, data: parsed };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Mistral request failed",
    };
  }
}

async function evaluateCoherenceWithMistral({ creationContext, brandContext, threshold, stage, assets }) {
  const systemPrompt =
    "You are ORA Studio compliance gate. You score only from evidence. Return strictly valid JSON with numeric scores 0-100.";

  const creationRefs = creationContext.references.slice(0, 12).map(compactReferenceForPrompt).filter(Boolean);
  const brandRefs = brandContext.references.slice(0, 12).map(compactReferenceForPrompt).filter(Boolean);
  const assetLines = Array.isArray(assets)
    ? assets.slice(0, 12).map((asset) => `${asset.title} | ${asset.channel} | ${normalizeWhitespace(asset.body).slice(0, 320)}`)
    : [];

  const userPrompt = [
    `Stage: ${stage}`,
    `Threshold: ${threshold}`,
    `Support: ${creationContext.support || "(missing)"}`,
    `Target: ${creationContext.target || "(missing)"}`,
    `Objective: ${creationContext.objective || "(missing)"}`,
    `Message: ${creationContext.message || "(missing)"}`,
    `Creation request: ${creationContext.request}`,
    `Creation topic: ${creationContext.topic || "(none)"}`,
    "Creation references:",
    creationRefs.length ? creationRefs.join("\n") : "(none)",
    "Brand Vault guardrails:",
    brandContext.guardrails.slice(0, 10).join("\n") || "(none)",
    "Brand Vault references:",
    brandRefs.length ? brandRefs.join("\n") : "(none)",
    stage === "post_generation" ? "Generated assets to evaluate:" : "",
    stage === "post_generation" ? (assetLines.length ? assetLines.join("\n") : "(none)") : "",
    "Return JSON schema:",
    "{",
    '  "layoutCoherence": number,',
    '  "semanticCoherence": number,',
    '  "visualIntentCoherence": number,',
    '  "overallCoherence": number,',
    '  "approved": boolean,',
    '  "issues": ["string", ...],',
    '  "decision": "APPROVE|BLOCK"',
    "}",
    "Rules:",
    "1) overallCoherence MUST equal: semantic*0.4 + layout*0.3 + visual*0.3 (rounded 0-100).",
    "2) APPROVE only if overallCoherence >= threshold.",
    "3) Brand Vault content is for constraints only, not copy source.",
    "4) Output must remain specific to the Creation request.",
    "5) Layout coherence must evaluate platform-fit and structure.",
    "6) Semantic coherence must evaluate tone, lexicon, banned words risk.",
    "7) Visual intent coherence must evaluate mood/style/palette consistency.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await callMistralJson({
    systemPrompt,
    userPrompt,
    temperature: 0.1,
  });

  if (!result.ok) {
    return {
      ok: false,
      approved: false,
      scores: { layout: 0, semantic: 0, visual: 0, overall: 0 },
      issues: [`Coherence evaluation unavailable: ${result.error}`],
      reason: result.error,
    };
  }

  const data = result.data;
  const scores = {
    layout: scoreClamp(data.layoutCoherence, 0),
    semantic: scoreClamp(data.semanticCoherence, 0),
    visual: scoreClamp(data.visualIntentCoherence, 0),
  };
  const weightedOverall = computeWeightedCompliance({
    semantic: scores.semantic,
    layout: scores.layout,
    visual: scores.visual,
  });
  const reportedOverall = scoreClamp(data.overallCoherence, weightedOverall);
  const overall = Math.round((weightedOverall + reportedOverall) / 2);

  const issues = asArray(data.issues).map((issue) => asText(issue)).filter(Boolean);
  const approved = overall >= threshold;

  return {
    ok: true,
    approved,
    scores: {
      ...scores,
      overall,
      weightedOverall,
      reportedOverall,
      semanticPoints: Number((scores.semantic * 0.4).toFixed(1)),
      layoutPoints: Number((scores.layout * 0.3).toFixed(1)),
      visualPoints: Number((scores.visual * 0.3).toFixed(1)),
    },
    issues,
    reason: approved ? "approved" : "Below threshold",
  };
}

function normalizePlan(plan, creationContext, coherenceScore) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) return null;
  const assetsRaw = asArray(plan.assets);
  if (!assetsRaw.length) return null;

  const normalizedAssets = assetsRaw
    .map((asset, index) => {
      if (!asset || typeof asset !== "object" || Array.isArray(asset)) return null;
      const type = asText(asset.type) || "linkedin-post";
      const isVideo = /video/i.test(type);
      const title = asText(asset.title) || (isVideo ? "Short Video" : `Asset ${index + 1}`);
      const channel = asText(asset.channel) || (isVideo ? "Video" : "Social");
      const body = normalizeWhitespace(asset.body || asset.copy || "");
      const prompt = normalizeWhitespace(asset.prompt || asset.imagePrompt || asset.videoPrompt || "");
      if (!body) return null;

      return {
        type,
        title,
        channel,
        body,
        prompt: prompt || `Create a brand-compliant ${channel} visual based on: ${creationContext.request}`,
        compliance: scoreClamp(asset.compliance, coherenceScore),
        mediaType: isVideo ? "video" : "image",
      };
    })
    .filter(Boolean);

  if (!normalizedAssets.length) return null;

  return {
    campaignName: asText(plan.campaignName) || campaignNameFromBrief(creationContext.request),
    summary: asText(plan.summary) || "Campaign plan generated from Creation Center.",
    score: scoreClamp(plan.score, coherenceScore),
    assets: normalizedAssets,
  };
}

async function generatePlanWithMistral({ creationContext, brandContext, threshold, coherenceScore }) {
  const systemPrompt =
    "You are ORA Studio campaign generator. Brand Vault is constraint input only. Creation Center is the only content source. Return strict JSON.";

  const creationRefs = creationContext.references.slice(0, 16).map(compactReferenceForPrompt).filter(Boolean);
  const brandGuardrails = brandContext.guardrails.slice(0, 14);

  const userPrompt = [
    `Support: ${creationContext.support}`,
    `Target/Cible: ${creationContext.target}`,
    `Objective: ${creationContext.objective}`,
    `Message: ${creationContext.message}`,
    `Creation request: ${creationContext.request}`,
    `Creation topic: ${creationContext.topic || "(none)"}`,
    "Creation references:",
    creationRefs.length ? creationRefs.join("\n") : "(none)",
    "Brand constraints (do not copy verbatim):",
    brandGuardrails.length ? brandGuardrails.join("\n") : "(none)",
    `Compliance threshold: ${threshold}`,
    "Return JSON schema:",
    "{",
    '  "campaignName": "string",',
    '  "summary": "string",',
    `  "score": number (>= ${threshold}),`,
    '  "assets": [',
    "    {",
    '      "type": "linkedin-post|facebook-post|instagram-post|email|short-video",',
    '      "title": "string",',
    '      "channel": "string",',
    '      "body": "string",',
    '      "prompt": "string",',
    `      "compliance": number (>= ${threshold})`,
    "    }",
    "  ]",
    "}",
    "Mandatory rules:",
    "1) Use only Creation Center information to create claims, facts, offer, and CTA.",
    "2) Brand Vault controls style, semantics, visual intent only.",
    "3) Never copy text snippets from Brand Vault references.",
    "4) Keep outputs concrete and specific to the request.",
    "5) Include at least 4 assets and at least 1 short-video.",
    "6) French language if request is French, else keep request language.",
  ].join("\n");

  const result = await callMistralJson({
    systemPrompt,
    userPrompt,
    temperature: 0.35,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const plan = normalizePlan(result.data, creationContext, coherenceScore);
  if (!plan) {
    return { ok: false, error: "Invalid campaign plan returned by Mistral" };
  }

  return { ok: true, plan };
}

async function autoFixPlanWithMistral({
  plan,
  creationContext,
  brandContext,
  threshold,
  attempt,
  issues,
}) {
  const systemPrompt =
    "You are ORA Studio compliance fixer. Rewrite only what is needed to pass brand coherence checks. Return strict JSON only.";

  const issueList = issues.map((issue) => `- ${issue}`).join("\n") || "- Coherence below threshold";

  const userPrompt = [
    `Attempt: ${attempt}`,
    `Required threshold: ${threshold}`,
    `Support: ${creationContext.support}`,
    `Target: ${creationContext.target}`,
    `Objective: ${creationContext.objective}`,
    `Message: ${creationContext.message}`,
    "Current plan JSON:",
    JSON.stringify(plan),
    "Detected issues:",
    issueList,
    "Brand Vault control rules:",
    brandContext.guardrails.slice(0, 16).join("\n") || "(none)",
    "Return corrected JSON with the exact schema:",
    "{",
    '  "campaignName": "string",',
    '  "summary": "string",',
    `  "score": number (>= ${threshold}),`,
    '  "assets": [',
    "    {",
    '      "type": "linkedin-post|facebook-post|instagram-post|email|short-video",',
    '      "title": "string",',
    '      "channel": "string",',
    '      "body": "string",',
    '      "prompt": "string",',
    `      "compliance": number (>= ${threshold})`,
    "    }",
    "  ]",
    "}",
    "Mandatory constraints:",
    "1) Use only Creation Center information as content source.",
    "2) Brand Vault is style control only, no text reuse.",
    "3) Keep platform structure coherent with support and objective.",
    "4) Improve semantic/layout/visual intent coherence for threshold.",
  ].join("\n");

  const result = await callMistralJson({
    systemPrompt,
    userPrompt,
    temperature: 0.2,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const fixedPlan = normalizePlan(result.data, creationContext, threshold);
  if (!fixedPlan) {
    return { ok: false, error: "Auto-fix returned invalid plan" };
  }

  return { ok: true, plan: fixedPlan };
}

function createNgrams(tokens, size = 4) {
  if (tokens.length < size) return [];
  const ngrams = [];
  for (let i = 0; i <= tokens.length - size; i += 1) {
    ngrams.push(tokens.slice(i, i + size).join(" "));
  }
  return ngrams;
}

function ngramOverlapRatio(candidateText, sourceText, n = 4) {
  const sourceTokens = toTokenArray(sourceText);
  const candidateTokens = toTokenArray(candidateText);
  const sourceNgrams = new Set(createNgrams(sourceTokens, n));
  const candidateNgrams = createNgrams(candidateTokens, n);
  if (!sourceNgrams.size || !candidateNgrams.length) return 0;
  let hits = 0;
  candidateNgrams.forEach((ngram) => {
    if (sourceNgrams.has(ngram)) hits += 1;
  });
  return hits / candidateNgrams.length;
}

function maxCopiedWindowWords(candidateText, sourceText) {
  const candidateTokens = toTokenArray(candidateText);
  const sourceTokens = toTokenArray(sourceText);
  if (!candidateTokens.length || !sourceTokens.length) return 0;

  const sourcePositions = new Map();
  sourceTokens.forEach((token, index) => {
    const arr = sourcePositions.get(token) || [];
    arr.push(index);
    sourcePositions.set(token, arr);
  });

  let maxRun = 0;

  for (let i = 0; i < candidateTokens.length; i += 1) {
    const token = candidateTokens[i];
    const starts = sourcePositions.get(token);
    if (!starts) continue;

    for (const start of starts) {
      let run = 0;
      while (
        i + run < candidateTokens.length &&
        start + run < sourceTokens.length &&
        candidateTokens[i + run] === sourceTokens[start + run]
      ) {
        run += 1;
      }
      if (run > maxRun) maxRun = run;
      if (maxRun > MAX_LEAK_WORD_WINDOW + 4) return maxRun;
    }
  }

  return maxRun;
}

function evaluateAssetLocalPolicies({ assets, creationContext, brandContext }) {
  const issues = [];
  const creationAnchors = creationContext.keywords;
  const brandCorpus = brandContext.guardrailText;

  assets.forEach((asset) => {
    const body = normalizeWhitespace(asset.body);
    const prompt = normalizeWhitespace(asset.prompt || "");
    const surface = `${body}\n${prompt}`;

    if (brandCorpus) {
      const overlap = ngramOverlapRatio(surface, brandCorpus, 4);
      const copiedWindow = maxCopiedWindowWords(surface, brandCorpus);
      if (overlap > MAX_LEAK_NGRAM_RATIO || copiedWindow > MAX_LEAK_WORD_WINDOW) {
        issues.push(
          `${asset.title}: possible Brand Vault content reuse (overlap=${Math.round(overlap * 100)}%, copiedWindow=${copiedWindow} words).`,
        );
      }
    }

    if (creationAnchors.length) {
      const lowerSurface = surface.toLowerCase();
      const hits = creationAnchors.filter((keyword) => lowerSurface.includes(keyword.toLowerCase())).length;
      if (hits < Math.min(MIN_CREATION_ANCHOR_HITS, creationAnchors.length)) {
        issues.push(`${asset.title}: not sufficiently anchored to Creation Center request (anchor hits=${hits}).`);
      }
    }
  });

  return {
    passed: issues.length === 0,
    issues,
  };
}

function extractMediaUrl(output) {
  if (!output) return "";
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const nested = extractMediaUrl(item);
      if (nested) return nested;
    }
    return "";
  }
  if (typeof output === "object") {
    const directKeys = ["url", "video", "image", "file", "uri", "output"];
    for (const key of directKeys) {
      const nested = extractMediaUrl(output[key]);
      if (nested) return nested;
    }
  }
  return "";
}

function getReplicateVideoInputOverrides() {
  const raw = process.env.REPLICATE_VIDEO_INPUT_JSON;
  const parsed = parseJsonSafe(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed;
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

function getReplicateVideoModelCandidates() {
  return uniqueNonEmpty([
    process.env.REPLICATE_VIDEO_MODEL,
    process.env.REPLICATE_VIDEO_MODEL_KLING,
    process.env.REPLICATE_VIDEO_MODEL_RUNWAY,
    process.env.REPLICATE_VIDEO_MODEL_VEO,
    process.env.REPLICATE_VIDEO_MODEL_KLING2,
    process.env.REPLICATE_VIDEO_MODEL_RUNWAY_GEN4,
    process.env.REPLICATE_VIDEO_MODEL_VEO2,
    "minimax/video-01-live",
    "luma/ray-2-720p",
    "luma/ray",
  ]);
}

function getFalImageInputOverrides() {
  const raw = process.env.FAL_IMAGE_INPUT_JSON;
  const parsed = parseJsonSafe(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed;
}

function getFalVideoInputOverrides() {
  const raw = process.env.FAL_VIDEO_INPUT_JSON;
  const parsed = parseJsonSafe(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed;
}

function getFalVideoModelCandidates({ assetType = "", modelHint = "" } = {}) {
  const source = `${asText(assetType)} ${asText(modelHint)}`.toLowerCase();
  const byType =
    source.includes("kling")
      ? asText(process.env.FAL_VIDEO_MODEL_KLING) || "fal-ai/kling-video/o3/pro/text-to-video"
      : source.includes("runway")
        ? asText(process.env.FAL_VIDEO_MODEL_RUNWAY)
        : source.includes("veo")
          ? asText(process.env.FAL_VIDEO_MODEL_VEO)
          : "";

  return uniqueNonEmpty([byType, DEFAULT_FAL_VIDEO_MODEL]).map(normalizeFalModelPath).filter(Boolean);
}

async function replicateRequest(method, url, body) {
  const token = getReplicateToken();
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Prefer: `wait=${DEFAULT_WAIT_SECONDS}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = asText(payload?.detail) || asText(payload?.error) || `Replicate HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function falRequest(method, url, body) {
  const token = getFalToken();
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Key ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = asText(payload?.detail) || asText(payload?.error) || `fal.ai HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

async function waitForReplicatePrediction(prediction) {
  if (!prediction?.urls?.get) return prediction;
  let current = prediction;
  let attempts = 0;
  while (attempts < 8 && (current?.status === "starting" || current?.status === "processing")) {
    attempts += 1;
    await sleep(1800);
    current = await replicateRequest("GET", current.urls.get);
  }
  return current;
}

function normalizeFalModelPath(model) {
  const clean = asText(model).replace(/^\/+|\/+$/g, "");
  if (!clean) return "";
  if (clean.startsWith("https://")) return clean;
  return `https://queue.fal.run/${clean}`;
}

function getFalStatus(payload) {
  return asText(payload?.status || payload?.state || payload?.request_status || payload?.queue_status).toLowerCase();
}

async function waitForFalRequest({ responseUrl, statusUrl }) {
  let attempts = 0;
  while (attempts < 8) {
    attempts += 1;

    if (responseUrl) {
      const outputPayload = await falRequest("GET", responseUrl);
      const outputUrl = extractMediaUrl(outputPayload?.images || outputPayload?.video || outputPayload?.data || outputPayload?.output || outputPayload);
      if (outputUrl) {
        return {
          mediaUrl: outputUrl,
          mediaStatus: "ready",
          mediaProvider: "fal",
        };
      }

      const outputStatus = getFalStatus(outputPayload);
      if (outputStatus === "failed" || outputStatus === "error" || outputStatus === "canceled") {
        return {
          mediaUrl: "",
          mediaStatus: "failed",
          mediaProvider: "fal",
          error: asText(outputPayload?.error) || "fal.ai generation failed",
        };
      }
    }

    if (statusUrl) {
      const statusPayload = await falRequest("GET", statusUrl);
      const status = getFalStatus(statusPayload);
      if (status === "failed" || status === "error" || status === "canceled") {
        return {
          mediaUrl: "",
          mediaStatus: "failed",
          mediaProvider: "fal",
          error: asText(statusPayload?.error) || "fal.ai request failed",
        };
      }
      if (status === "completed" || status === "succeeded" || status === "success" || status === "ok") {
        const immediateUrl = extractMediaUrl(statusPayload?.images || statusPayload?.video || statusPayload?.data || statusPayload?.output || statusPayload);
        if (immediateUrl) {
          return {
            mediaUrl: immediateUrl,
            mediaStatus: "ready",
            mediaProvider: "fal",
          };
        }
      }
    }

    await sleep(1800);
  }

  return {
    mediaUrl: "",
    mediaStatus: "processing",
    mediaProvider: "fal",
  };
}

async function generateImageWithFal({ prompt }) {
  const token = getFalToken();
  if (!token) {
    return { mediaUrl: "", mediaStatus: "skipped", mediaProvider: "fallback", error: "FAL_API_KEY missing" };
  }

  const endpoint = normalizeFalModelPath(DEFAULT_FAL_IMAGE_MODEL);
  if (!endpoint) {
    return {
      mediaUrl: "",
      mediaStatus: "skipped",
      mediaProvider: "fallback",
      error: "FAL_IMAGE_MODEL missing",
    };
  }

  const input = {
    prompt: asText(prompt) || "Brand-compliant campaign visual",
    ...getFalImageInputOverrides(),
  };

  try {
    const created = await falRequest("POST", endpoint, input);
    const immediateUrl = extractMediaUrl(created?.images || created?.video || created?.data || created?.output || created);
    if (immediateUrl) {
      return {
        mediaUrl: immediateUrl,
        mediaStatus: "ready",
        mediaProvider: "fal",
      };
    }

    const requestId = asText(created?.request_id || created?.requestId || created?.id);
    const statusUrl =
      asText(created?.status_url || created?.statusUrl || created?.urls?.status) ||
      (requestId ? `${endpoint}/requests/${requestId}/status` : "");
    const responseUrl =
      asText(created?.response_url || created?.responseUrl || created?.urls?.response || created?.urls?.result) ||
      (requestId ? `${endpoint}/requests/${requestId}` : "");

    if (!statusUrl && !responseUrl) {
      return {
        mediaUrl: "",
        mediaStatus: "processing",
        mediaProvider: "fal",
      };
    }

    return await waitForFalRequest({ responseUrl, statusUrl });
  } catch (error) {
    return {
      mediaUrl: "",
      mediaStatus: "failed",
      mediaProvider: "fal",
      error: error instanceof Error ? error.message : "fal.ai error",
    };
  }
}

async function generateVideoWithFal({ prompt, assetType = "", modelHint = "" }) {
  const token = getFalToken();
  if (!token) {
    return { mediaUrl: "", mediaStatus: "skipped", mediaProvider: "fallback", error: "FAL_API_KEY missing" };
  }

  const candidates = getFalVideoModelCandidates({ assetType, modelHint });
  if (!candidates.length) {
    return {
      mediaUrl: "",
      mediaStatus: "skipped",
      mediaProvider: "fallback",
      error: "FAL_VIDEO_MODEL missing",
    };
  }

  const input = {
    prompt: asText(prompt) || "Brand-compliant campaign visual",
    duration: 5,
    aspect_ratio: "16:9",
    ...getFalVideoInputOverrides(),
  };

  let lastError = "";
  for (const endpoint of candidates) {
    try {
      const created = await falRequest("POST", endpoint, input);
      const immediateUrl = extractMediaUrl(created?.video || created?.videos || created?.images || created?.data || created?.output || created);
      if (immediateUrl) {
        return {
          mediaUrl: immediateUrl,
          mediaStatus: "ready",
          mediaProvider: "fal",
        };
      }

      const requestId = asText(created?.request_id || created?.requestId || created?.id);
      const statusUrl =
        asText(created?.status_url || created?.statusUrl || created?.urls?.status) ||
        (requestId ? `${endpoint}/requests/${requestId}/status` : "");
      const responseUrl =
        asText(created?.response_url || created?.responseUrl || created?.urls?.response || created?.urls?.result) ||
        (requestId ? `${endpoint}/requests/${requestId}` : "");

      const waited = await waitForFalRequest({ responseUrl, statusUrl });
      if (waited.mediaUrl) return waited;

      lastError = asText(waited.error);
      if (!/not found|404|unknown model|invalid/i.test(lastError)) {
        return waited;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "fal.ai video error";
      if (!/not found|404|unknown model|invalid/i.test(lastError)) {
        return {
          mediaUrl: "",
          mediaStatus: "failed",
          mediaProvider: "fal",
          error: lastError,
        };
      }
    }
  }

  return {
    mediaUrl: "",
    mediaStatus: "failed",
    mediaProvider: "fal",
    error: lastError || "No compatible FAL video model found",
  };
}

async function generateVideoWithReplicate({ prompt }) {
  const token = getReplicateToken();
  if (!token) {
    return { mediaUrl: "", mediaStatus: "skipped", mediaProvider: "fallback", error: "REPLICATE token missing" };
  }

  const candidates = getReplicateVideoModelCandidates();
  if (!candidates.length) {
    return {
      mediaUrl: "",
      mediaStatus: "skipped",
      mediaProvider: "fallback",
      error: "REPLICATE_VIDEO_MODEL missing (or invalid)",
    };
  }
  const defaultInput = { prompt: asText(prompt) || "Brand-compliant campaign visual" };
  const input = { ...defaultInput, ...getReplicateVideoInputOverrides() };

  let lastError = "";
  for (const model of candidates) {
    const cleanModel = normalizeReplicateModelSlug(model);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const createUrl = `https://api.replicate.com/v1/models/${cleanModel}/predictions`;
        const created = await replicateRequest("POST", createUrl, { input });
        const resolved = await waitForReplicatePrediction(created);
        const mediaUrl = extractMediaUrl(resolved?.output);

        if (resolved?.status === "succeeded" && mediaUrl) {
          return {
            mediaUrl,
            mediaStatus: "ready",
            mediaProvider: "replicate",
          };
        }

        if (resolved?.status === "failed" || resolved?.status === "canceled") {
          const message = asText(resolved?.error) || "Prediction failed";
          if (/could not be found|resource not found|404/i.test(message)) {
            lastError = message;
            break;
          }
          return {
            mediaUrl: "",
            mediaStatus: "failed",
            mediaProvider: "replicate",
            error: message,
          };
        }

        return {
          mediaUrl: mediaUrl || "",
          mediaStatus: mediaUrl ? "ready" : "processing",
          mediaProvider: "replicate",
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Replicate error";
        const status = typeof error?.status === "number" ? error.status : 0;
        const throttled = status === 429 || /throttled|rate limit|too many requests/i.test(message);
        const retryAfterMatch = message.match(/resets in ~?(\d+)s/i);
        const retrySeconds = retryAfterMatch ? Number(retryAfterMatch[1]) : 10;
        if (throttled && attempt < 2) {
          await sleep((Number.isFinite(retrySeconds) ? retrySeconds : 10) * 1000 + 600);
          continue;
        }
        lastError = message;
        if (/could not be found|resource not found|404/i.test(message)) {
          break;
        }
        return {
          mediaUrl: "",
          mediaStatus: "failed",
          mediaProvider: "replicate",
          error: message,
        };
      }
    }
  }

  if (lastError) {
    return {
      mediaUrl: "",
      mediaStatus: "failed",
      mediaProvider: "replicate",
      error: lastError,
    };
  }

  return {
    mediaUrl: "",
    mediaStatus: "failed",
    mediaProvider: "replicate",
    error: "No compatible Replicate video model found",
  };
}

async function generateImageWithReplicate({ prompt }) {
  const token = getReplicateToken();
  if (!token) {
    return { mediaUrl: "", mediaStatus: "skipped", mediaProvider: "fallback", error: "REPLICATE token missing" };
  }

  const model = normalizeReplicateModelSlug(asText(process.env.REPLICATE_IMAGE_MODEL));
  if (!model) {
    return { mediaUrl: "", mediaStatus: "skipped", mediaProvider: "fallback", error: "REPLICATE_IMAGE_MODEL missing" };
  }

  try {
    const createUrl = `https://api.replicate.com/v1/models/${model}/predictions`;
    const created = await replicateRequest("POST", createUrl, {
      input: {
        prompt: asText(prompt) || "Brand-compliant campaign visual",
      },
    });
    const resolved = await waitForReplicatePrediction(created);
    const mediaUrl = extractMediaUrl(resolved?.output);

    if (resolved?.status === "succeeded" && mediaUrl) {
      return {
        mediaUrl,
        mediaStatus: "ready",
        mediaProvider: "replicate",
      };
    }

    if (resolved?.status === "failed" || resolved?.status === "canceled") {
      return {
        mediaUrl: "",
        mediaStatus: "failed",
        mediaProvider: "replicate",
        error: asText(resolved?.error) || "Prediction failed",
      };
    }

    return {
      mediaUrl: mediaUrl || "",
      mediaStatus: mediaUrl ? "ready" : "processing",
      mediaProvider: "replicate",
    };
  } catch (error) {
    return {
      mediaUrl: "",
      mediaStatus: "failed",
      mediaProvider: "replicate",
      error: error instanceof Error ? error.message : "Replicate image error",
    };
  }
}

function blockedResponse({ campaignName, score, reasons, provider, models, details }) {
  return {
    ok: true,
    blocked: true,
    provider,
    campaignName,
    score: scoreClamp(score, 0),
    messages: [
      {
        agent: "ORA",
        role: "Brand Analyst",
        text: "Validation in progress: Brand Vault constraints vs Creation Center request.",
      },
      {
        agent: "ORA",
        role: "Compliance Gate",
        text: `Cet asset n'atteint pas le seuil de conformité (score: ${scoreClamp(score, 0)}/100). Voici les points à corriger.`,
      },
      {
        agent: "ORA",
        role: "Action Required",
        text: "Refine the Creation Center request and/or Brand Vault references, then regenerate.",
      },
    ],
    assets: [],
    warnings: reasons,
    details,
    models,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const payload = parseJsonSafe(req.body) || {};
  const brief = normalizeWhitespace(payload.brief);
  const threshold = scoreClamp(payload.strictThreshold, scoreClamp(DEFAULT_STRICT_THRESHOLD, 98));

  if (!brief) {
    res.status(400).json({ error: "brief is required" });
    return;
  }

  const creationContext = collectCreationCenterContext(payload, brief);
  const brandContext = collectBrandVaultContext(payload);

  if (!creationContext.request) {
    res.status(400).json({ error: "Creation Center request is required" });
    return;
  }

  const missingCreationFields = getMissingCreationFields(creationContext);

  const models = {
    mistral: DEFAULT_MISTRAL_MODEL,
    falImage: DEFAULT_FAL_IMAGE_MODEL || null,
    replicateVideo: DEFAULT_VIDEO_MODEL || null,
  };

  if (missingCreationFields.length) {
    res.status(200).json(
      blockedResponse({
        campaignName: campaignNameFromBrief(brief),
        score: 0,
        provider: "blocked",
        reasons: [
          `Creation Center fields missing: ${missingCreationFields.join(", ")}.`,
          "Required fields: support, cible, objectif, message.",
        ],
        models,
        details: {
          threshold,
          stage: "creation_center_validation",
          missingCreationFields,
        },
      }),
    );
    return;
  }

  if (!brandContext.guardrails.length) {
    res.status(200).json(
      blockedResponse({
        campaignName: campaignNameFromBrief(brief),
        score: 0,
        provider: "blocked",
        reasons: [
          "Brand Vault context missing. Add URL/PDF/PPT/PPTX references to validate layout, semantics, and visual intent.",
        ],
        models,
        details: {
          threshold,
          stage: "pre_generation",
        },
      }),
    );
    return;
  }

  const preCheck = await evaluateCoherenceWithMistral({
    creationContext,
    brandContext,
    threshold,
    stage: "pre_generation",
  });

  if (!preCheck.approved) {
    res.status(200).json(
      blockedResponse({
        campaignName: campaignNameFromBrief(brief),
        score: preCheck.scores.overall,
        provider: "mistral",
        reasons: preCheck.issues.length ? preCheck.issues : ["Coherence check failed before generation."],
        models,
        details: {
          threshold,
          preCheck,
        },
      }),
    );
    return;
  }

  const planResult = await generatePlanWithMistral({
    creationContext,
    brandContext,
    threshold,
    coherenceScore: preCheck.scores.overall,
  });

  if (!planResult.ok) {
    res.status(200).json(
      blockedResponse({
        campaignName: campaignNameFromBrief(brief),
        score: preCheck.scores.overall,
        provider: "mistral",
        reasons: [`Generation unavailable: ${planResult.error}`],
        models,
        details: {
          threshold,
          preCheck,
        },
      }),
    );
    return;
  }

  let workingPlan = planResult.plan;
  let assets = workingPlan.assets.map((asset) => ({
    type: asset.type,
    title: asset.title,
    channel: asset.channel,
    body: asset.body,
    compliance: scoreClamp(asset.compliance, Math.max(preCheck.scores.overall, threshold)),
    mediaType: asset.mediaType,
    mediaUrl: "",
    mediaStatus: "skipped",
    mediaProvider: "fallback",
    prompt: asset.prompt,
  }));

  const autoFixAttempts = [];
  let localPolicy = evaluateAssetLocalPolicies({
    assets,
    creationContext,
    brandContext,
  });
  let postCheck = await evaluateCoherenceWithMistral({
    creationContext,
    brandContext,
    threshold,
    stage: "post_generation",
    assets,
  });

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const currentIssues = [
      ...(localPolicy.passed ? [] : localPolicy.issues),
      ...(postCheck.approved ? [] : postCheck.issues.length ? postCheck.issues : ["Post-generation coherence below threshold."]),
    ];

    if (!currentIssues.length) break;

    const autoFix = await autoFixPlanWithMistral({
      plan: workingPlan,
      creationContext,
      brandContext,
      threshold,
      attempt,
      issues: currentIssues,
    });

    autoFixAttempts.push({
      attempt,
      issues: currentIssues,
      ok: autoFix.ok,
      error: autoFix.ok ? null : autoFix.error,
    });

    if (!autoFix.ok) {
      break;
    }

    workingPlan = autoFix.plan;
    assets = workingPlan.assets.map((asset) => ({
      type: asset.type,
      title: asset.title,
      channel: asset.channel,
      body: asset.body,
      compliance: scoreClamp(asset.compliance, Math.max(postCheck.scores.overall, threshold)),
      mediaType: asset.mediaType,
      mediaUrl: "",
      mediaStatus: "skipped",
      mediaProvider: "fallback",
      prompt: asset.prompt,
    }));

    localPolicy = evaluateAssetLocalPolicies({
      assets,
      creationContext,
      brandContext,
    });
    postCheck = await evaluateCoherenceWithMistral({
      creationContext,
      brandContext,
      threshold,
      stage: "post_generation",
      assets,
    });
  }

  const blockingIssues = [
    ...(localPolicy.passed ? [] : localPolicy.issues),
    ...(postCheck.approved ? [] : postCheck.issues.length ? postCheck.issues : ["Post-generation coherence below threshold."]),
  ];

  if (blockingIssues.length) {
    res.status(200).json(
      blockedResponse({
        campaignName: workingPlan.campaignName || campaignNameFromBrief(brief),
        score: postCheck.scores.overall,
        provider: "mistral",
        reasons: blockingIssues,
        models,
        details: {
          threshold,
          preCheck,
          postCheck,
          autoFixAttempts,
          stage: "post_generation_blocked_after_autofix",
        },
      }),
    );
    return;
  }

  const warnings = [];
  const imageIndex = assets.findIndex((asset) => asset.mediaType === "image");
  const videoIndex = assets.findIndex((asset) => asset.mediaType === "video");

  if (imageIndex >= 0) {
    const imageResult = await generateImageWithFal({
      prompt: assets[imageIndex].prompt,
    });
    let finalImageResult = imageResult;
    if (!imageResult.mediaUrl) {
      const replicateImageResult = await generateImageWithReplicate({
        prompt: assets[imageIndex].prompt,
      });
      if (replicateImageResult.mediaUrl) {
        finalImageResult = replicateImageResult;
      } else if (replicateImageResult.error) {
        finalImageResult = {
          ...imageResult,
          error: `${asText(imageResult.error)} | ${asText(replicateImageResult.error)}`.trim(),
        };
      }
    }
    assets[imageIndex] = { ...assets[imageIndex], ...finalImageResult };
    if (finalImageResult.error) warnings.push(`Image: ${finalImageResult.error}`);
  }

  if (videoIndex >= 0) {
    const videoAsset = assets[videoIndex];
    const falVideoResult = await generateVideoWithFal({
      prompt: videoAsset.prompt,
      assetType: videoAsset.type,
      modelHint: videoAsset.platform || videoAsset.title || "",
    });
    const videoResult = falVideoResult.mediaUrl
      ? falVideoResult
      : await generateVideoWithReplicate({
      prompt: assets[videoIndex].prompt,
    });
    assets[videoIndex] = { ...assets[videoIndex], ...videoResult };
    if (videoResult.error) warnings.push(`Video: ${videoResult.error}`);
  }

  const responseAssets = assets.map(({ prompt, ...asset }) => asset);
  const finalScore = Math.min(preCheck.scores.overall, postCheck.scores.overall);

  res.status(200).json({
    ok: true,
    blocked: false,
    provider: "mistral",
    campaignName: workingPlan.campaignName,
    score: scoreClamp(finalScore, threshold),
    messages: [
      {
        agent: "ORA",
        role: "Brand Analyst",
        text: `Brand Vault and Creation Center analyzed. Pre-check: layout ${preCheck.scores.layout}/100, semantic ${preCheck.scores.semantic}/100, visual ${preCheck.scores.visual}/100.`,
      },
      {
        agent: "ORA",
        role: "Strategic Planner",
        text: `Campaign plan generated from Creation Center inputs only (${responseAssets.length} assets). Brand Vault used as control constraints only. Support: ${creationContext.support}, Cible: ${creationContext.target}, Objectif: ${creationContext.objective}.`,
      },
      {
        agent: "ORA",
        role: "Compliance Gate",
        text: `Conformité: ${scoreClamp(finalScore, threshold)}/100 | Sémantique ${postCheck.scores.semanticPoints}/40 | Mise en page ${postCheck.scores.layoutPoints}/30 | Intention visuelle ${postCheck.scores.visualPoints}/30.`,
      },
      {
        agent: "ORA",
        role: "Campaign Multiplier",
        text: `Media generation status - Image: ${imageIndex >= 0 ? responseAssets[imageIndex].mediaStatus : "skipped"} · Video: ${videoIndex >= 0 ? responseAssets[videoIndex].mediaStatus : "skipped"}.`,
      },
    ],
    assets: responseAssets,
    warnings,
    details: {
      threshold,
      preCheck,
      postCheck,
      autoFixAttempts,
      creationContext: {
        support: creationContext.support,
        target: creationContext.target,
        objective: creationContext.objective,
        message: creationContext.message,
        referenceCount: creationContext.referenceCount,
        urlCount: creationContext.urlCount,
        docCount: creationContext.docCount,
      },
      brandContext: {
        referenceCount: brandContext.referenceCount,
      },
    },
    models,
  });
}
