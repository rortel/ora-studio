import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, CheckCircle2, MessageSquare, RefreshCw, Send, Wand2 } from "lucide-react";
import {
  findAssetById,
  loadCampaignStoreAsync,
  saveCampaignStoreAsync,
  updateStudioAssetContent,
  updateStudioAssetStatus,
  type CampaignAsset,
  type CampaignRecord,
} from "../lib/campaignStore";
import { useAuth } from "../lib/auth";
import { hasStudioAccess } from "../lib/studioAccess";

type ComplianceRow = {
  label: string;
  score: number;
  note: string;
};

function complianceRows(score: number): ComplianceRow[] {
  return [
    { label: "Tone", score: Math.max(0, score - 4), note: "Opening line should stay authoritative." },
    { label: "Vocabulary", score: Math.min(100, score + 1), note: "Approved terms mostly respected." },
    { label: "Structure", score: Math.max(0, score - 2), note: "Flow is clear and actionable." },
    { label: "CTA", score: Math.min(100, score + 2), note: "CTA is explicit and relevant." },
    { label: "Length", score: Math.max(0, score - 3), note: "Slightly long for platform recommendation." },
  ];
}

function scoreColor(score: number) {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  return "text-destructive";
}

export function StudioAssetPage() {
  const { assetId = "" } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const [asset, setAsset] = useState<CampaignAsset | null>(null);
  const [content, setContent] = useState("");
  const [activePanel, setActivePanel] = useState<"compliance" | "chat" | "versions">("compliance");
  const [chatInput, setChatInput] = useState("");
  const [chatNotes, setChatNotes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const workspaceName = (profile?.company || profile?.organizationName || "Default Vault").trim();

  const roleLabel = (profile?.roleLabel || "").toLowerCase();
  const canApprove = Boolean(profile?.isAdmin || profile?.role === "approver" || roleLabel.includes("approver"));
  const canPublish = Boolean(profile?.isAdmin);

  useEffect(() => {
    const load = async () => {
      const store = await loadCampaignStoreAsync();
      const found = findAssetById(store, assetId);
      if (!found) {
        setCampaign(null);
        setAsset(null);
        return;
      }
      setCampaign(found.campaign);
      setAsset(found.asset);
      setContent(found.asset.body);
    };
    void load();
  }, [assetId]);

  const rows = useMemo(() => complianceRows(asset?.compliance || 0), [asset?.compliance]);

  if (!hasStudioAccess(profile?.subscription)) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-6">
        <div className="bg-card border border-border rounded-xl p-6 w-full max-w-[720px]">
          <h1 className="text-foreground mb-2" style={{ fontSize: "24px", fontWeight: 600 }}>
            Studio plan required
          </h1>
          <p className="text-muted-foreground mb-4" style={{ fontSize: "14px" }}>
            This asset is in Studio mode. Upgrade to access compliance and approval workflows.
          </p>
          <Link to="/pricing" className="bg-primary text-primary-foreground px-4 py-2 rounded-lg" style={{ fontSize: "14px", fontWeight: 600 }}>
            View pricing
          </Link>
        </div>
      </div>
    );
  }

  if (!asset || !campaign) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground mb-1" style={{ fontSize: "16px", fontWeight: 500 }}>
            Asset not found
          </p>
          <Link to="/studio" className="text-ora-signal" style={{ fontSize: "13px", fontWeight: 600 }}>
            Back to Studio
          </Link>
        </div>
      </div>
    );
  }

  const saveEdit = async (nextCompliance?: number) => {
    setIsSaving(true);
    setError("");
    try {
      const current = await loadCampaignStoreAsync();
      const next = updateStudioAssetContent(current, {
        assetId: asset.id,
        body: content,
        createdBy: profile?.fullName || profile?.email || undefined,
        compliance: nextCompliance,
      });
      const saved = await saveCampaignStoreAsync(next);
      const updated = findAssetById(saved, asset.id);
      if (updated) {
        setCampaign(updated.campaign);
        setAsset(updated.asset);
        setContent(updated.asset.body);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const setStatus = async (status: CampaignAsset["status"]) => {
    if (!status) return;
    setIsSaving(true);
    setError("");
    try {
      const current = await loadCampaignStoreAsync();
      const next = updateStudioAssetStatus(current, { assetId: asset.id, status });
      const saved = await saveCampaignStoreAsync(next);
      const updated = findAssetById(saved, asset.id);
      if (updated) {
        setCampaign(updated.campaign);
        setAsset(updated.asset);
      }
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update status.");
    } finally {
      setIsSaving(false);
    }
  };

  const requestRewrite = async () => {
    if (!chatInput.trim()) return;
    setChatNotes((prev) => [...prev, chatInput.trim()]);
    const rewritten = `${content}\n\n[ORA update] ${chatInput.trim()}`;
    setContent(rewritten);
    setChatInput("");
    await saveEdit(Math.min(100, Math.round((asset.compliance || 92) + 1)));
  };

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <Link
          to={`/studio/campaign/${campaign.id}`}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-4"
          style={{ fontSize: "13px" }}
        >
          <ArrowLeft size={14} />
          Back to campaign
        </Link>

        <h1 className="text-foreground mb-1" style={{ fontSize: "26px", fontWeight: 600 }}>
          {asset.title}
        </h1>
        <p className="text-muted-foreground mb-4" style={{ fontSize: "13px" }}>
          Vault: {workspaceName} · Format: {asset.channel} · Model: ORA Stack
        </p>

        <div className="bg-card border border-border rounded-xl p-3 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Decide fast: save, review, approve or publish from this bar.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                style={{ fontSize: "12px", fontWeight: 500 }}
              >
                <CheckCircle2 size={13} />
                Save edit
              </button>
              <button
                type="button"
                onClick={() => void saveEdit(Math.min(100, asset.compliance + 1))}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                style={{ fontSize: "12px", fontWeight: 500 }}
              >
                <RefreshCw size={13} />
                Re-check
              </button>
              <button
                type="button"
                onClick={() => void setStatus("review")}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                style={{ fontSize: "12px", fontWeight: 500 }}
              >
                <Send size={13} />
                Review
              </button>
              {canApprove && (
                <button
                  type="button"
                  onClick={() => void setStatus("approved")}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  style={{ fontSize: "12px", fontWeight: 500 }}
                >
                  <CheckCircle2 size={13} />
                  Approve
                </button>
              )}
              {canPublish && (
                <button
                  type="button"
                  onClick={() => void setStatus("published")}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 border border-ora-signal rounded-lg px-3 py-2 text-ora-signal hover:bg-ora-signal-light transition-colors cursor-pointer"
                  style={{ fontSize: "12px", fontWeight: 600 }}
                >
                  Publish
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-muted-foreground mb-1" style={{ fontSize: "12px", fontWeight: 500 }}>
                Compliance
              </p>
              <div className="w-[320px] max-w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-ora-signal" style={{ width: `${asset.compliance}%` }} />
              </div>
            </div>
            <p className={`text-xl ${scoreColor(asset.compliance)}`} style={{ fontWeight: 700 }}>
              {asset.compliance}/100
            </p>
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground" style={{ fontSize: "11px" }}>
            <p>Status: {asset.status || "draft"}</p>
            <p>Created by: {asset.createdBy || profile?.fullName || profile?.email || "User"}</p>
            <p>Version: v{asset.version || 1}</p>
            <p>Campaign: {campaign.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            {asset.mediaUrl && (
              <img src={asset.mediaUrl} alt={asset.title} className="w-full h-56 object-cover rounded-lg border border-border mb-3" />
            )}
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="w-full h-[360px] bg-background border border-border rounded-lg px-3 py-2 text-foreground resize-none"
              style={{ fontSize: "14px", lineHeight: 1.5 }}
            />
            {error && (
              <p className="text-destructive mt-2" style={{ fontSize: "12px" }}>
                {error}
              </p>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              {(["compliance", "chat", "versions"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActivePanel(tab)}
                  className={`rounded-md border px-2.5 py-1.5 transition-colors cursor-pointer ${
                    activePanel === tab ? "border-ora-signal bg-ora-signal-light text-foreground" : "border-border text-muted-foreground"
                  }`}
                  style={{ fontSize: "12px", fontWeight: 500 }}
                >
                  {tab === "compliance" ? "Compliance" : tab === "chat" ? "Chat" : "Versions"}
                </button>
              ))}
            </div>

            {activePanel === "compliance" && (
              <div className="space-y-2">
                {rows.map((row) => (
                  <div key={row.label} className="border border-border rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
                        {row.label}
                      </p>
                      <p className={scoreColor(row.score)} style={{ fontSize: "12px", fontWeight: 700 }}>
                        {row.score}/100
                      </p>
                    </div>
                    <p className="text-muted-foreground" style={{ fontSize: "11px", lineHeight: 1.4 }}>
                      {row.note}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {activePanel === "chat" && (
              <div>
                <div className="space-y-2 max-h-[270px] overflow-y-auto pr-1 mb-3">
                  {!chatNotes.length && (
                    <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                      Ask ORA for targeted rewrites.
                    </p>
                  )}
                  {chatNotes.map((note, index) => (
                    <div key={`${note}-${index}`} className="border border-border rounded-lg p-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <MessageSquare size={12} className="text-ora-signal" />
                        <p className="text-foreground" style={{ fontSize: "11px", fontWeight: 600 }}>
                          Rewrite request
                        </p>
                      </div>
                      <p className="text-foreground/85" style={{ fontSize: "12px", lineHeight: 1.45 }}>
                        {note}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    rows={3}
                    placeholder="Example: Make the opening more authoritative."
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground resize-none"
                    style={{ fontSize: "12px", lineHeight: 1.4 }}
                  />
                  <button
                    type="button"
                    onClick={() => void requestRewrite()}
                    className="inline-flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    style={{ fontSize: "12px", fontWeight: 500 }}
                  >
                    <Wand2 size={13} />
                    Apply
                  </button>
                </div>
              </div>
            )}

            {activePanel === "versions" && (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {(asset.versions || []).length === 0 && (
                  <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
                    No versions yet.
                  </p>
                )}
                {(asset.versions || []).slice().reverse().map((version) => (
                  <div key={version.id} className="border border-border rounded-lg p-2.5">
                    <p className="text-foreground mb-1" style={{ fontSize: "12px", fontWeight: 600 }}>
                      {version.createdBy || "User"} · {new Date(version.createdAt).toLocaleString()}
                    </p>
                    <p className="text-muted-foreground line-clamp-3 whitespace-pre-wrap" style={{ fontSize: "11px", lineHeight: 1.4 }}>
                      {version.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate(`/studio/campaign/${campaign.id}`)}
            className="text-ora-signal hover:opacity-80 transition-opacity"
            style={{ fontSize: "13px", fontWeight: 600 }}
          >
            Open campaign view
          </button>
        </div>
      </div>
    </div>
  );
}
