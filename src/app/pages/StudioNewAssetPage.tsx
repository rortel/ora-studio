import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, FileText, Upload, Sparkles, CheckCircle2, FolderKanban } from "lucide-react";
import {
  buildCampaignFromMessages,
  loadCampaignStoreAsync,
  saveCampaignStoreAsync,
  upsertCampaign,
  type GeneratedCampaignAssetInput,
  type StudioMessageLike,
} from "../lib/campaignStore";
import { useAuth } from "../lib/auth";
import { hasStudioAccess } from "../lib/studioAccess";
import { getAccessToken } from "../lib/authToken";

type ModelOption = {
  id: string;
  name: string;
  credits: number;
};

type VaultRecord = {
  id: string;
  name: string;
  websiteUrl: string;
  sourceUrls: string[];
  documents: Array<{ name: string; type?: string; size?: number }>;
  summary: string;
  semanticTone?: {
    formality?: string;
    warmth?: string;
    boldness?: string;
    technicality?: string;
    humor?: string;
  };
  vocabulary?: {
    approved?: string[];
    forbidden?: string[];
    expertise?: string[];
  };
  visualIntent?: {
    palette?: string[];
    lighting?: string;
    humanPresence?: string;
    mood?: string;
  };
};

type VaultStore = {
  activeVaultId: string;
  vaults: VaultRecord[];
};

type GenerationPreview = {
  campaignId: string;
  campaignName: string;
  score: number;
  messages: StudioMessageLike[];
  assets: GeneratedCampaignAssetInput[];
};

const modelOptions: ModelOption[] = [
  { id: "gemini-flash", name: "Gemini Flash", credits: 1 },
  { id: "gpt-4o", name: "GPT-4o", credits: 2 },
  { id: "claude-sonnet", name: "Claude Sonnet", credits: 2 },
  { id: "mistral-large", name: "Mistral Large", credits: 2 },
];

const formatOptions = [
  { id: "linkedin-post", label: "LinkedIn" },
  { id: "email", label: "Email" },
  { id: "ad", label: "Ad" },
  { id: "blog-post", label: "Blog" },
  { id: "instagram-caption", label: "Instagram" },
  { id: "newsletter", label: "Newsletter" },
];

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeVaultStore(raw: unknown, fallbackName: string): VaultStore {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      activeVaultId: "default-vault",
      vaults: [
        {
          id: "default-vault",
          name: fallbackName,
          websiteUrl: "",
          sourceUrls: [],
          documents: [],
          summary: "",
        },
      ],
    };
  }
  const source = raw as Partial<VaultStore>;
  const vaults = Array.isArray(source.vaults)
    ? source.vaults
        .filter((vault): vault is VaultRecord => Boolean(vault && typeof vault === "object" && !Array.isArray(vault)))
        .map((vault) => ({
          ...vault,
          sourceUrls: Array.isArray(vault.sourceUrls) ? vault.sourceUrls.map((url) => asText(url)).filter(Boolean) : [],
          documents: Array.isArray(vault.documents) ? vault.documents : [],
        }))
    : [];
  if (!vaults.length) {
    return normalizeVaultStore(null, fallbackName);
  }
  const activeVaultId = asText(source.activeVaultId);
  return {
    activeVaultId: vaults.some((vault) => vault.id === activeVaultId) ? activeVaultId : vaults[0].id,
    vaults,
  };
}

function parseAssets(payload: unknown) {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const asset = entry as Record<string, unknown>;
      return {
        type: asText(asset.type) || "asset",
        title: asText(asset.title) || "Asset",
        channel: asText(asset.channel) || "Channel",
        body: asText(asset.body) || "",
        compliance: typeof asset.compliance === "number" ? asset.compliance : undefined,
        mediaUrl: asText(asset.mediaUrl) || undefined,
        mediaType: asText(asset.mediaType) === "video" ? "video" : asText(asset.mediaType) === "image" ? "image" : undefined,
        mediaProvider:
          asText(asset.mediaProvider) === "replicate"
            ? "replicate"
            : asText(asset.mediaProvider) === "fal"
              ? "fal"
              : asText(asset.mediaProvider) === "fallback"
                ? "fallback"
                : undefined,
        mediaStatus:
          asText(asset.mediaStatus) === "ready" ||
          asText(asset.mediaStatus) === "processing" ||
          asText(asset.mediaStatus) === "failed" ||
          asText(asset.mediaStatus) === "skipped"
            ? (asText(asset.mediaStatus) as GeneratedCampaignAssetInput["mediaStatus"])
            : undefined,
      } satisfies GeneratedCampaignAssetInput;
    })
    .filter((asset): asset is GeneratedCampaignAssetInput => Boolean(asset));
}

function buildBrandVaultPayload(vault: VaultRecord | null) {
  if (!vault) return { references: [] as Array<Record<string, string>> };

  const tone = vault.semanticTone
    ? `Formality: ${vault.semanticTone.formality || "--"}, Warmth: ${vault.semanticTone.warmth || "--"}, Boldness: ${vault.semanticTone.boldness || "--"}, Technicality: ${vault.semanticTone.technicality || "--"}, Humor: ${vault.semanticTone.humor || "--"}`
    : "";
  const visualIntent = vault.visualIntent
    ? `Palette: ${(vault.visualIntent.palette || []).join(", ") || "--"}, Lighting: ${vault.visualIntent.lighting || "--"}, Human presence: ${vault.visualIntent.humanPresence || "--"}, Mood: ${vault.visualIntent.mood || "--"}`
    : "";
  const semanticIntent = `Approved terms: ${(vault.vocabulary?.approved || []).join(", ") || "--"} | Forbidden terms: ${(vault.vocabulary?.forbidden || []).join(", ") || "--"}`;

  const references = [
    {
      type: "vault-summary",
      title: vault.name,
      url: vault.websiteUrl || "",
      text: vault.summary || "",
    },
    ...vault.sourceUrls.map((url) => ({
      type: "vault-url",
      title: vault.name,
      url,
      text: `Brand source URL: ${url}`,
    })),
    ...vault.documents.map((doc) => ({
      type: "vault-document",
      title: doc.name,
      url: "",
      text: `Brand document: ${doc.name}`,
    })),
  ];

  return {
    summary: vault.summary,
    tone,
    visualIntent,
    semanticIntent,
    references,
  };
}

export function StudioNewAssetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const fallbackVaultName = asText(profile?.company) || asText(profile?.organizationName) || "Default Vault";
  const [vaultStore, setVaultStore] = useState<VaultStore>(() => normalizeVaultStore(null, fallbackVaultName));
  const [vaultId, setVaultId] = useState("default-vault");
  const [mode, setMode] = useState<"single" | "arena">("single");
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(["claude-sonnet"]);
  const [format, setFormat] = useState("linkedin-post");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("");
  const [objective, setObjective] = useState("awareness");
  const [refUrl, setRefUrl] = useState("");
  const [documents, setDocuments] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<GenerationPreview | null>(null);

  const selectedModels = useMemo(
    () => modelOptions.filter((model) => selectedModelIds.includes(model.id)),
    [selectedModelIds],
  );
  const selectedVault = useMemo(
    () => vaultStore.vaults.find((vault) => vault.id === vaultId) || vaultStore.vaults[0] || null,
    [vaultId, vaultStore.vaults],
  );
  const breakdownBase = selectedModels.reduce((sum, model) => sum + model.credits, 0);
  const studioCost = Math.max(5, breakdownBase + 3);

  useEffect(() => {
    const loadVaultStore = async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const response = await fetch("/api/vault-store", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) return;
        const nextStore = normalizeVaultStore(payload?.store, fallbackVaultName);
        setVaultStore(nextStore);
        setVaultId(nextStore.activeVaultId);
      } catch (_error) {
        // no-op
      }
    };
    void loadVaultStore();
  }, [fallbackVaultName]);

  if (!hasStudioAccess(profile?.subscription)) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-6">
        <div className="w-full max-w-[720px] bg-card border border-border rounded-xl p-6">
          <h1 className="text-foreground mb-2" style={{ fontSize: "26px", fontWeight: 500, letterSpacing: "-0.03em" }}>
            Studio requires the Studio + Brand Vault plan
          </h1>
          <p className="text-muted-foreground mb-4" style={{ fontSize: "14px", lineHeight: 1.55 }}>
            Upgrade to unlock vault-based generation, compliance scoring and approval workflows.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            style={{ fontSize: "14px", fontWeight: 600 }}
          >
            Upgrade to Studio
          </Link>
        </div>
      </div>
    );
  }

  const toggleModel = (modelId: string) => {
    setSelectedModelIds((current) => {
      if (mode === "single") return [modelId];
      if (current.includes(modelId)) {
        if (current.length === 1) return current;
        return current.filter((id) => id !== modelId);
      }
      if (current.length >= 4) return current;
      return [...current, modelId];
    });
  };

  const postGenerationLogs = async (complianceScore: number, assets: GeneratedCampaignAssetInput[]) => {
    const token = getAccessToken();
    if (!token || !selectedModels.length) return;

    const hasVideo = assets.some((asset) => asset.mediaType === "video");
    const hasImage = assets.some((asset) => asset.mediaType === "image");
    const category = hasVideo ? "video" : hasImage ? "image" : "text";
    const extraCredits = Math.max(0, studioCost - breakdownBase);

    const entries = selectedModels.map((model) => ({
      module: "studio",
      category,
      format,
      modelId: model.id,
      modelName: model.name,
      provider: model.id.includes("gpt") ? "openai" : model.id.includes("gemini") ? "google" : model.id.includes("claude") ? "anthropic" : "mistral",
      credits: model.credits,
      latencyMs: 1200,
      status: "success",
      compliance: complianceScore,
      channel: format,
    }));

    if (extraCredits > 0) {
      entries.push({
        module: "studio",
        category: "text",
        format,
        modelId: "ora-studio-compliance",
        modelName: "ORA Studio Compliance",
        provider: "ora",
        credits: extraCredits,
        latencyMs: 450,
        status: "success",
        compliance: complianceScore,
        channel: format,
      });
    }

    try {
      await fetch("/api/generation-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entries }),
      });
    } catch (_error) {
      // no-op
    }
  };

  const generateAsset = async () => {
    if (!message.trim() || !selectedModels.length || !selectedVault || isGenerating) return;
    setIsGenerating(true);
    setError("");
    setPreview(null);

    const apiPayload = {
      brief: message,
      strictThreshold: 98,
      creationCenter: {
        support: format,
        target,
        objective,
        message,
        request: message,
        url: refUrl,
        urls: refUrl ? [{ url: refUrl, type: "product-or-service" }] : [],
        documents: documents.map((doc) => ({ name: doc.name, type: doc.type, size: doc.size })),
      },
      brandVault: buildBrandVaultPayload(selectedVault),
    };

    let generatedMessages: StudioMessageLike[] = [];
    let generatedAssets: GeneratedCampaignAssetInput[] = [];
    let generatedScore = 94;

    try {
      const response = await fetch("/api/generate-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(asText(payload?.error) || "Generation failed");
      }
      const messages = Array.isArray(payload?.messages) ? payload.messages : [];
      generatedMessages = messages
        .map((item) => ({
          agent: asText(item?.agent) || "ORA",
          role: asText(item?.role) || "Agent",
          text: asText(item?.text),
          score: typeof payload?.score === "number" ? payload.score : undefined,
        }))
        .filter((entry) => entry.text);
      generatedAssets = parseAssets(payload?.assets);
      generatedScore = typeof payload?.score === "number" ? payload.score : 94;
    } catch (requestError) {
      setIsGenerating(false);
      setError(requestError instanceof Error ? requestError.message : "Generation failed.");
      return;
    }

    if (!generatedAssets.length) {
      setIsGenerating(false);
      setError("Generation returned no compliant asset.");
      return;
    }

    const campaignName = asText(searchParams.get("campaignName")) || message.slice(0, 52) || "Studio campaign";
    const baseCampaign = buildCampaignFromMessages(message, generatedMessages, {
      name: campaignName,
      score: generatedScore,
      assets: generatedAssets,
    });

    const selectedCampaignId = asText(searchParams.get("campaignId"));
    const nextCampaign =
      selectedCampaignId
        ? {
            ...baseCampaign,
            id: selectedCampaignId,
            name: campaignName,
          }
        : baseCampaign;

    const current = await loadCampaignStoreAsync();
    const saved = await saveCampaignStoreAsync(upsertCampaign(current, nextCampaign));
    const persistedCampaign = saved.campaigns.find((campaign) => campaign.id === nextCampaign.id) || saved.campaigns[0];
    await postGenerationLogs(generatedScore, generatedAssets);

    setIsGenerating(false);
    if (!persistedCampaign?.assets.length) {
      setError("Generation completed but no asset was saved.");
      return;
    }

    setPreview({
      campaignId: persistedCampaign.id,
      campaignName: persistedCampaign.name,
      score: generatedScore,
      assets: generatedAssets,
      messages: generatedMessages,
    });
  };

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <Link
          to="/studio"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-4"
          style={{ fontSize: "13px" }}
        >
          <ArrowLeft size={14} />
          Back to Studio
        </Link>

        <h1 className="text-foreground mb-1" style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "-0.03em" }}>
          New Asset
        </h1>
        <p className="text-muted-foreground mb-5" style={{ fontSize: "14px" }}>
          Studio generation with Brand Vault, expanded brief fields and compliance checks.
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-5">
            <label className="text-muted-foreground block" style={{ fontSize: "12px", fontWeight: 500 }}>
              Brand Vault (required)
              <select
                value={vaultId}
                onChange={(event) => setVaultId(event.target.value)}
                className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                style={{ fontSize: "13px" }}
              >
                {vaultStore.vaults.map((vault) => (
                  <option key={vault.id} value={vault.id}>
                    {vault.name}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>
                  Model selector
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("single");
                      setSelectedModelIds([selectedModelIds[0] || modelOptions[0].id]);
                    }}
                    className={`rounded-md px-2.5 py-1 border cursor-pointer ${
                      mode === "single" ? "border-ora-signal bg-ora-signal-light text-foreground" : "border-border text-muted-foreground"
                    }`}
                    style={{ fontSize: "12px", fontWeight: 500 }}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("arena");
                      setSelectedModelIds((current) => (current.length < 2 ? [current[0] || modelOptions[0].id, modelOptions[1].id] : current));
                    }}
                    className={`rounded-md px-2.5 py-1 border cursor-pointer ${
                      mode === "arena" ? "border-ora-signal bg-ora-signal-light text-foreground" : "border-border text-muted-foreground"
                    }`}
                    style={{ fontSize: "12px", fontWeight: 500 }}
                  >
                    Arena (2-4)
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {modelOptions.map((model) => {
                  const selected = selectedModelIds.includes(model.id);
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => toggleModel(model.id)}
                      className={`border rounded-lg p-3 text-left transition-colors cursor-pointer ${
                        selected ? "border-ora-signal bg-ora-signal-light" : "border-border hover:border-border-strong"
                      }`}
                    >
                      <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 500 }}>
                        {model.name}
                      </p>
                      <p className="text-ora-signal" style={{ fontSize: "11px", fontWeight: 600 }}>
                        {model.credits} credit{model.credits > 1 ? "s" : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-muted-foreground mb-2" style={{ fontSize: "12px", fontWeight: 500 }}>
                Format selector
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {formatOptions.map((option) => {
                  const active = format === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFormat(option.id)}
                      className={`border rounded-lg px-3 py-2 text-left transition-colors cursor-pointer ${
                        active ? "border-ora-signal bg-ora-signal-light" : "border-border hover:border-border-strong"
                      }`}
                      style={{ fontSize: "12px", fontWeight: 500 }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground block" style={{ fontSize: "12px", fontWeight: 500 }}>
                Message
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={4}
                  placeholder="Describe what you need..."
                  className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50 resize-none"
                  style={{ fontSize: "13px", lineHeight: 1.45 }}
                />
              </label>

              <div className="grid sm:grid-cols-2 gap-2">
                <label className="text-muted-foreground block" style={{ fontSize: "12px", fontWeight: 500 }}>
                  Target
                  <input
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    placeholder="Who is this for?"
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50"
                    style={{ fontSize: "13px" }}
                  />
                </label>

                <label className="text-muted-foreground block" style={{ fontSize: "12px", fontWeight: 500 }}>
                  Objective
                  <select
                    value={objective}
                    onChange={(event) => setObjective(event.target.value)}
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                    style={{ fontSize: "13px" }}
                  >
                    <option value="awareness">Awareness</option>
                    <option value="engagement">Engagement</option>
                    <option value="conversion">Conversion</option>
                    <option value="retention">Retention</option>
                  </select>
                </label>
              </div>

              <label className="text-muted-foreground block" style={{ fontSize: "12px", fontWeight: 500 }}>
                Reference URL
                <input
                  value={refUrl}
                  onChange={(event) => setRefUrl(event.target.value)}
                  placeholder="https://product-page.com"
                  className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50"
                  style={{ fontSize: "13px" }}
                />
              </label>

              <label className="text-muted-foreground block" style={{ fontSize: "12px", fontWeight: 500 }}>
                Documents
                <input
                  type="file"
                  multiple
                  accept=".pdf,.ppt,.pptx,.doc,.docx"
                  onChange={(event) => setDocuments(Array.from(event.target.files || []))}
                  className="hidden"
                  id="studio-doc-upload"
                />
                <label
                  htmlFor="studio-doc-upload"
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer inline-flex items-center gap-2"
                  style={{ fontSize: "13px" }}
                >
                  <Upload size={14} />
                  {documents.length ? `${documents.length} file(s) selected` : "Upload PDF, PPTX, DOCX"}
                </label>
              </label>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 h-fit">
            <h2 className="text-foreground mb-2" style={{ fontSize: "14px", fontWeight: 600 }}>
              Credit breakdown
            </h2>
            <ul className="space-y-1.5 text-muted-foreground" style={{ fontSize: "12px" }}>
              <li>Text generation: {breakdownBase} cr</li>
              <li>URL crawl + doc parsing: 1 cr</li>
              <li>Compliance check: 1 cr</li>
              <li>Image/video generation: +3 cr if requested</li>
            </ul>
            <div className="border-t border-border mt-3 pt-3">
              <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                Generate — {studioCost} credits
              </p>
            </div>

            {error && (
              <p className="text-destructive mt-3" style={{ fontSize: "12px" }}>
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void generateAsset()}
              disabled={isGenerating || !message.trim()}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              style={{ fontSize: "14px", fontWeight: 600 }}
            >
              <Sparkles size={14} />
              {isGenerating ? "Generating..." : `Generate — ${studioCost} credits`}
            </button>

            <div className="mt-4 border border-border rounded-lg p-3">
              <p className="text-foreground mb-1" style={{ fontSize: "12px", fontWeight: 600 }}>
                Studio differences
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "11px", lineHeight: 1.45 }}>
                Vault selection is required. Every output is scored for compliance before approval and publish.
              </p>
            </div>

            <div className="mt-3 flex items-center gap-2 text-muted-foreground" style={{ fontSize: "11px" }}>
              <FileText size={12} />
              {mode === "arena" ? `${selectedModels.length} models selected` : selectedModels[0]?.name}
            </div>
          </div>
        </div>

        {preview && (
          <div className="mt-5 bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-foreground" style={{ fontSize: "18px", fontWeight: 600 }}>
                  Live generation result
                </p>
                <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                  {preview.campaignName} · Compliance {preview.score}/100
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/studio/campaign/${preview.campaignId}`)}
                  className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  style={{ fontSize: "12px", fontWeight: 600 }}
                >
                  <FolderKanban size={13} />
                  Open campaign
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstAsset = preview.assets[0];
                    if (!firstAsset) return;
                    void loadCampaignStoreAsync().then((store) => {
                      const campaign = store.campaigns.find((entry) => entry.id === preview.campaignId);
                      const realAsset = campaign?.assets[0];
                      if (realAsset) navigate(`/studio/asset/${realAsset.id}`);
                    });
                  }}
                  className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:opacity-90 transition-opacity cursor-pointer"
                  style={{ fontSize: "12px", fontWeight: 600 }}
                >
                  <CheckCircle2 size={13} />
                  Open first asset
                </button>
              </div>
            </div>

            {!!preview.messages.length && (
              <div className="space-y-2">
                {preview.messages.slice(0, 4).map((entry, index) => (
                  <div key={`${entry.agent}-${index}`} className="border border-border rounded-lg p-3">
                    <p className="text-foreground mb-1" style={{ fontSize: "12px", fontWeight: 600 }}>
                      {entry.agent || "ORA"} · {entry.role}
                    </p>
                    <p className="text-muted-foreground" style={{ fontSize: "12px", lineHeight: 1.45 }}>
                      {entry.text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {preview.assets.map((asset, index) => (
                <div key={`${asset.title}-${index}`} className="border border-border rounded-lg p-3">
                  <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 600 }}>
                    {asset.title}
                  </p>
                  <p className="text-muted-foreground mb-2" style={{ fontSize: "11px" }}>
                    {asset.channel} · {asset.compliance || preview.score}/100
                  </p>
                  {asset.mediaUrl && asset.mediaType !== "video" && (
                    <img src={asset.mediaUrl} alt={asset.title} className="w-full h-40 object-cover rounded-md border border-border mb-2" />
                  )}
                  {asset.mediaUrl && asset.mediaType === "video" && (
                    <video src={asset.mediaUrl} controls className="w-full h-40 object-cover rounded-md border border-border mb-2" />
                  )}
                  <p className="text-foreground/80 whitespace-pre-wrap line-clamp-5" style={{ fontSize: "12px", lineHeight: 1.45 }}>
                    {asset.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
