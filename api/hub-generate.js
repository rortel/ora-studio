import { getBearerToken, getSupabaseUserFromToken } from "../server/auth.js";

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
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

function nowId(prefix = "run") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getReplicateToken() {
  return asText(process.env.REPLICATE_API_TOKEN) || asText(process.env.REPLICATE_API_KEY);
}

function getReplicateImageModel() {
  return normalizeReplicateModelSlug(asText(process.env.REPLICATE_IMAGE_MODEL)) || "black-forest-labs/flux-schnell";
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

function getReplicateVideoModelCandidates(modelId = "") {
  const id = asText(modelId).toLowerCase();
  const globalDefault = asText(process.env.REPLICATE_VIDEO_MODEL);
  const byType =
    id.includes("kling")
      ? asText(process.env.REPLICATE_VIDEO_MODEL_KLING || process.env.REPLICATE_VIDEO_MODEL_KLING2)
      : id.includes("runway")
        ? asText(process.env.REPLICATE_VIDEO_MODEL_RUNWAY || process.env.REPLICATE_VIDEO_MODEL_RUNWAY_GEN4)
        : id.includes("veo")
          ? asText(process.env.REPLICATE_VIDEO_MODEL_VEO || process.env.REPLICATE_VIDEO_MODEL_VEO2)
          : "";
  const safeDefaults = [
    "minimax/video-01-live",
    "luma/ray-2-720p",
    "luma/ray",
  ];

  return uniqueNonEmpty([
    byType,
    globalDefault,
    asText(process.env.REPLICATE_VIDEO_MODEL_KLING),
    asText(process.env.REPLICATE_VIDEO_MODEL_RUNWAY),
    asText(process.env.REPLICATE_VIDEO_MODEL_VEO),
    ...safeDefaults,
  ]);
}

function getFalKey() {
  return asText(process.env.FAL_API_KEY) || asText(process.env.FAL_KEY);
}

function getFalVideoInputOverrides() {
  return parseJsonSafe(process.env.FAL_VIDEO_INPUT_JSON) || {};
}

function normalizeFalModelPath(value) {
  const clean = asText(value).replace(/^\/+|\/+$/g, "");
  if (!clean) return "";
  if (clean.startsWith("https://")) return clean;
  return `https://queue.fal.run/${clean}`;
}

function getFalVideoModelCandidates(modelId = "") {
  const id = asText(modelId).toLowerCase();
  const byType =
    id.includes("kling")
      ? asText(process.env.FAL_VIDEO_MODEL_KLING) || "fal-ai/kling-video/o3/pro/text-to-video"
      : id.includes("runway")
        ? asText(process.env.FAL_VIDEO_MODEL_RUNWAY)
        : id.includes("veo")
          ? asText(process.env.FAL_VIDEO_MODEL_VEO)
          : "";
  const globalDefault = asText(process.env.FAL_VIDEO_MODEL) || "fal-ai/minimax-video/hailuo-02";
  return uniqueNonEmpty([byType, globalDefault]).map(normalizeFalModelPath).filter(Boolean);
}

function getOpenAiKey() {
  return asText(process.env.OPENAI_API_KEY);
}

function getAnthropicKey() {
  return asText(process.env.ANTHROPIC_API_KEY);
}

function getGoogleKey() {
  return asText(process.env.GOOGLE_API_KEY);
}

function getMistralKey() {
  return asText(process.env.MISTRAL_API_KEY) || asText(process.env.MISTRAL_API);
}

function scoreClamp(value, fallback = 0) {
  const n = toNumber(value, fallback);
  return Math.max(0, Math.min(100, Math.round(n)));
}

function buildTextPrompt({ category, format, prompt }) {
  const cleanPrompt = asText(prompt);
  const cleanFormat = asText(format) || "free-prompt";

  const system =
    category === "code"
      ? "You are an expert software engineer. Return production-grade code with concise explanations only when necessary."
      : category === "audio"
        ? "You are an audio script writer. Return speaking-ready script text with pacing and clarity."
        : "You are a senior marketing copywriter. Produce clear, useful, specific outputs.";

  const user = [
    `Category: ${category}`,
    `Format: ${cleanFormat}`,
    "Instruction: answer in the same language as the user prompt.",
    "Do not use markdown code fences unless the user explicitly asks.",
    `Prompt:\n${cleanPrompt}`,
  ].join("\n");

  return { system, user };
}

async function callOpenAiText({ model, system, user, maxTokens = 700 }) {
  const key = getOpenAiKey();
  if (!key) return { ok: false, error: "OPENAI_API_KEY missing" };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = asText(payload?.error?.message || payload?.error || payload?.message);
      return { ok: false, error: `OpenAI HTTP ${response.status}${detail ? `: ${detail}` : ""}` };
    }

    const text = asText(payload?.choices?.[0]?.message?.content);
    if (!text) return { ok: false, error: "OpenAI empty response" };

    return { ok: true, text, provider: "OpenAI" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "OpenAI request failed" };
  }
}

async function callMistralText({ model, system, user, maxTokens = 700 }) {
  const key = getMistralKey();
  if (!key) return { ok: false, error: "MISTRAL_API_KEY missing" };

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = asText(payload?.error?.message || payload?.error || payload?.message);
      return { ok: false, error: `Mistral HTTP ${response.status}${detail ? `: ${detail}` : ""}` };
    }

    const text = asText(payload?.choices?.[0]?.message?.content);
    if (!text) return { ok: false, error: "Mistral empty response" };

    return { ok: true, text, provider: "Mistral" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Mistral request failed" };
  }
}

async function callAnthropicText({ model, system, user, maxTokens = 700 }) {
  const key = getAnthropicKey();
  if (!key) return { ok: false, error: "ANTHROPIC_API_KEY missing" };

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.6,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = asText(payload?.error?.message || payload?.error || payload?.message);
      return { ok: false, error: `Anthropic HTTP ${response.status}${detail ? `: ${detail}` : ""}` };
    }

    const text = Array.isArray(payload?.content)
      ? payload.content
          .map((item) => (item?.type === "text" ? asText(item?.text) : ""))
          .filter(Boolean)
          .join("\n")
      : "";

    if (!text) return { ok: false, error: "Anthropic empty response" };
    return { ok: true, text, provider: "Anthropic" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Anthropic request failed" };
  }
}

async function callGoogleText({ model, system, user, maxTokens = 700 }) {
  const key = getGoogleKey();
  if (!key) return { ok: false, error: "GOOGLE_API_KEY missing" };

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: system }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: user }],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: maxTokens,
        },
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = asText(payload?.error?.message || payload?.error || payload?.message);
      return { ok: false, error: `Google HTTP ${response.status}${detail ? `: ${detail}` : ""}` };
    }

    const text = Array.isArray(payload?.candidates?.[0]?.content?.parts)
      ? payload.candidates[0].content.parts
          .map((part) => asText(part?.text))
          .filter(Boolean)
          .join("\n")
      : "";

    if (!text) return { ok: false, error: "Google empty response" };
    return { ok: true, text, provider: "Google" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Google request failed" };
  }
}

function mapOpenAiTextModel(modelId) {
  const id = asText(modelId).toLowerCase();
  if (!id) return "gpt-4o-mini";
  if (id.startsWith("gpt-")) return id;
  if (id.includes("mini") || id.includes("flash") || id.includes("haiku") || id.includes("llama")) return "gpt-4o-mini";
  return "gpt-4o";
}

function mapAnthropicModel(modelId) {
  const id = asText(modelId).toLowerCase();
  if (!id) return "claude-3-haiku-20240307";
  if (id.startsWith("claude-")) return id;
  if (id.includes("haiku")) return "claude-3-haiku-20240307";
  return "claude-3-5-sonnet-20241022";
}

function mapGoogleModel(modelId) {
  const id = asText(modelId).toLowerCase();
  if (!id) return "gemini-1.5-flash";
  if (id.startsWith("gemini-")) return id;
  if (id.includes("flash")) return "gemini-1.5-flash";
  return "gemini-1.5-pro";
}

function mapMistralModel(modelId) {
  const id = asText(modelId).toLowerCase();
  if (!id) return "mistral-large-latest";
  if (id.startsWith("mistral-")) return id;
  if (id.includes("small")) return "mistral-small-latest";
  if (id.includes("mistral")) return "mistral-large-latest";
  if (id.includes("code")) return "codestral-latest";
  return "mistral-large-latest";
}

function inferProvider({ modelId, providerHint }) {
  const id = asText(modelId).toLowerCase();
  const hint = asText(providerHint).toLowerCase();
  if (hint.includes("anthropic") || id.includes("claude")) return "anthropic";
  if (hint.includes("google") || id.includes("gemini")) return "google";
  if (hint.includes("mistral") || id.includes("mistral") || id.includes("codestral")) return "mistral";
  if (hint.includes("openai") || id.includes("gpt") || id.includes("openai")) return "openai";
  return "openai";
}

async function generateTextLike({ category, format, prompt, modelId, providerHint }) {
  const { system, user } = buildTextPrompt({ category, format, prompt });
  const preferred = inferProvider({ modelId, providerHint });

  const attemptsByProvider = {
    anthropic: [
      () => callAnthropicText({ model: mapAnthropicModel(modelId), system, user }),
      () => callOpenAiText({ model: mapOpenAiTextModel(modelId), system, user }),
      () => callMistralText({ model: mapMistralModel(modelId), system, user }),
      () => callGoogleText({ model: mapGoogleModel(modelId), system, user }),
    ],
    google: [
      () => callGoogleText({ model: mapGoogleModel(modelId), system, user }),
      () => callOpenAiText({ model: mapOpenAiTextModel(modelId), system, user }),
      () => callMistralText({ model: mapMistralModel(modelId), system, user }),
      () => callAnthropicText({ model: mapAnthropicModel(modelId), system, user }),
    ],
    mistral: [
      () => callMistralText({ model: mapMistralModel(modelId), system, user }),
      () => callOpenAiText({ model: mapOpenAiTextModel(modelId), system, user }),
      () => callAnthropicText({ model: mapAnthropicModel(modelId), system, user }),
      () => callGoogleText({ model: mapGoogleModel(modelId), system, user }),
    ],
    openai: [
      () => callOpenAiText({ model: mapOpenAiTextModel(modelId), system, user }),
      () => callMistralText({ model: mapMistralModel(modelId), system, user }),
      () => callAnthropicText({ model: mapAnthropicModel(modelId), system, user }),
      () => callGoogleText({ model: mapGoogleModel(modelId), system, user }),
    ],
  };

  const attempts = attemptsByProvider[preferred] || attemptsByProvider.openai;
  let lastFailure = null;
  for (const attempt of attempts) {
    const result = await attempt();
    if (result.ok) return result;
    lastFailure = result;
  }

  return lastFailure || { ok: false, error: "No provider available" };
}

function extractMediaUrl(output) {
  if (!output) return "";
  if (typeof output === "string") return asText(output);
  if (Array.isArray(output)) {
    for (const item of output) {
      const hit = extractMediaUrl(item);
      if (hit) return hit;
    }
    return "";
  }
  if (typeof output === "object") {
    const direct = asText(output.url || output.image || output.video || output.output || output.src);
    if (direct) return direct;
    const nested = output.images || output.videos || output.data || output.result;
    return extractMediaUrl(nested);
  }
  return "";
}

async function replicateRequest(method, url, body, token) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = asText(payload?.detail || payload?.error || payload?.message);
    const error = new Error(detail || `Replicate HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function waitReplicatePrediction(prediction, token) {
  let current = prediction;
  for (let i = 0; i < 45; i += 1) {
    const status = asText(current?.status).toLowerCase();
    if (["succeeded", "failed", "canceled"].includes(status)) return current;
    const nextUrl = asText(current?.urls?.get);
    if (!nextUrl) break;
    await new Promise((resolve) => setTimeout(resolve, 1300));
    current = await replicateRequest("GET", nextUrl, null, token);
  }
  return current;
}

async function generateViaReplicate({ modelSlug, input }) {
  const token = getReplicateToken();
  if (!token) return { ok: false, error: "REPLICATE token missing" };
  const cleanSlug = normalizeReplicateModelSlug(modelSlug);
  if (!cleanSlug) return { ok: false, error: "REPLICATE model slug missing" };

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const created = await replicateRequest(
        "POST",
        `https://api.replicate.com/v1/models/${cleanSlug}/predictions`,
        { input },
        token,
      );
      const resolved = await waitReplicatePrediction(created, token);
      const status = asText(resolved?.status).toLowerCase();
      const mediaUrl = extractMediaUrl(resolved?.output);
      if (status === "succeeded" && mediaUrl) {
        return { ok: true, mediaUrl, provider: "Replicate" };
      }
      return {
        ok: false,
        error: asText(resolved?.error) || `Replicate prediction ${status || "unfinished"}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Replicate request failed";
      const status = typeof error?.status === "number" ? error.status : 0;
      const throttled = status === 429 || /throttled|rate limit|too many requests/i.test(message);
      const retryAfterMatch = message.match(/resets in ~?(\d+)s/i);
      const retrySeconds = retryAfterMatch ? Number(retryAfterMatch[1]) : 10;
      lastError = message;
      if (throttled && attempt < 2) {
        await sleep((Number.isFinite(retrySeconds) ? retrySeconds : 10) * 1000 + 600);
        continue;
      }
      return { ok: false, error: message };
    }
  }
  return { ok: false, error: lastError || "Replicate request failed" };
}

async function generateViaReplicateCandidates({ modelSlugs, input }) {
  const candidates = uniqueNonEmpty(modelSlugs);
  if (!candidates.length) return { ok: false, error: "REPLICATE video model is not configured" };

  let lastError = "";
  for (const slug of candidates) {
    const result = await generateViaReplicate({ modelSlug: slug, input });
    if (result.ok) return result;
    lastError = asText(result.error);
    if (/could not be found|resource not found|404/i.test(lastError)) {
      continue;
    }
    break;
  }
  return { ok: false, error: lastError || "No compatible Replicate video model found" };
}

async function falRequest(method, url, body, key) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = asText(payload?.detail || payload?.error || payload?.message);
    throw new Error(detail || `fal.ai HTTP ${response.status}`);
  }
  return payload;
}

function falStatus(payload) {
  return asText(payload?.status || payload?.state || payload?.request_status || payload?.queue_status).toLowerCase();
}

async function waitFal({ responseUrl, statusUrl, key }) {
  for (let i = 0; i < 45; i += 1) {
    if (responseUrl) {
      const outputPayload = await falRequest("GET", responseUrl, null, key);
      const mediaUrl = extractMediaUrl(outputPayload?.images || outputPayload?.video || outputPayload?.output || outputPayload?.data || outputPayload);
      if (mediaUrl) return { ok: true, mediaUrl, provider: "FAL" };
    }

    if (!statusUrl) break;
    const statusPayload = await falRequest("GET", statusUrl, null, key);
    const status = falStatus(statusPayload);
    if (["completed", "succeeded", "success", "ok", "done"].includes(status)) {
      const mediaUrl = extractMediaUrl(statusPayload?.images || statusPayload?.video || statusPayload?.output || statusPayload?.data || statusPayload);
      if (mediaUrl) return { ok: true, mediaUrl, provider: "FAL" };
    }
    if (["failed", "error", "canceled", "cancelled"].includes(status)) {
      return { ok: false, error: asText(statusPayload?.error) || "fal.ai request failed" };
    }
    await new Promise((resolve) => setTimeout(resolve, 1300));
  }
  return { ok: false, error: "fal.ai timeout" };
}

async function generateViaFalFlux(prompt) {
  const key = getFalKey();
  if (!key) return { ok: false, error: "FAL_API_KEY missing" };

  try {
    const endpoint = "https://queue.fal.run/fal-ai/flux/schnell";
    const created = await falRequest("POST", endpoint, { prompt, image_size: "landscape_16_9" }, key);

    const immediateUrl = extractMediaUrl(created?.images || created?.output || created?.data || created);
    if (immediateUrl) return { ok: true, mediaUrl: immediateUrl, provider: "FAL" };

    const requestId = asText(created?.request_id || created?.requestId || created?.id);
    const statusUrl = asText(created?.status_url || created?.statusUrl || created?.urls?.status || (requestId ? `${endpoint}/requests/${requestId}/status` : ""));
    const responseUrl = asText(created?.response_url || created?.responseUrl || created?.urls?.response || created?.urls?.result || (requestId ? `${endpoint}/requests/${requestId}` : ""));

    if (!statusUrl && !responseUrl) return { ok: false, error: "fal.ai missing poll URLs" };
    return await waitFal({ responseUrl, statusUrl, key });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "fal.ai request failed" };
  }
}

async function generateViaFalVideo({ prompt, modelId }) {
  const key = getFalKey();
  if (!key) return { ok: false, error: "FAL_API_KEY missing" };

  const candidates = getFalVideoModelCandidates(modelId);
  if (!candidates.length) return { ok: false, error: "FAL video model missing" };

  let lastError = "";
  for (const endpoint of candidates) {
    try {
      const created = await falRequest("POST", endpoint, {
        prompt,
        duration: 5,
        aspect_ratio: "16:9",
        ...getFalVideoInputOverrides(),
      }, key);

      const immediateUrl = extractMediaUrl(created?.video || created?.videos || created?.output || created?.data || created);
      if (immediateUrl) return { ok: true, mediaUrl: immediateUrl, provider: "FAL" };

      const requestId = asText(created?.request_id || created?.requestId || created?.id);
      const statusUrl = asText(created?.status_url || created?.statusUrl || created?.urls?.status || (requestId ? `${endpoint}/requests/${requestId}/status` : ""));
      const responseUrl = asText(created?.response_url || created?.responseUrl || created?.urls?.response || created?.urls?.result || (requestId ? `${endpoint}/requests/${requestId}` : ""));

      const waited = await waitFal({ responseUrl, statusUrl, key });
      if (waited.ok) return waited;

      lastError = asText(waited.error);
      if (!/not found|404|unknown model|invalid/i.test(lastError)) {
        return waited;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "fal.ai video request failed";
      if (!/not found|404|unknown model|invalid/i.test(lastError)) {
        return { ok: false, error: lastError };
      }
    }
  }

  return { ok: false, error: lastError || "fal.ai video failed on all models" };
}

async function generateViaOpenAiImage(prompt, modelId) {
  const key = getOpenAiKey();
  if (!key) return { ok: false, error: "OPENAI_API_KEY missing" };

  const model = asText(modelId).toLowerCase().includes("dall") ? "dall-e-3" : "gpt-image-1";
  const size = model === "dall-e-3" ? "1792x1024" : "1024x1024";

  try {
    const body =
      model === "dall-e-3"
        ? { model, prompt, size }
        : { model, prompt, size, quality: "high" };
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = asText(payload?.error?.message || payload?.error || payload?.message);
      return { ok: false, error: `OpenAI Image HTTP ${response.status}${detail ? `: ${detail}` : ""}` };
    }

    const mediaUrl = asText(payload?.data?.[0]?.url || payload?.data?.[0]?.b64_json);
    if (!mediaUrl) return { ok: false, error: "OpenAI image empty response" };

    // If base64 returned, keep as data URL for immediate rendering.
    const normalized = mediaUrl.startsWith("http") ? mediaUrl : `data:image/png;base64,${mediaUrl}`;
    return { ok: true, mediaUrl: normalized, provider: "OpenAI" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "OpenAI image request failed" };
  }
}

function computeArenaScore({ text, mediaUrl, index, mode }) {
  if (mode !== "arena") return undefined;
  const contentBonus = Math.min(7, Math.floor(asText(text).length / 140));
  const mediaBonus = mediaUrl ? 3 : 0;
  const rankPenalty = index;
  return scoreClamp(90 + contentBonus + mediaBonus - rankPenalty, 93);
}

async function generateOneResult({ category, format, prompt, mode, model, index }) {
  const startedAt = Date.now();
  const base = {
    id: nowId(model.id || "model"),
    modelId: asText(model.id) || `model-${index + 1}`,
    modelName: asText(model.name) || asText(model.id) || `Model ${index + 1}`,
    provider: asText(model.provider) || "AI",
    credits: Math.max(0, Math.round(toNumber(model.credits, 0))),
    latencyMs: 0,
    text: "",
  };

  let result;
  if (["text", "code", "audio"].includes(category)) {
    result = await generateTextLike({
      category,
      format,
      prompt,
      modelId: base.modelId,
      providerHint: base.provider,
    });
    const text = result.ok ? asText(result.text) : `Generation failed: ${result.error}`;
    const latencyMs = Date.now() - startedAt;
    return {
      ...base,
      provider: result.ok ? asText(result.provider) || base.provider : base.provider,
      latencyMs,
      text,
      score: computeArenaScore({ text, mediaUrl: "", index, mode }),
      error: result.ok ? undefined : asText(result.error),
    };
  }

  if (category === "image") {
    const visualPrompt = `${asText(prompt)}\n\nHigh quality visual output for ${asText(format) || "free prompt"}.`;

    const modelId = base.modelId.toLowerCase();
    if (modelId.includes("dall") || modelId.includes("gpt-image")) {
      result = await generateViaOpenAiImage(visualPrompt, modelId);
      if (!result.ok) {
        result = await generateViaFalFlux(visualPrompt);
      }
      if (!result.ok) {
        result = await generateViaReplicate({ modelSlug: getReplicateImageModel(), input: { prompt: visualPrompt } });
      }
    } else if (modelId.includes("flux")) {
      result = await generateViaFalFlux(visualPrompt);
      if (!result.ok) {
        result = await generateViaReplicate({ modelSlug: getReplicateImageModel(), input: { prompt: visualPrompt } });
      }
    } else {
      result = await generateViaReplicate({ modelSlug: getReplicateImageModel(), input: { prompt: visualPrompt } });
      if (!result.ok) {
        result = await generateViaFalFlux(visualPrompt);
      }
    }

    const latencyMs = Date.now() - startedAt;
    return {
      ...base,
      provider: result.ok ? asText(result.provider) || base.provider : base.provider,
      latencyMs,
      text: result.ok ? `Image generated from prompt for ${base.modelName}.` : `Image generation failed: ${result.error}`,
      mediaUrl: result.ok ? asText(result.mediaUrl) : undefined,
      score: computeArenaScore({ text: prompt, mediaUrl: result.ok ? asText(result.mediaUrl) : "", index, mode }),
      error: result.ok ? undefined : asText(result.error),
    };
  }

  if (category === "video") {
    const videoPrompt = `${asText(prompt)}\n\n5 to 8 seconds cinematic shot, smooth motion, production-ready.`;
    result = await generateViaFalVideo({ prompt: videoPrompt, modelId: base.modelId });
    if (!result.ok) {
      result = await generateViaReplicateCandidates({
        modelSlugs: getReplicateVideoModelCandidates(base.modelId),
        input: {
          prompt: videoPrompt,
          duration: "5",
          aspect_ratio: "16:9",
        },
      });
    }

    const latencyMs = Date.now() - startedAt;
    return {
      ...base,
      provider: result.ok ? asText(result.provider) || base.provider : base.provider,
      latencyMs,
      text: result.ok ? `Video generated for ${base.modelName}.` : `Video generation failed: ${result.error}`,
      mediaUrl: result.ok ? asText(result.mediaUrl) : undefined,
      score: computeArenaScore({ text: prompt, mediaUrl: result.ok ? asText(result.mediaUrl) : "", index, mode }),
      error: result.ok ? undefined : asText(result.error),
    };
  }

  const latencyMs = Date.now() - startedAt;
  return {
    ...base,
    latencyMs,
    text: "Unsupported category",
    error: "Unsupported category",
    score: computeArenaScore({ text: "", mediaUrl: "", index, mode }),
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = getBearerToken(req);
  const auth = await getSupabaseUserFromToken(token);
  if (!auth.ok) {
    res.status(401).json({ error: auth.error || "Unauthorized" });
    return;
  }

  const payload = parseJsonSafe(req.body) || {};
  const category = asText(payload.category).toLowerCase();
  const mode = asText(payload.mode).toLowerCase() === "arena" ? "arena" : "single";
  const format = asText(payload.format) || "free-prompt";
  const prompt = asText(payload.prompt);
  const models = Array.isArray(payload.models) ? payload.models : [];

  if (!prompt) {
    res.status(400).json({ ok: false, error: "Prompt is required" });
    return;
  }

  if (!["text", "image", "video", "code", "audio"].includes(category)) {
    res.status(400).json({ ok: false, error: "Invalid category" });
    return;
  }

  if (!models.length) {
    res.status(400).json({ ok: false, error: "At least one model is required" });
    return;
  }

  const picked = mode === "single" ? [models[0]] : models.slice(0, 4);
  const runSequential = category === "image" || category === "video";
  const results = runSequential
    ? await (async () => {
        const buffer = [];
        for (let index = 0; index < picked.length; index += 1) {
          const model = picked[index];
          const item = await generateOneResult({ category, format, prompt, mode, model, index });
          buffer.push(item);
          if (mode === "arena" && index < picked.length - 1) {
            await sleep(700);
          }
        }
        return buffer;
      })()
    : await Promise.all(picked.map((model, index) => generateOneResult({ category, format, prompt, mode, model, index })));

  const winner =
    mode === "arena"
      ? [...results].sort((a, b) => scoreClamp(b.score, 0) - scoreClamp(a.score, 0))[0]
      : results[0];

  res.status(200).json({
    ok: true,
    mode,
    category,
    format,
    results,
    winnerResultId: winner?.id,
    hasErrors: results.some((item) => asText(item.error)),
  });
}
