import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Copy, Send, Trash2, Download, Search } from "lucide-react";
import {
  loadHubStoreAsync,
  removeHubDraft,
  saveHubStoreAsync,
  type HubCategory,
  type HubDraft,
} from "../lib/hubStore";
import {
  loadCampaignStoreAsync,
  saveCampaignStoreAsync,
  sendHubDraftToStudio,
  type CampaignRecord,
} from "../lib/campaignStore";
import { useAuth } from "../lib/auth";
import { hasStudioAccess } from "../lib/studioAccess";

const filters: { id: "all" | HubCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "text", label: "Text" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "code", label: "Code" },
  { id: "audio", label: "Audio" },
];

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function timeAgo(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function HubHistoryPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [drafts, setDrafts] = useState<HubDraft[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | HubCategory>("all");
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<HubDraft | null>(null);
  const [studioCampaigns, setStudioCampaigns] = useState<CampaignRecord[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const store = await loadHubStoreAsync();
      setDrafts(store.drafts);
    };
    void load();
  }, []);

  const filteredDrafts = useMemo(() => {
    return drafts.filter((draft) => {
      if (filter !== "all" && draft.category !== filter) return false;
      if (!query.trim()) return true;
      const haystack = [draft.title, draft.prompt, draft.format, ...draft.results.map((result) => result.modelName)].join(" ").toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
  }, [drafts, filter, query]);

  const deleteDraft = async (draftId: string) => {
    const current = await loadHubStoreAsync();
    const next = removeHubDraft(current, draftId);
    const saved = await saveHubStoreAsync(next);
    setDrafts(saved.drafts);
  };

  const copyDraft = async (draft: HubDraft) => {
    const winner = draft.results.find((result) => result.id === draft.winnerResultId) ?? draft.results[0];
    if (!winner) return;
    try {
      await navigator.clipboard.writeText(winner.text);
    } catch (_error) {
      // no-op
    }
  };

  const downloadDraft = (draft: HubDraft) => {
    const winner = draft.results.find((result) => result.id === draft.winnerResultId) ?? draft.results[0];
    if (!winner) return;
    const blob = new Blob([winner.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "hub-draft"}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openSendDialog = async (draft: HubDraft) => {
    if (!hasStudioAccess(profile?.subscription)) {
      navigate("/pricing");
      return;
    }
    const store = await loadCampaignStoreAsync();
    setStudioCampaigns(store.campaigns);
    setSelectedDraft(draft);
    setSelectedCampaignId("");
    setCampaignName(draft.title);
    setError("");
    setSendDialogOpen(true);
  };

  const sendToStudio = async () => {
    if (!selectedDraft) return;
    const winner = selectedDraft.results.find((result) => result.id === selectedDraft.winnerResultId) ?? selectedDraft.results[0];
    if (!winner) return;
    setIsSending(true);
    setError("");
    try {
      const store = await loadCampaignStoreAsync();
      const sent = sendHubDraftToStudio(store, {
        draftId: selectedDraft.id,
        draftTitle: selectedDraft.title,
        prompt: selectedDraft.prompt,
        format: selectedDraft.format,
        resultBody: winner.text,
        resultType: selectedDraft.category,
        resultChannel: selectedDraft.format,
        complianceScore: winner.score ?? 94,
        mediaUrl: winner.mediaUrl,
        mediaType: selectedDraft.category === "video" ? "video" : selectedDraft.category === "image" ? "image" : undefined,
        mediaProvider: winner.mediaUrl ? winner.provider : undefined,
        mediaStatus: winner.mediaUrl ? "ready" : undefined,
        selectedCampaignId: selectedCampaignId || undefined,
        campaignName: selectedCampaignId ? undefined : campaignName || selectedDraft.title,
        createdBy: profile?.fullName || profile?.email || undefined,
      });
      await saveCampaignStoreAsync(sent.store);
      setSendDialogOpen(false);
      navigate(`/studio/asset/${sent.assetId}`);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send draft.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <Link
          to="/hub"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-4"
          style={{ fontSize: "13px" }}
        >
          <ArrowLeft size={14} />
          Back to Hub
        </Link>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-foreground mb-1" style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "-0.03em" }}>
              My Drafts
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
              Personal workspace. Nothing here is checked for brand compliance.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {filters.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`rounded-lg border px-3 py-1.5 transition-colors cursor-pointer ${
                filter === item.id ? "border-ora-signal bg-ora-signal-light text-foreground" : "border-border text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontSize: "12px", fontWeight: 500 }}
            >
              {item.label}
            </button>
          ))}

          <div className="relative ml-auto w-full sm:w-[300px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search drafts..."
              className="w-full bg-card border border-border rounded-lg pl-8 pr-3 py-2 text-foreground placeholder:text-muted-foreground/50"
              style={{ fontSize: "13px" }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {!filteredDrafts.length && (
            <div className="bg-card border border-border rounded-xl p-6">
              <p className="text-foreground mb-1" style={{ fontSize: "16px", fontWeight: 500 }}>
                Nothing here yet.
              </p>
              <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
                Your generations will appear here as you create them.
              </p>
            </div>
          )}

          {filteredDrafts.map((draft) => {
            const winner = draft.results.find((result) => result.id === draft.winnerResultId) ?? draft.results[0];
            return (
              <div key={draft.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="text-foreground mb-1" style={{ fontSize: "15px", fontWeight: 600 }}>
                      {draft.title}
                    </p>
                    <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                      {draft.format} · {winner?.modelName} · {timeAgo(draft.updatedAt)} · {draft.totalCredits} credits
                    </p>
                  </div>
                </div>
                <p className="text-foreground/85 line-clamp-2 mb-3 whitespace-pre-wrap" style={{ fontSize: "13px", lineHeight: 1.45 }}>
                  {winner?.text || draft.prompt}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/hub?draft=${draft.id}`}
                    className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    style={{ fontSize: "12px", fontWeight: 500 }}
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => void copyDraft(draft)}
                    className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 500 }}
                  >
                    <Copy size={13} />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadDraft(draft)}
                    className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 500 }}
                  >
                    <Download size={13} />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => void openSendDialog(draft)}
                    className="inline-flex items-center gap-1.5 border border-ora-signal rounded-lg px-3 py-1.5 text-ora-signal hover:bg-ora-signal-light transition-colors cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 600 }}
                  >
                    <Send size={13} />
                    Send to Studio →
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteDraft(draft.id)}
                    className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 500 }}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {sendDialogOpen && selectedDraft && (
        <div className="fixed inset-0 bg-black/35 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[620px] bg-background border border-border rounded-xl p-5">
            <h3 className="text-foreground mb-1" style={{ fontSize: "18px", fontWeight: 600 }}>
              Send to Studio
            </h3>
            <p className="text-muted-foreground mb-4" style={{ fontSize: "13px" }}>
              Run compliance checks and create a Studio asset from this draft.
            </p>
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
            {error && (
              <p className="text-destructive mb-2" style={{ fontSize: "12px" }}>
                {error}
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
                onClick={() => void sendToStudio()}
                disabled={isSending}
                className="bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:opacity-90 transition-opacity disabled:opacity-70 cursor-pointer"
                style={{ fontSize: "13px", fontWeight: 600 }}
              >
                {isSending ? "Sending..." : "Send to Studio — 2 credits"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
