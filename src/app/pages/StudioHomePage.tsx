import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { Plus, Building2, Shield, FolderKanban, Bot } from "lucide-react";
import { loadCampaignStoreAsync, type CampaignAsset, type CampaignRecord } from "../lib/campaignStore";
import { useAuth } from "../lib/auth";
import { hasStudioAccess } from "../lib/studioAccess";

type RecentAssetRow = {
  campaignId: string;
  assetId: string;
  assetName: string;
  vaultName: string;
  score: number;
  status: string;
  date: string;
};

function campaignStatusFromAsset(asset: CampaignAsset) {
  if (asset.status === "published") return "Published";
  if (asset.status === "approved") return "Approved";
  if (asset.status === "review") return "In Review";
  if (asset.status === "needs-fix") return "Needs Fix";
  return "Draft";
}

export function StudioHomePage() {
  const { profile } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const workspaceName = (profile?.company || profile?.organizationName || "Default Vault").trim();

  useEffect(() => {
    const load = async () => {
      const store = await loadCampaignStoreAsync();
      setCampaigns(store.campaigns);
    };
    void load();
  }, []);

  const recentAssets = useMemo<RecentAssetRow[]>(() => {
    return campaigns
      .flatMap((campaign) =>
        campaign.assets.map((asset) => ({
          campaignId: campaign.id,
          assetId: asset.id,
          assetName: asset.title,
          vaultName: workspaceName,
          score: asset.compliance,
          status: campaignStatusFromAsset(asset),
          date: new Date(asset.createdAt).toLocaleString(),
        })),
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);
  }, [campaigns, workspaceName]);

  const vaultCards = useMemo(() => {
    const totalAssets = campaigns.reduce((sum, campaign) => sum + campaign.assets.length, 0);
    const updatedAt =
      campaigns[0]?.updatedAt
        ? new Date(campaigns[0].updatedAt).toLocaleDateString()
        : "No activity yet";
    return [{ id: "default-vault", name: workspaceName, assets: totalAssets, updated: updatedAt }];
  }, [campaigns, workspaceName]);

  if (!hasStudioAccess(profile?.subscription)) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-6">
        <div className="w-full max-w-[720px] bg-card border border-border rounded-xl p-6">
          <h1 className="text-foreground mb-2" style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "-0.03em" }}>
            Studio requires the Studio + Brand Vault plan
          </h1>
          <p className="text-muted-foreground mb-5" style={{ fontSize: "14px", lineHeight: 1.6 }}>
            Studio mode gives you Brand Vault enforcement, compliance scoring, approval workflows, campaign management and publish tools.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/pricing"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              style={{ fontSize: "14px", fontWeight: 600 }}
            >
              Upgrade to Studio — €149/month
            </Link>
            <Link
              to="/pricing"
              className="border border-border text-muted-foreground hover:text-foreground hover:bg-secondary px-4 py-2 rounded-lg transition-colors"
              style={{ fontSize: "14px", fontWeight: 500 }}
            >
              Compare plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground mb-1" style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "-0.03em" }}>
              Studio
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
              Brand-aware workspace with compliance, versions and approvals.
            </p>
          </div>
          <Link
            to="/studio/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            style={{ fontSize: "14px", fontWeight: 600 }}
          >
            <Plus size={15} />
            New Asset
          </Link>
        </div>

        <section className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={15} className="text-muted-foreground" />
            <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
              Brand Vaults
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {vaultCards.map((vault, index) => (
              <motion.div
                key={vault.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-border rounded-lg p-4"
              >
                <p className="text-foreground mb-1" style={{ fontSize: "14px", fontWeight: 600 }}>
                  {vault.name}
                </p>
                <p className="text-muted-foreground mb-1" style={{ fontSize: "12px" }}>
                  {vault.assets} assets
                </p>
                <p className="text-ora-signal" style={{ fontSize: "11px", fontWeight: 600 }}>
                  Last update: {vault.updated}
                </p>
              </motion.div>
            ))}
            <Link
              to="/studio/vault"
              className="border border-dashed border-border rounded-lg p-4 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <p style={{ fontSize: "13px", fontWeight: 600 }}>+ New Vault</p>
              <p style={{ fontSize: "11px" }}>Create another brand profile</p>
            </Link>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield size={15} className="text-muted-foreground" />
              <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
                Recent Assets
              </p>
            </div>
            <Link to="/studio/campaigns" className="text-ora-signal hover:opacity-80 transition-opacity" style={{ fontSize: "12px", fontWeight: 600 }}>
              Open campaigns
            </Link>
          </div>

          {!recentAssets.length ? (
            <div className="border border-border rounded-lg p-5">
              <p className="text-foreground mb-1" style={{ fontSize: "15px", fontWeight: 500 }}>
                Your vault is ready. Time to create your first asset.
              </p>
              <p className="text-muted-foreground mb-3" style={{ fontSize: "13px" }}>
                Write a brief, pick your models, and generate a publish-ready asset scored against your brand guidelines.
              </p>
              <Link
                to="/studio/new"
                className="inline-flex items-center gap-2 border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                style={{ fontSize: "13px", fontWeight: 500 }}
              >
                <Plus size={13} />
                New Asset
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>Asset Name</th>
                    <th className="text-left py-2 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>Vault</th>
                    <th className="text-left py-2 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>Score</th>
                    <th className="text-left py-2 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>Status</th>
                    <th className="text-left py-2 text-muted-foreground" style={{ fontSize: "11px", fontWeight: 500 }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAssets.map((item) => (
                    <tr key={item.assetId} className="border-b border-border/60">
                      <td className="py-2.5">
                        <Link
                          to={`/studio/asset/${item.assetId}`}
                          className="text-foreground hover:text-ora-signal transition-colors"
                          style={{ fontSize: "13px", fontWeight: 500 }}
                        >
                          {item.assetName}
                        </Link>
                      </td>
                      <td className="py-2.5 text-muted-foreground" style={{ fontSize: "12px" }}>{item.vaultName}</td>
                      <td className="py-2.5 text-ora-signal" style={{ fontSize: "12px", fontWeight: 600 }}>
                        {item.score}
                      </td>
                      <td className="py-2.5 text-muted-foreground" style={{ fontSize: "12px" }}>{item.status}</td>
                      <td className="py-2.5 text-muted-foreground" style={{ fontSize: "12px" }}>{item.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Link to="/studio/chat" className="bg-card border border-border rounded-lg p-4 hover:border-border-strong transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Bot size={15} className="text-muted-foreground" />
              <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
                Agrégateur IA
              </p>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Lancez des prompts rapides et suivez la consommation chat.
            </p>
          </Link>

          <Link to="/studio/campaigns" className="bg-card border border-border rounded-lg p-4 hover:border-border-strong transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <FolderKanban size={15} className="text-muted-foreground" />
              <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
                Campaigns
              </p>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Organize assets, folders and approvals.
            </p>
          </Link>

          <Link to="/studio/vault" className="bg-card border border-border rounded-lg p-4 hover:border-border-strong transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={15} className="text-muted-foreground" />
              <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
                Brand Vault
              </p>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Inspect tone, vocabulary and visual rules.
            </p>
          </Link>

          <Link to="/studio/analytics" className="bg-card border border-border rounded-lg p-4 hover:border-border-strong transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={15} className="text-muted-foreground" />
              <p className="text-foreground" style={{ fontSize: "14px", fontWeight: 600 }}>
                Compliance
              </p>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Track asset quality and trend evolution.
            </p>
          </Link>
        </section>
      </div>
    </div>
  );
}
