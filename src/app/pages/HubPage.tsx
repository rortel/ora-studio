import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  FileText,
  Image as ImageIcon,
  Video,
  Code2,
  AudioLines,
  Copy,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Scissors,
  CheckCircle2,
} from "lucide-react";
import {
  createHubDraft,
  loadHubStoreAsync,
  saveHubStoreAsync,
  type HubCategory,
  type HubDraft,
  type HubModelResult,
  type HubRunMode,
} from "../lib/hubStore";
import {
  loadCampaignStoreAsync,
  saveCampaignStoreAsync,
  sendHubDraftToStudio,
  type CampaignRecord,
} from "../lib/campaignStore";
import { hasStudioAccess } from "../lib/studioAccess";
import { useAuth } from "../lib/auth";
import { getAccessToken } from "../lib/authToken";

type ModelOption = {
  id: string;
  name: string;
  provider: string;
  tier: "fast" | "pro";
  credits: number;
};

type FormatOption = {
  id: string;
  label: string;
  hint: string;
};

const categories: { id: HubCategory; label: string; icon: typeof FileText }[] = [
  { id: "text", label: "Text", icon: FileText },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "video", label: "Video", icon: Video },
  { id: "code", label: "Code", icon: Code2 },
  { id: "audio", label: "Audio", icon: AudioLines },
];

const modelCatalog: Record<HubCategory, ModelOption[]> = {
  text: [
    { id: "gemini-flash", name: "Gemini Flash", provider: "Google", tier: "fast", credits: 1 },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", tier: "fast", credits: 1 },
    { id: "claude-haiku", name: "Claude Haiku", provider: "Anthropic", tier: "fast", credits: 1 },
    { id: "claude-sonnet", name: "Claude Sonnet", provider: "Anthropic", tier: "pro", credits: 2 },
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", tier: "pro", credits: 2 },
    { id: "gemini-pro", name: "Gemini Pro", provider: "Google", tier: "pro", credits: 2 },
  ],
  image: [
    { id: "flux-pro", name: "FLUX Pro", provider: "Black Forest Labs", tier: "pro", credits: 3 },
    { id: "dall-e-3", name: "DALL-E 3", provider: "OpenAI", tier: "pro", credits: 3 },
    { id: "imagen-3", name: "Imagen 3", provider: "Google", tier: "pro", credits: 3 },
    { id: "flux-schnell", name: "FLUX Schnell", provider: "Black Forest Labs", tier: "fast", credits: 2 },
  ],
  video: [
    { id: "veo-2", name: "Veo 2", provider: "Google", tier: "pro", credits: 10 },
    { id: "runway-gen4", name: "Runway Gen-4", provider: "Runway", tier: "pro", credits: 10 },
    { id: "kling-2", name: "Kling 2", provider: "Kuaishou", tier: "pro", credits: 10 },
  ],
  code: [
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", tier: "pro", credits: 2 },
    { id: "claude-sonnet", name: "Claude Sonnet", provider: "Anthropic", tier: "pro", credits: 2 },
    { id: "llama-3-70b", name: "Llama 3 70B", provider: "Meta", tier: "fast", credits: 1 },
  ],
  audio: [
    { id: "gpt-4o-audio", name: "GPT-4o Audio", provider: "OpenAI", tier: "pro", credits: 2 },
    { id: "gemini-audio", name: "Gemini Audio", provider: "Google", tier: "pro", credits: 2 },
  ],
};

const formats: FormatOption[] = [
  { id: "linkedin-post", label: "LinkedIn Post", hint: "Max 1300 chars, hook in first 2 lines" },
  { id: "email", label: "Email", hint: "Subject + clear CTA" },
  { id: "ad", label: "Ad", hint: "Short, benefit-driven copy" },
  { id: "blog-post", label: "Blog Post", hint: "Structured with sections" },
  { id: "free-prompt", label: "Free Prompt", hint: "No format constraints" },
  { id: "instagram-caption", label: "Instagram Caption", hint: "Compact, social tone" },
  { id: "tweet", label: "Tweet", hint: "Concise, high-impact line" },
  { id: "newsletter", label: "Newsletter", hint: "Editorial digest format" },
];

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function titleFromPrompt(prompt: string) {
  const clean = asText(prompt).replace(/\s+/g, " ");
  if (!clean) return "Untitled generation";
  return clean.length > 56 ? `${clean.slice(0, 53).trimEnd()}...` : clean;
}

function channelFromFormat(format: string) {
  const match = formats.find((item) => item.id === format);
  return match?.label || "Free Prompt";
}

export function HubPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const [category, setCategory] = useState<HubCategory>("text");
  const [mode, setMode] = useState<HubRunMode>("single");
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>(["gemini-flash"]);
  const [selectedFormat, setSelectedFormat] = useState<string>("linkedin-post");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [hubDrafts, setHubDrafts] = useState<HubDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [studioCampaigns, setStudioCampaigns] = useState<CampaignRecord[]>([]);
  const [isSendingToStudio, setIsSendingToStudio] = useState(false);
  const [sendError, setSendError] = useState("");
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const modelOptions = modelCatalog[category];

  const selectedModels = useMemo(
    () => modelOptions.filter((model) => selectedModelIds.includes(model.id)),
    [modelOptions, selectedModelIds],
  );

  const totalCredits = useMemo(
    () => selectedModels.reduce((sum, model) => sum + model.credits, 0),
    [selectedModels],
  );

  const activeDraft = useMemo(
    () => hubDrafts.find((draft) => draft.id === activeDraftId) ?? null,
    [activeDraftId, hubDrafts],
  );

  const winnerResult = useMemo(() => {
    if (!activeDraft) return null;
    if (activeDraft.winnerResultId) {
      return activeDraft.results.find((result) => result.id === activeDraft.winnerResultId) ?? activeDraft.results[0] ?? null;
    }
    return activeDraft.results[0] ?? null;
  }, [activeDraft]);

  useEffect(() => {
    const boot = async () => {
      const store = await loadHubStoreAsync();
      setHubDrafts(store.drafts);
      const idFromQuery = asText(searchParams.get("draft"));
      if (idFromQuery && store.drafts.some((draft) => draft.id === idFromQuery)) {
        setActiveDraftId(idFromQuery);
        return;
      }
      if (store.drafts.length) {
        setActiveDraftId(store.drafts[0].id);
      }
    };
    void boot();
  }, [searchParams]);

  useEffect(() => {
    setSelectedModelIds((current) => {
      const allowed = modelCatalog[category].map((model) => model.id);
      const next = current.filter((id) => allowed.includes(id));
      if (next.length) return next;
      return [allowed[0]];
    });
  }, [category]);

  const persistDraft = async (draft: HubDraft) => {
    const current = await loadHubStoreAsync();
    const nextStore = {
      drafts: [draft, ...current.drafts.filter((entry) => entry.id !== draft.id)].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      ),
    };
    const saved = await saveHubStoreAsync(nextStore);
    setHubDrafts(saved.drafts);
    setActiveDraftId(draft.id);
  };

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

  const postGenerationLogs = async (results: HubModelResult[]) => {
    const token = getAccessToken();
    if (!token || !results.length) return;
    const entries = results.map((result) => ({
      module: "hub",
      category,
      format: selectedFormat,
      modelId: result.modelId,
      modelName: result.modelName,
      provider: result.provider,
      credits: result.credits,
      latencyMs: result.latencyMs,
      status: "success",
      compliance: result.score || 0,
      channel: channelFromFormat(selectedFormat),
    }));
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

  const generateResults = async () => {
    if (!prompt.trim() || !selectedModels.length || isGenerating) return;
    setIsGenerating(true);
    setGenerationError("");
    setActiveDraftId(null);

    try {
      const token = getAccessToken();
      if (!token) {
        setGenerationError("Session expired. Please sign in again.");
        return;
      }

      const response = await fetch("/api/hub-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          mode,
          format: selectedFormat,
          prompt: prompt.trim(),
          models: selectedModels,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        const reason = asText(payload?.error) || `HTTP ${response.status}`;
        setGenerationError(`Generation failed: ${reason}`);
        return;
      }

      const modelResults: HubModelResult[] = (Array.isArray(payload.results) ? payload.results : [])
        .map((result: unknown) => {
          if (!result || typeof result !== "object" || Array.isArray(result)) return null;
          const item = result as Partial<HubModelResult> & { error?: unknown };
          const id = asText(item.id);
          const modelId = asText(item.modelId);
          const modelName = asText(item.modelName);
          const provider = asText(item.provider);
          if (!id || !modelId || !modelName || !provider) return null;
          return {
            id,
            modelId,
            modelName,
            provider,
            latencyMs: typeof item.latencyMs === "number" ? item.latencyMs : 0,
            credits: typeof item.credits === "number" ? item.credits : 0,
            text: asText(item.text) || asText((item as { error?: unknown }).error) || "No output.",
            mediaUrl: asText(item.mediaUrl) || undefined,
            score: typeof item.score === "number" ? item.score : undefined,
          } satisfies HubModelResult;
        })
        .filter((result): result is HubModelResult => Boolean(result));

      if (!modelResults.length) {
        setGenerationError("Generation returned no usable output.");
        return;
      }

      const draft = createHubDraft({
        title: titleFromPrompt(prompt),
        prompt: prompt.trim(),
        category,
        format: selectedFormat,
        mode,
        totalCredits,
        results: modelResults,
        winnerResultId:
          asText(payload?.winnerResultId) ||
          (mode === "arena"
            ? [...modelResults].sort((a, b) => (b.score || 0) - (a.score || 0))[0]?.id
            : modelResults[0]?.id),
      });

      await persistDraft(draft);
      void postGenerationLogs(modelResults);

      if (payload?.hasErrors) {
        setGenerationError("Some model calls failed. You can still use the successful outputs above.");
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      setGenerationError(`Generation failed: ${reason}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateDraft = () => {
    setPrompt(activeDraft?.prompt || prompt);
    void generateResults();
  };

  const copyResult = async (result: HubModelResult | null) => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
    } catch (_error) {
      // no-op
    }
  };

  const saveCurrentDraft = async () => {
    if (!activeDraft) return;
    await persistDraft({ ...activeDraft, updatedAt: new Date().toISOString() });
  };

  const pickArenaWinner = async (resultId: string) => {
    if (!activeDraft) return;
    const nextDraft = {
      ...activeDraft,
      winnerResultId: resultId,
      updatedAt: new Date().toISOString(),
    };
    await persistDraft(nextDraft);
  };

  const mixArenaOutputs = async () => {
    if (!activeDraft || activeDraft.results.length < 2) return;
    const stitched = activeDraft.results
      .slice(0, 3)
      .map((result, index) => `Part ${index + 1} (${result.modelName}): ${result.text.split("\n")[0]}`)
      .join("\n");
    const mixed: HubModelResult = {
      id: `mix-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      modelId: "ora-mix",
      modelName: "ORA Mix",
      provider: "ORA",
      latencyMs: 780,
      credits: 0,
      text: stitched,
      mediaUrl:
        category === "image" || category === "video"
          ? activeDraft.results.find((result) => asText(result.mediaUrl))?.mediaUrl
          : undefined,
      score: 98,
    };
    const nextDraft: HubDraft = {
      ...activeDraft,
      results: [mixed, ...activeDraft.results],
      winnerResultId: mixed.id,
      updatedAt: new Date().toISOString(),
    };
    await persistDraft(nextDraft);
  };

  const openSendDialog = async () => {
    if (!activeDraft) return;
    if (!hasStudioAccess(profile?.subscription)) {
      setUpgradePromptOpen(true);
      return;
    }
    const store = await loadCampaignStoreAsync();
    setStudioCampaigns(store.campaigns);
    setCampaignName(activeDraft.title);
    setSelectedCampaignId("");
    setSendError("");
    setSendDialogOpen(true);
  };

  const confirmSendToStudio = async () => {
    if (!activeDraft || !winnerResult) return;
    setIsSendingToStudio(true);
    setSendError("");
    try {
      const store = await loadCampaignStoreAsync();
      const sent = sendHubDraftToStudio(store, {
        draftId: activeDraft.id,
        draftTitle: activeDraft.title,
        prompt: activeDraft.prompt,
        format: activeDraft.format,
        resultBody: winnerResult.text,
        resultType: activeDraft.category,
        resultChannel: channelFromFormat(activeDraft.format),
        complianceScore: winnerResult.score || 94,
        mediaUrl: winnerResult.mediaUrl,
        mediaType: activeDraft.category === "video" ? "video" : activeDraft.category === "image" ? "image" : undefined,
        mediaProvider: winnerResult.mediaUrl ? winnerResult.provider : undefined,
        mediaStatus: winnerResult.mediaUrl ? "ready" : undefined,
        selectedCampaignId: selectedCampaignId || undefined,
        campaignName: campaignName || activeDraft.title,
        createdBy: profile?.fullName || profile?.email || undefined,
      });
      await saveCampaignStoreAsync(sent.store);
      setSendDialogOpen(false);
      navigate(`/studio/asset/${sent.assetId}`);
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Unable to send draft to Studio.");
    } finally {
      setIsSendingToStudio(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        <div>
          <h1 className="text-foreground mb-1" style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "-0.03em" }}>
            Hub
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: "15px" }}>
            Pick any model. Generate in seconds. No brand rules in Hub.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_420px] gap-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-foreground mb-0.5" style={{ fontSize: "18px", fontWeight: 600 }}>
                  Output
                </h2>
                <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                  {activeDraft
                    ? `${activeDraft.results.length} model${activeDraft.results.length > 1 ? "s" : ""} · ${channelFromFormat(activeDraft.format)} · ${activeDraft.totalCredits} credits`
                    : "Generate to view your outputs here."}
                </p>
              </div>
              {activeDraft && (
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                  Updated {nowLabel()}
                </p>
              )}
            </div>

            {!activeDraft && (
              <div className="border border-dashed border-border rounded-xl p-8 text-center">
                <p className="text-foreground mb-1" style={{ fontSize: "15px", fontWeight: 500 }}>
                  Your result appears here first
                </p>
                <p className="text-muted-foreground" style={{ fontSize: "13px", lineHeight: 1.5 }}>
                  Pick model(s), write your prompt, and click generate. Image, video, text or code outputs will show in this panel.
                </p>
              </div>
            )}

            {generationError && (
              <div className="mt-3 border border-destructive/40 bg-destructive/5 rounded-lg px-3 py-2">
                <p className="text-destructive" style={{ fontSize: "12px", lineHeight: 1.4 }}>
                  {generationError}
                </p>
              </div>
            )}

            {isGenerating && !activeDraft && (
              <div className="mt-3 border border-border rounded-xl p-4">
                <p className="text-foreground" style={{ fontSize: "13px", fontWeight: 500 }}>
                  Generating outputs...
                </p>
              </div>
            )}

            {activeDraft?.mode === "single" && winnerResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="border border-border rounded-lg p-4">
                  <p className="text-muted-foreground mb-2" style={{ fontSize: "11px" }}>
                    {winnerResult.modelName} · {winnerResult.provider} · {(winnerResult.latencyMs / 1000).toFixed(1)}s
                  </p>
                  {winnerResult.mediaUrl &&
                    (activeDraft.category === "video" ? (
                      <video
                        src={winnerResult.mediaUrl}
                        controls
                        className="w-full h-[340px] object-cover rounded-md border border-border mb-3"
                      />
                    ) : (
                      <img
                        src={winnerResult.mediaUrl}
                        alt="Generated"
                        className="w-full h-[340px] object-cover rounded-md border border-border mb-3"
                      />
                    ))}
                  <p className="text-foreground whitespace-pre-wrap" style={{ fontSize: "14px", lineHeight: 1.55 }}>
                    {winnerResult.text}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void openSendDialog()}
                    className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:opacity-90 transition-opacity cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 600 }}
                  >
                    <CheckCircle2 size={13} />
                    Get this
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyResult(winnerResult)}
                    className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 500 }}
                  >
                    <Copy size={13} />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={regenerateDraft}
                    className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 500 }}
                  >
                    <RefreshCw size={13} />
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveCurrentDraft()}
                    className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 500 }}
                  >
                    <Save size={13} />
                    Save
                  </button>
                </div>
              </motion.div>
            )}

            {activeDraft?.mode === "arena" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {activeDraft.results.map((result) => {
                    const picked = activeDraft.winnerResultId === result.id;
                    return (
                      <div
                        key={result.id}
                        className={`border rounded-lg p-3 ${picked ? "border-ora-signal bg-ora-signal-light" : "border-border"}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
                            {result.modelName}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-ora-signal" style={{ fontSize: "11px", fontWeight: 600 }}>
                              {result.score ?? 0}/100
                            </p>
                            {picked && (
                              <span className="text-foreground bg-background border border-ora-signal rounded-md px-1.5 py-0.5" style={{ fontSize: "10px", fontWeight: 600 }}>
                                Selected
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-muted-foreground mb-2" style={{ fontSize: "10px" }}>
                          {(result.latencyMs / 1000).toFixed(1)}s · {result.credits} credits
                        </p>
                        {result.mediaUrl &&
                          (activeDraft.category === "video" ? (
                            <video
                              src={result.mediaUrl}
                              controls
                              className="w-full h-44 object-cover rounded-md border border-border mb-2"
                            />
                          ) : (
                            <img src={result.mediaUrl} alt={result.modelName} className="w-full h-44 object-cover rounded-md border border-border mb-2" />
                          ))}
                        <p className="text-foreground/85 line-clamp-5 whitespace-pre-wrap" style={{ fontSize: "12px", lineHeight: 1.45 }}>
                          {result.text}
                        </p>
                        <button
                          type="button"
                          onClick={() => void pickArenaWinner(result.id)}
                          className="mt-3 inline-flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                          style={{ fontSize: "11px", fontWeight: 600 }}
                        >
                          <CheckCircle2 size={12} />
                          Get this
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void openSendDialog()}
                    className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:opacity-90 transition-opacity cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 600 }}
                  >
                    <Send size={13} />
                    Get selected
                  </button>
                  <button
                    type="button"
                    onClick={() => void mixArenaOutputs()}
                    className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 500 }}
                  >
                    <Scissors size={13} />
                    Mix outputs
                  </button>
                  <button
                    type="button"
                    onClick={regenerateDraft}
                    className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 500 }}
                  >
                    <RefreshCw size={13} />
                    Regenerate
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-5">
              <div>
                <p className="text-muted-foreground mb-2" style={{ fontSize: "12px", fontWeight: 500 }}>
                  Category
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {categories.map((item) => {
                    const Icon = item.icon;
                    const active = item.id === category;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setCategory(item.id)}
                        className={`rounded-lg border px-3 py-2 flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                          active ? "border-ora-signal text-foreground bg-ora-signal-light" : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                        style={{ fontSize: "13px", fontWeight: active ? 500 : 450 }}
                      >
                        <Icon size={14} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>
                    Model selector
                  </p>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("single");
                        setSelectedModelIds((current) => [current[0] || modelOptions[0].id]);
                      }}
                      className={`rounded-md px-2.5 py-1 border cursor-pointer ${
                        mode === "single" ? "border-ora-signal text-foreground bg-ora-signal-light" : "border-border text-muted-foreground"
                      }`}
                      style={{ fontSize: "12px", fontWeight: 500 }}
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("arena");
                        setSelectedModelIds((current) =>
                          current.length < 2 ? [current[0] || modelOptions[0].id, modelOptions[1]?.id || modelOptions[0].id] : current,
                        );
                      }}
                      className={`rounded-md px-2.5 py-1 border cursor-pointer ${
                        mode === "arena" ? "border-ora-signal text-foreground bg-ora-signal-light" : "border-border text-muted-foreground"
                      }`}
                      style={{ fontSize: "12px", fontWeight: 500 }}
                    >
                      Arena (2-4)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {modelOptions.map((model) => {
                    const selected = selectedModelIds.includes(model.id);
                    return (
                      <button
                        type="button"
                        key={model.id}
                        onClick={() => toggleModel(model.id)}
                        className={`text-left border rounded-lg p-3 transition-colors cursor-pointer ${
                          selected ? "border-ora-signal bg-ora-signal-light" : "border-border hover:border-border-strong"
                        }`}
                      >
                        <p className="text-foreground mb-1" style={{ fontSize: "13px", fontWeight: 500 }}>
                          {model.name}
                        </p>
                        <p className="text-muted-foreground mb-1.5" style={{ fontSize: "11px" }}>
                          {model.provider}
                        </p>
                        <p className="text-ora-signal" style={{ fontSize: "11px", fontWeight: 600 }}>
                          {model.tier === "fast" ? "⚡" : "★"} {model.credits} credit{model.credits > 1 ? "s" : ""}
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
                <div className="grid grid-cols-2 gap-2">
                  {formats.map((format) => {
                    const active = selectedFormat === format.id;
                    return (
                      <button
                        type="button"
                        key={format.id}
                        onClick={() => setSelectedFormat(format.id)}
                        className={`rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                          active ? "border-ora-signal bg-ora-signal-light" : "border-border hover:border-border-strong"
                        }`}
                      >
                        <p className="text-foreground mb-0.5" style={{ fontSize: "12px", fontWeight: 500 }}>
                          {format.label}
                        </p>
                        <p className="text-muted-foreground leading-tight" style={{ fontSize: "10px" }}>
                          {format.hint}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-muted-foreground mb-2" style={{ fontSize: "12px", fontWeight: 500 }}>
                  Prompt
                </p>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={5}
                  placeholder="Describe what you need..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground placeholder:text-muted-foreground/50 resize-none"
                  style={{ fontSize: "14px", lineHeight: 1.45 }}
                />
              </div>

              <button
                type="button"
                onClick={() => void generateResults()}
                disabled={isGenerating || !prompt.trim() || !selectedModels.length}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                style={{ fontSize: "14px", fontWeight: 500 }}
              >
                <Sparkles size={15} />
                {isGenerating ? "Generating..." : `Generate — ${totalCredits} credit${totalCredits > 1 ? "s" : ""}`}
              </button>
            </div>

            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
                    Recent outputs
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                    Personal drafts. No compliance checks.
                  </p>
                </div>
                <Link
                  to="/hub/history"
                  className="text-ora-signal hover:opacity-80 transition-opacity"
                  style={{ fontSize: "12px", fontWeight: 600 }}
                >
                  Open history
                </Link>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {!hubDrafts.length && (
                  <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                    Your generations will appear here.
                  </p>
                )}
                {hubDrafts.slice(0, 8).map((draft) => (
                  <button
                    type="button"
                    key={draft.id}
                    onClick={() => setActiveDraftId(draft.id)}
                    className={`w-full text-left border rounded-lg p-3 transition-colors cursor-pointer ${
                      activeDraftId === draft.id ? "border-ora-signal bg-ora-signal-light" : "border-border hover:border-border-strong"
                    }`}
                  >
                    <p className="text-foreground mb-1" style={{ fontSize: "13px", fontWeight: 500 }}>
                      {draft.title}
                    </p>
                    <p className="text-muted-foreground line-clamp-2 mb-1.5" style={{ fontSize: "11px" }}>
                      {draft.prompt}
                    </p>
                    <p className="text-ora-signal" style={{ fontSize: "11px", fontWeight: 600 }}>
                      {draft.mode === "arena" ? `${draft.results.length} models` : draft.results[0]?.modelName} · {draft.totalCredits} credits
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {upgradePromptOpen && (
        <div className="fixed inset-0 bg-black/35 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[540px] bg-background border border-border rounded-xl p-5">
            <h3 className="text-foreground mb-2" style={{ fontSize: "18px", fontWeight: 600 }}>
              Studio required
            </h3>
            <p className="text-muted-foreground mb-4" style={{ fontSize: "14px", lineHeight: 1.55 }}>
              Send to Studio is available on the Studio + Brand Vault plan. Upgrade to unlock compliance checks, approval workflow and campaign publishing.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUpgradePromptOpen(false)}
                className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                style={{ fontSize: "13px", fontWeight: 500 }}
              >
                Close
              </button>
              <Link
                to="/pricing"
                onClick={() => setUpgradePromptOpen(false)}
                className="bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:opacity-90 transition-opacity"
                style={{ fontSize: "13px", fontWeight: 600 }}
              >
                Upgrade to Studio
              </Link>
            </div>
          </div>
        </div>
      )}

      {sendDialogOpen && activeDraft && winnerResult && (
        <div className="fixed inset-0 bg-black/35 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[640px] bg-background border border-border rounded-xl p-5">
            <h3 className="text-foreground mb-1" style={{ fontSize: "18px", fontWeight: 600 }}>
              Send to Studio
            </h3>
            <p className="text-muted-foreground mb-4" style={{ fontSize: "13px" }}>
              This will run compliance checks and create a Studio asset with version history.
            </p>

            <div className="border border-border rounded-lg p-3 mb-3">
              <p className="text-muted-foreground mb-1" style={{ fontSize: "11px", fontWeight: 500 }}>
                Content preview
              </p>
              <p className="text-foreground line-clamp-4 whitespace-pre-wrap" style={{ fontSize: "12px", lineHeight: 1.45 }}>
                {winnerResult.text}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <label className="text-muted-foreground" style={{ fontSize: "12px" }}>
                Add to campaign
                <select
                  value={selectedCampaignId}
                  onChange={(event) => setSelectedCampaignId(event.target.value)}
                  className="w-full mt-1 bg-card border border-border rounded-lg px-3 py-2 text-foreground"
                  style={{ fontSize: "13px" }}
                >
                  <option value="">Create new campaign</option>
                  {studioCampaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </label>

              {!selectedCampaignId && (
                <label className="text-muted-foreground" style={{ fontSize: "12px" }}>
                  Campaign name
                  <input
                    value={campaignName}
                    onChange={(event) => setCampaignName(event.target.value)}
                    className="w-full mt-1 bg-card border border-border rounded-lg px-3 py-2 text-foreground"
                    style={{ fontSize: "13px" }}
                  />
                </label>
              )}
            </div>

            <p className="text-muted-foreground mb-3" style={{ fontSize: "12px" }}>
              Additional Studio cost: 2 credits (compliance + enrichment).
            </p>
            {sendError && (
              <p className="text-destructive mb-3" style={{ fontSize: "12px" }}>
                {sendError}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSendDialogOpen(false)}
                className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                style={{ fontSize: "13px", fontWeight: 500 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmSendToStudio()}
                disabled={isSendingToStudio}
                className="bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:opacity-90 transition-opacity disabled:opacity-70 cursor-pointer"
                style={{ fontSize: "13px", fontWeight: 600 }}
              >
                {isSendingToStudio ? "Sending..." : "Send to Studio — 2 credits"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
