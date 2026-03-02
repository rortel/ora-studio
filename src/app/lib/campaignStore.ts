import { getAccessToken } from "./authToken";

export type CampaignStatus = "Draft" | "Review" | "Approved" | "Live";
export type StudioAssetStatus = "draft" | "review" | "approved" | "published" | "needs-fix";

export type CampaignAssetVersion = {
  id: string;
  body: string;
  createdAt: string;
  createdBy?: string;
};

export type CampaignAsset = {
  id: string;
  type: string;
  title: string;
  channel: string;
  body: string;
  compliance: number;
  createdAt: string;
  source?: "hub" | "studio";
  status?: StudioAssetStatus;
  version?: number;
  createdBy?: string;
  sentToStudioFrom?: string;
  versions?: CampaignAssetVersion[];
  mediaUrl?: string;
  mediaType?: "image" | "video";
  mediaProvider?: "replicate" | "fal" | "fallback";
  mediaStatus?: "ready" | "processing" | "failed" | "skipped";
};

export type CampaignRecord = {
  id: string;
  name: string;
  brief: string;
  formats: string[];
  score: number;
  status: CampaignStatus;
  date: string;
  pieces: number;
  assets: CampaignAsset[];
  createdAt: string;
  updatedAt: string;
};

export type FolderAssetRef = {
  campaignId: string;
  assetId: string;
};

export type AssetFolder = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  assets: FolderAssetRef[];
};

export type CampaignStore = {
  campaigns: CampaignRecord[];
  folders: AssetFolder[];
};

export type StudioMessageLike = {
  agent: string | null;
  role: string;
  text: string;
  score?: number;
};

export type GeneratedCampaignAssetInput = {
  type: string;
  title: string;
  channel: string;
  body: string;
  compliance?: number;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  mediaProvider?: "replicate" | "fal" | "fallback";
  mediaStatus?: "ready" | "processing" | "failed" | "skipped";
};

export type BuildCampaignOptions = {
  name?: string;
  score?: number;
  assets?: GeneratedCampaignAssetInput[];
};

export type SendHubDraftToStudioInput = {
  draftId: string;
  draftTitle: string;
  prompt: string;
  format: string;
  resultBody: string;
  resultType: string;
  resultChannel: string;
  complianceScore?: number;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  mediaProvider?: "replicate" | "fal" | "fallback";
  mediaStatus?: "ready" | "processing" | "failed" | "skipped";
  selectedCampaignId?: string;
  campaignName?: string;
  createdBy?: string;
};

const STORAGE_KEY = "ora-studio-campaign-store-v1";
const MAX_CAMPAIGNS = 120;
const STORE_API_ENDPOINT = "/api/campaign-store";

function getAuthHeaders() {
  const token = getAccessToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
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

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toScore(value: unknown, fallback = 92) {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function campaignNameFromBrief(brief: string) {
  const clean = asText(brief).replace(/\s+/g, " ");
  if (!clean) return "Untitled Campaign";
  if (clean.length <= 52) return clean;
  return `${clean.slice(0, 49).trimEnd()}...`;
}

function parseFormatsFromText(text: string) {
  const source = text.toLowerCase();
  const formats: { type: string; title: string; channel: string }[] = [];

  if (source.includes("linkedin")) {
    formats.push({ type: "linkedin-post", title: "LinkedIn Post", channel: "LinkedIn" });
  }
  if (source.includes("email")) {
    formats.push({ type: "email", title: "Email", channel: "Email" });
  }
  if (source.includes("landing")) {
    formats.push({ type: "landing-page", title: "Landing Page", channel: "Website" });
  }
  if (source.includes("instagram")) {
    formats.push({ type: "instagram-post", title: "Instagram Post", channel: "Instagram" });
  }
  if (source.includes("facebook")) {
    formats.push({ type: "facebook-post", title: "Facebook Post", channel: "Facebook" });
  }
  if (source.includes("newsletter")) {
    formats.push({ type: "newsletter", title: "Newsletter", channel: "Email" });
  }

  if (!formats.length) {
    formats.push(
      { type: "linkedin-post", title: "LinkedIn Post", channel: "LinkedIn" },
      { type: "email", title: "Email", channel: "Email" },
      { type: "landing-page", title: "Landing Page", channel: "Website" },
    );
  }

  return formats;
}

function normalizeStore(raw: unknown): CampaignStore {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { campaigns: [], folders: [] };
  }

  const source = raw as {
    campaigns?: unknown[];
    folders?: unknown[];
  };

  const campaigns = Array.isArray(source.campaigns)
    ? source.campaigns
        .map((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
          const value = entry as Partial<CampaignRecord>;
          const id = asText(value.id);
          const brief = asText(value.brief);
          if (!id || !brief) return null;
          const assets = Array.isArray(value.assets)
            ? value.assets
                .map((asset) => {
                  if (!asset || typeof asset !== "object" || Array.isArray(asset)) return null;
                  const a = asset as Partial<CampaignAsset>;
                  const assetId = asText(a.id);
                  const body = asText(a.body);
                  if (!assetId || !body) return null;
                  return {
                    id: assetId,
                    type: asText(a.type) || "asset",
                    title: asText(a.title) || "Asset",
                    channel: asText(a.channel) || "Channel",
                    body,
                    compliance: toScore(a.compliance, 92),
                    createdAt: asText(a.createdAt) || nowIso(),
                    source: asText(a.source) === "hub" ? "hub" : asText(a.source) === "studio" ? "studio" : undefined,
                    status:
                      asText(a.status) === "draft" ||
                      asText(a.status) === "review" ||
                      asText(a.status) === "approved" ||
                      asText(a.status) === "published" ||
                      asText(a.status) === "needs-fix"
                        ? (asText(a.status) as StudioAssetStatus)
                        : undefined,
                    version: typeof a.version === "number" ? a.version : undefined,
                    createdBy: asText(a.createdBy) || undefined,
                    sentToStudioFrom: asText(a.sentToStudioFrom) || undefined,
                    versions: Array.isArray(a.versions)
                      ? a.versions
                          .map((version) => {
                            if (!version || typeof version !== "object" || Array.isArray(version)) return null;
                            const v = version as Partial<CampaignAssetVersion>;
                            const versionBody = asText(v.body);
                            if (!versionBody) return null;
                            return {
                              id: asText(v.id) || makeId("version"),
                              body: versionBody,
                              createdAt: asText(v.createdAt) || nowIso(),
                              createdBy: asText(v.createdBy) || undefined,
                            } satisfies CampaignAssetVersion;
                          })
                          .filter((version): version is CampaignAssetVersion => Boolean(version))
                      : undefined,
                    mediaUrl: asText(a.mediaUrl) || undefined,
                    mediaType:
                      asText(a.mediaType) === "video"
                        ? "video"
                        : asText(a.mediaType) === "image"
                          ? "image"
                          : undefined,
                    mediaProvider:
                      asText(a.mediaProvider) === "replicate"
                        ? "replicate"
                        : asText(a.mediaProvider) === "fal"
                          ? "fal"
                        : asText(a.mediaProvider) === "fallback"
                          ? "fallback"
                          : undefined,
                    mediaStatus:
                      asText(a.mediaStatus) === "ready" ||
                      asText(a.mediaStatus) === "processing" ||
                      asText(a.mediaStatus) === "failed" ||
                      asText(a.mediaStatus) === "skipped"
                        ? (asText(a.mediaStatus) as CampaignAsset["mediaStatus"])
                        : undefined,
                  } satisfies CampaignAsset;
                })
                .filter((asset): asset is CampaignAsset => Boolean(asset))
            : [];
          const formats =
            Array.isArray(value.formats) && value.formats.length
              ? value.formats.map((f) => asText(f)).filter(Boolean)
              : Array.from(new Set(assets.map((asset) => asset.type)));

          return {
            id,
            name: asText(value.name) || campaignNameFromBrief(brief),
            brief,
            formats,
            score: toScore(value.score, assets.length ? Math.round(assets.reduce((sum, asset) => sum + asset.compliance, 0) / assets.length) : 92),
            status: (asText(value.status) as CampaignStatus) || "Draft",
            date: asText(value.date) || new Date(asText(value.updatedAt) || nowIso()).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" }),
            pieces: typeof value.pieces === "number" ? value.pieces : assets.length,
            assets,
            createdAt: asText(value.createdAt) || nowIso(),
            updatedAt: asText(value.updatedAt) || nowIso(),
          } satisfies CampaignRecord;
        })
        .filter((campaign): campaign is CampaignRecord => Boolean(campaign))
        .slice(0, MAX_CAMPAIGNS)
    : [];

  const assetPairs = new Set(campaigns.flatMap((campaign) => campaign.assets.map((asset) => `${campaign.id}:${asset.id}`)));

  const folders = Array.isArray(source.folders)
    ? source.folders
        .map((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
          const value = entry as Partial<AssetFolder>;
          const id = asText(value.id);
          if (!id) return null;
          const assets = Array.isArray(value.assets)
            ? value.assets
                .map((assetRef) => {
                  if (!assetRef || typeof assetRef !== "object" || Array.isArray(assetRef)) return null;
                  const ref = assetRef as Partial<FolderAssetRef>;
                  const campaignId = asText(ref.campaignId);
                  const assetId = asText(ref.assetId);
                  if (!campaignId || !assetId) return null;
                  const key = `${campaignId}:${assetId}`;
                  return assetPairs.has(key) ? ({ campaignId, assetId } satisfies FolderAssetRef) : null;
                })
                .filter((item): item is FolderAssetRef => Boolean(item))
            : [];

          return {
            id,
            name: asText(value.name) || "Nouveau dossier",
            createdAt: asText(value.createdAt) || nowIso(),
            updatedAt: asText(value.updatedAt) || nowIso(),
            assets,
          } satisfies AssetFolder;
        })
        .filter((folder): folder is AssetFolder => Boolean(folder))
    : [];

  return { campaigns, folders };
}

export function loadCampaignStore(): CampaignStore {
  try {
    const raw = window.localStorage.getItem(activeStorageKey());
    if (!raw) return { campaigns: [], folders: [] };
    return normalizeStore(JSON.parse(raw));
  } catch (_error) {
    return { campaigns: [], folders: [] };
  }
}

export function saveCampaignStore(store: CampaignStore) {
  const normalized = normalizeStore(store);
  window.localStorage.setItem(activeStorageKey(), JSON.stringify(normalized));
  return normalized;
}

export function buildCampaignFromMessages(
  brief: string,
  messages: StudioMessageLike[],
  options?: BuildCampaignOptions,
): CampaignRecord {
  const cleanBrief = asText(brief);
  const assistantMessages = messages.filter((message) => Boolean(message.agent)).map((message) => asText(message.text)).filter(Boolean);
  const finalAssistantText = assistantMessages[assistantMessages.length - 1] || "Campaign draft generated.";
  const formatSeedText = assistantMessages.join(" ");
  const selectedFormats = parseFormatsFromText(formatSeedText);
  const scoreSeed =
    messages
      .slice()
      .reverse()
      .map((message) => (typeof message.score === "number" ? message.score : null))
      .find((score): score is number => score !== null) ?? 92;
  const score = toScore(options?.score ?? scoreSeed, 92);
  const timestamp = nowIso();
  const hasExplicitAssets = Array.isArray(options?.assets);

  const assets: CampaignAsset[] =
    hasExplicitAssets
      ? (options?.assets ?? []).map((asset, index) => ({
          id: makeId("asset"),
          type: asText(asset.type) || "asset",
          title: asText(asset.title) || `Asset ${index + 1}`,
          channel: asText(asset.channel) || "Channel",
          body: asText(asset.body) || finalAssistantText,
          compliance: toScore(asset.compliance, toScore(score - index, 90)),
          createdAt: timestamp,
          mediaUrl: asText(asset.mediaUrl) || undefined,
          mediaType: asset.mediaType,
          mediaProvider: asset.mediaProvider,
          mediaStatus: asset.mediaStatus,
        }))
      : selectedFormats.map((format, index) => {
          const detail =
            index === 0
              ? finalAssistantText
              : `${finalAssistantText}\n\nAdaptation for ${format.channel}: keep the same strategic angle and CTA consistency.`;

          return {
            id: makeId("asset"),
            type: format.type,
            title: format.title,
            channel: format.channel,
            body: detail,
            compliance: toScore(score - index, 90),
            createdAt: timestamp,
          };
        });

  const averageCompliance = assets.length
    ? Math.round(assets.reduce((sum, asset) => sum + asset.compliance, 0) / assets.length)
    : toScore(options?.score ?? scoreSeed, 0);

  return {
    id: makeId("campaign"),
    name: asText(options?.name) || campaignNameFromBrief(cleanBrief),
    brief: cleanBrief || "Campaign created from Creation Center",
    formats: Array.from(new Set(assets.map((asset) => asset.title))),
    score: toScore(averageCompliance, score),
    status: "Draft",
    date: new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" }),
    pieces: assets.length,
    assets,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function upsertCampaign(store: CampaignStore, campaign: CampaignRecord) {
  const next = normalizeStore({
    ...store,
    campaigns: [campaign, ...store.campaigns.filter((entry) => entry.id !== campaign.id)],
  });
  next.campaigns.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return next;
}

export function removeCampaignRecord(store: CampaignStore, campaignId: string) {
  const next = normalizeStore({
    ...store,
    campaigns: store.campaigns.filter((campaign) => campaign.id !== campaignId),
    folders: store.folders.map((folder) => ({
      ...folder,
      assets: folder.assets.filter((assetRef) => assetRef.campaignId !== campaignId),
      updatedAt: nowIso(),
    })),
  });
  return next;
}

export function setCampaignStatus(store: CampaignStore, campaignId: string, status: CampaignStatus) {
  const stamp = nowIso();
  return normalizeStore({
    ...store,
    campaigns: store.campaigns.map((campaign) =>
      campaign.id === campaignId
        ? {
            ...campaign,
            status,
            updatedAt: stamp,
            date: new Date(stamp).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" }),
          }
        : campaign,
    ),
  });
}

export function createFolder(store: CampaignStore, name: string) {
  const stamp = nowIso();
  const folder: AssetFolder = {
    id: makeId("folder"),
    name: asText(name) || "Nouveau dossier",
    createdAt: stamp,
    updatedAt: stamp,
    assets: [],
  };
  return normalizeStore({
    ...store,
    folders: [...store.folders, folder],
  });
}

export function renameFolder(store: CampaignStore, folderId: string, nextName: string) {
  const name = asText(nextName);
  if (!name) return store;
  return normalizeStore({
    ...store,
    folders: store.folders.map((folder) =>
      folder.id === folderId
        ? {
            ...folder,
            name,
            updatedAt: nowIso(),
          }
        : folder,
    ),
  });
}

export function assignAssetToFolder(
  store: CampaignStore,
  params: { campaignId: string; assetId: string; folderId: string | "" },
) {
  const { campaignId, assetId, folderId } = params;
  const exists = store.campaigns.some(
    (campaign) => campaign.id === campaignId && campaign.assets.some((asset) => asset.id === assetId),
  );
  if (!exists) return store;

  return normalizeStore({
    ...store,
    folders: store.folders.map((folder) => {
      const cleanAssets = folder.assets.filter((assetRef) => !(assetRef.campaignId === campaignId && assetRef.assetId === assetId));
      if (!folderId || folder.id !== folderId) {
        return cleanAssets.length !== folder.assets.length
          ? {
              ...folder,
              assets: cleanAssets,
              updatedAt: nowIso(),
            }
          : folder;
      }
      return {
        ...folder,
        assets: [...cleanAssets, { campaignId, assetId }],
        updatedAt: nowIso(),
      };
    }),
  });
}

function formatDateDisplay(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

export function upsertCampaignAsset(
  store: CampaignStore,
  campaignId: string,
  asset: CampaignAsset,
  options?: { updateCampaignStatus?: CampaignStatus },
) {
  const stamp = nowIso();
  return normalizeStore({
    ...store,
    campaigns: store.campaigns.map((campaign) => {
      if (campaign.id !== campaignId) return campaign;
      const nextAssets = [asset, ...campaign.assets.filter((entry) => entry.id !== asset.id)];
      const nextScore = nextAssets.length
        ? Math.round(nextAssets.reduce((sum, entry) => sum + toScore(entry.compliance, 92), 0) / nextAssets.length)
        : campaign.score;
      return {
        ...campaign,
        assets: nextAssets,
        pieces: nextAssets.length,
        formats: Array.from(new Set(nextAssets.map((entry) => entry.title))),
        score: toScore(nextScore, campaign.score),
        status: options?.updateCampaignStatus ?? campaign.status,
        updatedAt: stamp,
        date: formatDateDisplay(stamp),
      };
    }),
  });
}

export function sendHubDraftToStudio(
  store: CampaignStore,
  payload: SendHubDraftToStudioInput,
) {
  const stamp = nowIso();
  const asset: CampaignAsset = {
    id: makeId("asset"),
    type: asText(payload.resultType) || "hub-draft",
    title: asText(payload.draftTitle) || "Hub Draft",
    channel: asText(payload.resultChannel) || "Channel",
    body: asText(payload.resultBody) || asText(payload.prompt) || "Draft content",
    compliance: toScore(payload.complianceScore, 94),
    createdAt: stamp,
    source: "hub",
    status: "draft",
    version: 1,
    createdBy: asText(payload.createdBy) || undefined,
    sentToStudioFrom: asText(payload.draftId) || undefined,
    versions: [
      {
        id: makeId("version"),
        body: asText(payload.resultBody) || asText(payload.prompt) || "Draft content",
        createdAt: stamp,
        createdBy: asText(payload.createdBy) || undefined,
      },
    ],
    mediaUrl: asText(payload.mediaUrl) || undefined,
    mediaType: payload.mediaType,
    mediaProvider: payload.mediaProvider,
    mediaStatus: payload.mediaStatus,
  };

  const explicitCampaignId = asText(payload.selectedCampaignId);
  if (explicitCampaignId) {
    const updated = upsertCampaignAsset(store, explicitCampaignId, asset);
    const campaign = updated.campaigns.find((entry) => entry.id === explicitCampaignId);
    if (campaign) {
      return {
        store: updated,
        campaignId: campaign.id,
        campaignName: campaign.name,
        assetId: asset.id,
      };
    }
  }

  const campaignId = makeId("campaign");
  const campaignName = asText(payload.campaignName) || campaignNameFromBrief(asText(payload.prompt));
  const campaign: CampaignRecord = {
    id: campaignId,
    name: campaignName,
    brief: asText(payload.prompt) || "Asset imported from Hub",
    formats: [asset.title],
    score: toScore(asset.compliance, 94),
    status: "Draft",
    date: formatDateDisplay(stamp),
    pieces: 1,
    assets: [asset],
    createdAt: stamp,
    updatedAt: stamp,
  };

  const updated = upsertCampaign(store, campaign);
  return {
    store: updated,
    campaignId,
    campaignName,
    assetId: asset.id,
  };
}

export function findCampaignById(store: CampaignStore, campaignId: string) {
  return store.campaigns.find((campaign) => campaign.id === campaignId) ?? null;
}

export function findAssetById(store: CampaignStore, assetId: string) {
  for (const campaign of store.campaigns) {
    const asset = campaign.assets.find((entry) => entry.id === assetId);
    if (asset) return { campaign, asset };
  }
  return null;
}

export function updateStudioAssetContent(
  store: CampaignStore,
  params: { assetId: string; body: string; createdBy?: string; compliance?: number },
) {
  const found = findAssetById(store, params.assetId);
  if (!found) return store;
  const stamp = nowIso();
  const nextVersionNumber = (found.asset.version || 1) + 1;
  const nextAsset: CampaignAsset = {
    ...found.asset,
    body: asText(params.body) || found.asset.body,
    compliance: toScore(params.compliance, found.asset.compliance),
    version: nextVersionNumber,
    status: found.asset.status === "approved" || found.asset.status === "published" ? "review" : found.asset.status ?? "draft",
    versions: [
      ...(found.asset.versions ?? []),
      {
        id: makeId("version"),
        body: asText(params.body) || found.asset.body,
        createdAt: stamp,
        createdBy: asText(params.createdBy) || undefined,
      },
    ],
  };
  return upsertCampaignAsset(store, found.campaign.id, nextAsset);
}

export function updateStudioAssetStatus(
  store: CampaignStore,
  params: { assetId: string; status: StudioAssetStatus },
) {
  const found = findAssetById(store, params.assetId);
  if (!found) return store;
  const nextAsset: CampaignAsset = {
    ...found.asset,
    status: params.status,
  };
  let campaignStatus: CampaignStatus | undefined;
  if (params.status === "published") campaignStatus = "Live";
  if (params.status === "approved") campaignStatus = "Approved";
  if (params.status === "review") campaignStatus = "Review";
  if (params.status === "draft" || params.status === "needs-fix") campaignStatus = "Draft";
  return upsertCampaignAsset(store, found.campaign.id, nextAsset, { updateCampaignStatus: campaignStatus });
}

function sortCampaignsByUpdatedAt(campaigns: CampaignRecord[]) {
  return [...campaigns].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function mergeCampaignArrays(primary: CampaignRecord[], secondary: CampaignRecord[]) {
  const merged = new Map<string, CampaignRecord>();

  [...secondary, ...primary].forEach((campaign) => {
    const existing = merged.get(campaign.id);
    if (!existing) {
      merged.set(campaign.id, campaign);
      return;
    }
    const incomingTime = new Date(campaign.updatedAt).getTime();
    const existingTime = new Date(existing.updatedAt).getTime();
    if (incomingTime >= existingTime) {
      merged.set(campaign.id, campaign);
    }
  });

  return sortCampaignsByUpdatedAt([...merged.values()]);
}

function mergeFolderArrays(primary: AssetFolder[], secondary: AssetFolder[]) {
  const merged = new Map<string, AssetFolder>();

  [...secondary, ...primary].forEach((folder) => {
    const existing = merged.get(folder.id);
    if (!existing) {
      merged.set(folder.id, folder);
      return;
    }
    const incomingTime = new Date(folder.updatedAt).getTime();
    const existingTime = new Date(existing.updatedAt).getTime();
    if (incomingTime >= existingTime) {
      merged.set(folder.id, folder);
    }
  });

  return [...merged.values()];
}

export function mergeCampaignStores(primary: CampaignStore, secondary: CampaignStore): CampaignStore {
  return normalizeStore({
    campaigns: mergeCampaignArrays(primary.campaigns, secondary.campaigns),
    folders: mergeFolderArrays(primary.folders, secondary.folders),
  });
}

async function fetchRemoteCampaignStore() {
  try {
    const response = await fetch(STORE_API_ENDPOINT, {
      method: "GET",
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    const source = payload && typeof payload === "object" && !Array.isArray(payload) && "store" in payload ? payload.store : payload;
    return normalizeStore(source);
  } catch (_error) {
    return null;
  }
}

export async function loadCampaignStoreAsync() {
  const localStore = loadCampaignStore();
  const remoteStore = await fetchRemoteCampaignStore();
  if (!remoteStore) return localStore;
  saveCampaignStore(remoteStore);
  return remoteStore;
}

export async function saveCampaignStoreAsync(store: CampaignStore) {
  const localSaved = saveCampaignStore(store);
  try {
    const response = await fetch(STORE_API_ENDPOINT, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ store: localSaved }),
    });
    if (!response.ok) return localSaved;
    const payload = await response.json().catch(() => null);
    const remoteStore = payload && typeof payload === "object" && !Array.isArray(payload) && "store" in payload ? normalizeStore(payload.store) : null;
    if (!remoteStore) return localSaved;
    saveCampaignStore(remoteStore);
    return remoteStore;
  } catch (_error) {
    return localSaved;
  }
}
