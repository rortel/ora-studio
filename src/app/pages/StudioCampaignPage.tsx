import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Plus, Send } from "lucide-react";
import { loadCampaignStoreAsync, saveCampaignStoreAsync, updateStudioAssetStatus, type CampaignRecord } from "../lib/campaignStore";
import { useAuth } from "../lib/auth";

function humanStatus(value?: string) {
  if (value === "published") return "Published";
  if (value === "approved") return "Approved";
  if (value === "review") return "In Review";
  if (value === "needs-fix") return "Needs Fix";
  return "Draft";
}

export function StudioCampaignPage() {
  const navigate = useNavigate();
  const { campaignId = "" } = useParams();
  const { profile } = useAuth();
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const workspaceName = (profile?.company || profile?.organizationName || "Default Vault").trim();

  useEffect(() => {
    const load = async () => {
      const store = await loadCampaignStoreAsync();
      const found = store.campaigns.find((entry) => entry.id === campaignId) ?? null;
      setCampaign(found);
    };
    void load();
  }, [campaignId]);

  const summary = useMemo(() => {
    if (!campaign) return { ready: 0, review: 0, draft: 0, avg: 0 };
    const ready = campaign.assets.filter((asset) => asset.status === "approved" || asset.status === "published").length;
    const review = campaign.assets.filter((asset) => asset.status === "review").length;
    const draft = campaign.assets.filter((asset) => !asset.status || asset.status === "draft" || asset.status === "needs-fix").length;
    const avg = campaign.assets.length
      ? Math.round(campaign.assets.reduce((sum, asset) => sum + asset.compliance, 0) / campaign.assets.length)
      : campaign.score;
    return { ready, review, draft, avg };
  }, [campaign]);

  const publishApproved = async () => {
    if (!campaign) return;
    let current = await loadCampaignStoreAsync();
    for (const asset of campaign.assets) {
      if (asset.status === "approved") {
        current = updateStudioAssetStatus(current, { assetId: asset.id, status: "published" });
      }
    }
    const saved = await saveCampaignStoreAsync(current);
    const found = saved.campaigns.find((entry) => entry.id === campaign.id) ?? null;
    setCampaign(found);
  };

  if (!campaign) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground mb-1" style={{ fontSize: "16px", fontWeight: 500 }}>
            Campaign not found
          </p>
          <Link to="/studio/campaigns" className="text-ora-signal" style={{ fontSize: "13px", fontWeight: 600 }}>
            Back to campaigns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <Link
          to="/studio/campaigns"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-4"
          style={{ fontSize: "13px" }}
        >
          <ArrowLeft size={14} />
          Back to campaigns
        </Link>

        <h1 className="text-foreground mb-1" style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "-0.03em" }}>
          Campaign: {campaign.name}
        </h1>
        <p className="text-muted-foreground mb-4" style={{ fontSize: "13px" }}>
          Vault: {workspaceName} · {campaign.assets.length} assets · Created: {campaign.date}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>Campaign compliance</p>
            <p className="text-foreground" style={{ fontSize: "20px", fontWeight: 700 }}>{summary.avg}/100</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>Ready</p>
            <p className="text-foreground" style={{ fontSize: "20px", fontWeight: 700 }}>{summary.ready}/{campaign.assets.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-muted-foreground mb-1" style={{ fontSize: "11px" }}>In review / Draft</p>
            <p className="text-foreground" style={{ fontSize: "20px", fontWeight: 700 }}>{summary.review}/{summary.draft}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {campaign.assets.map((asset) => (
            <div key={asset.id} className="bg-card border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
                  {asset.title}
                </p>
                <p className="text-ora-signal" style={{ fontSize: "12px", fontWeight: 600 }}>
                  {asset.compliance}
                </p>
              </div>
              {asset.mediaUrl && (
                <img src={asset.mediaUrl} alt={asset.title} className="w-full h-28 object-cover rounded-md border border-border mb-2" />
              )}
              <p className="text-muted-foreground mb-2" style={{ fontSize: "12px" }}>
                {asset.channel} · {humanStatus(asset.status)}
              </p>
              <p className="text-foreground/85 line-clamp-3 whitespace-pre-wrap" style={{ fontSize: "12px", lineHeight: 1.4 }}>
                {asset.body}
              </p>
              <Link
                to={`/studio/asset/${asset.id}`}
                className="mt-3 inline-flex items-center gap-1.5 border border-border rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                style={{ fontSize: "12px", fontWeight: 500 }}
              >
                Open asset
              </Link>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void publishApproved()}
            className="inline-flex items-center gap-2 border border-ora-signal rounded-lg px-3 py-2 text-ora-signal hover:bg-ora-signal-light transition-colors cursor-pointer"
            style={{ fontSize: "13px", fontWeight: 600 }}
          >
            <Send size={14} />
            Publish all approved
          </button>
          <button
            type="button"
            onClick={() => navigate(`/studio/new?campaignId=${campaign.id}&campaignName=${encodeURIComponent(campaign.name)}`)}
            className="inline-flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            style={{ fontSize: "13px", fontWeight: 500 }}
          >
            <Plus size={14} />
            Add asset to campaign
          </button>
        </div>
      </div>
    </div>
  );
}
