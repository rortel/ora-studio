import { getAccessToken } from "./authToken";

export type HubCategory = "text" | "image" | "video" | "code" | "audio";
export type HubRunMode = "single" | "arena";

export type HubModelResult = {
  id: string;
  modelId: string;
  modelName: string;
  provider: string;
  latencyMs: number;
  credits: number;
  text: string;
  mediaUrl?: string;
  score?: number;
};

export type HubDraft = {
  id: string;
  title: string;
  prompt: string;
  category: HubCategory;
  format: string;
  mode: HubRunMode;
  createdAt: string;
  updatedAt: string;
  totalCredits: number;
  results: HubModelResult[];
  winnerResultId?: string;
};

export type HubStore = {
  drafts: HubDraft[];
};

const STORAGE_KEY = "ora-hub-store-v1";
const MAX_DRAFTS = 200;

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function decodeJwtSubject(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return "";
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4 || 4)) % 4);
    const json = window.atob(padded);
    const parsed = JSON.parse(json);
    return asText(parsed?.sub);
  } catch (_error) {
    return "";
  }
}

function activeStorageKey() {
  const token = getAccessToken();
  const userId = decodeJwtSubject(token);
  return userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
}

function normalizeResult(value: unknown): HubModelResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Partial<HubModelResult>;
  const id = asText(entry.id);
  const modelId = asText(entry.modelId);
  const modelName = asText(entry.modelName);
  const provider = asText(entry.provider);
  const text = asText(entry.text);
  if (!id || !modelId || !modelName || !provider) return null;
  return {
    id,
    modelId,
    modelName,
    provider,
    latencyMs: typeof entry.latencyMs === "number" ? entry.latencyMs : 0,
    credits: typeof entry.credits === "number" ? entry.credits : 0,
    text,
    mediaUrl: asText(entry.mediaUrl) || undefined,
    score: typeof entry.score === "number" ? entry.score : undefined,
  };
}

function normalizeDraft(value: unknown): HubDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Partial<HubDraft>;
  const id = asText(entry.id);
  const prompt = asText(entry.prompt);
  if (!id || !prompt) return null;

  const results = Array.isArray(entry.results)
    ? entry.results.map((item) => normalizeResult(item)).filter((item): item is HubModelResult => Boolean(item))
    : [];

  const category = asText(entry.category) as HubCategory;
  const mode = asText(entry.mode) as HubRunMode;

  return {
    id,
    title: asText(entry.title) || "Untitled generation",
    prompt,
    category: category === "text" || category === "image" || category === "video" || category === "code" || category === "audio" ? category : "text",
    format: asText(entry.format) || "free-prompt",
    mode: mode === "arena" ? "arena" : "single",
    createdAt: asText(entry.createdAt) || nowIso(),
    updatedAt: asText(entry.updatedAt) || nowIso(),
    totalCredits: typeof entry.totalCredits === "number" ? entry.totalCredits : 0,
    results,
    winnerResultId: asText(entry.winnerResultId) || undefined,
  };
}

function normalizeStore(raw: unknown): HubStore {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { drafts: [] };
  const source = raw as { drafts?: unknown[] };
  const drafts = Array.isArray(source.drafts)
    ? source.drafts.map((item) => normalizeDraft(item)).filter((item): item is HubDraft => Boolean(item)).slice(0, MAX_DRAFTS)
    : [];
  return { drafts };
}

export function loadHubStore(): HubStore {
  try {
    const raw = window.localStorage.getItem(activeStorageKey());
    if (!raw) return { drafts: [] };
    return normalizeStore(JSON.parse(raw));
  } catch (_error) {
    return { drafts: [] };
  }
}

export function saveHubStore(store: HubStore): HubStore {
  const next = normalizeStore(store);
  window.localStorage.setItem(activeStorageKey(), JSON.stringify(next));
  return next;
}

export async function loadHubStoreAsync() {
  return loadHubStore();
}

export async function saveHubStoreAsync(store: HubStore) {
  return saveHubStore(store);
}

export function createHubDraft(input: Omit<HubDraft, "id" | "createdAt" | "updatedAt">): HubDraft {
  const timestamp = nowIso();
  return {
    ...input,
    id: makeId("hub"),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function upsertHubDraft(store: HubStore, draft: HubDraft): HubStore {
  const nextDrafts = [draft, ...store.drafts.filter((item) => item.id !== draft.id)]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_DRAFTS);
  return saveHubStore({ drafts: nextDrafts });
}

export function removeHubDraft(store: HubStore, draftId: string): HubStore {
  return saveHubStore({
    drafts: store.drafts.filter((entry) => entry.id !== draftId),
  });
}

