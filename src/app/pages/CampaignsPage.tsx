import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import { ArrowLeft, Plus, Search, Filter, FileText, Zap, Download, Trash2, FolderPlus } from "lucide-react";
import {
  assignAssetToFolder,
  createFolder,
  loadCampaignStoreAsync,
  removeCampaignRecord,
  renameFolder,
  saveCampaignStoreAsync,
  setCampaignStatus,
  type CampaignStatus,
  type CampaignStore,
} from "../lib/campaignStore";

const statusColors: Record<CampaignStatus, string> = {
  Live: "bg-green-500",
  Review: "bg-yellow-500",
  Approved: "bg-ora-signal",
  Draft: "bg-muted-foreground/50",
};

function safeFileName(value: string) {
  const base = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base || "campaign";
}

export function CampaignsPage() {
  const [store, setStore] = useState<CampaignStore>({ campaigns: [], folders: [] });
  const [search, setSearch] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderDrafts, setFolderDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const refreshStore = async () => {
      setStore(await loadCampaignStoreAsync());
    };
    void refreshStore();
    const handleStorage = () => {
      void refreshStore();
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    setFolderDrafts(Object.fromEntries(store.folders.map((folder) => [folder.id, folder.name])));
  }, [store.folders]);

  useEffect(() => {
    if (!store.campaigns.length) {
      setSelectedCampaignId(null);
      return;
    }
    const stillExists = selectedCampaignId && store.campaigns.some((campaign) => campaign.id === selectedCampaignId);
    if (!stillExists) {
      setSelectedCampaignId(store.campaigns[0].id);
    }
  }, [store.campaigns, selectedCampaignId]);

  const persistStore = async (next: CampaignStore) => {
    const saved = await saveCampaignStoreAsync(next);
    setStore(saved);
  };

  const filteredCampaigns = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return store.campaigns;
    return store.campaigns.filter((campaign) =>
      [campaign.name, campaign.brief, campaign.status, campaign.formats.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, store.campaigns]);

  const selectedCampaign = useMemo(
    () => store.campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [selectedCampaignId, store.campaigns],
  );

  const assetFolderByKey = useMemo(() => {
    const folderMap = new Map<string, string>();
    store.folders.forEach((folder) => {
      folder.assets.forEach((assetRef) => {
        folderMap.set(`${assetRef.campaignId}:${assetRef.assetId}`, folder.id);
      });
    });
    return folderMap;
  }, [store.folders]);

  const totalPieces = useMemo(
    () => store.campaigns.reduce((sum, campaign) => sum + campaign.pieces, 0),
    [store.campaigns],
  );

  const handlePublish = (campaignId: string) => {
    void persistStore(setCampaignStatus(store, campaignId, "Live"));
  };

  const handleDelete = (campaignId: string) => {
    void persistStore(removeCampaignRecord(store, campaignId));
  };

  const handleExport = (campaignId: string) => {
    const campaign = store.campaigns.find((entry) => entry.id === campaignId);
    if (!campaign) return;
    const payload = {
      ...campaign,
      exportedAt: new Date().toISOString(),
      exportedFrom: "Campaigns",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFileName(campaign.name)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    void persistStore(createFolder(store, newFolderName));
    setNewFolderName("");
  };

  const commitFolderRename = (folderId: string) => {
    const nextName = folderDrafts[folderId]?.trim();
    const fallbackName = store.folders.find((folder) => folder.id === folderId)?.name ?? "";
    if (!nextName) {
      setFolderDrafts((prev) => ({ ...prev, [folderId]: fallbackName }));
      return;
    }
    if (nextName === fallbackName) return;
    void persistStore(renameFolder(store, folderId, nextName));
  };

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="border-b border-border bg-card">
        <div className="max-w-[1200px] mx-auto px-6 py-5">
          <Link
            to="/studio"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-4"
            style={{ fontSize: "13px" }}
          >
            <ArrowLeft size={14} />
            Back to Studio
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-foreground mb-1"
                style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "-0.03em" }}
              >
                Campaigns
              </h1>
              <p className="text-muted-foreground" style={{ fontSize: "15px" }}>
                {store.campaigns.length} campaigns · {totalPieces} content pieces
              </p>
            </div>
            <Link
              to="/studio"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              style={{ fontSize: "14px", fontWeight: 500 }}
            >
              <Plus size={15} />
              New Campaign
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search campaigns..."
              className="w-full bg-card border border-border rounded-lg pl-9 pr-4 py-2.5 text-foreground placeholder:text-muted-foreground/50"
              style={{ fontSize: "14px" }}
            />
          </div>
          <button className="flex items-center gap-2 border border-border px-4 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
            <Filter size={14} />
            <span style={{ fontSize: "13px" }}>Filter</span>
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4">
          <div className="space-y-3">
            {!filteredCampaigns.length && (
              <div className="bg-card border border-border rounded-xl p-6">
                <p className="text-foreground mb-1" style={{ fontSize: "16px", fontWeight: 500 }}>
                  No saved campaigns yet
                </p>
                <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
                  Save assets in Creation Center to list them here.
                </p>
              </div>
            )}

            {filteredCampaigns.map((campaign, i) => {
              const isSelected = campaign.id === selectedCampaignId;
              return (
                <motion.button
                  type="button"
                  key={campaign.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedCampaignId(campaign.id)}
                  className={`w-full text-left bg-card border rounded-xl p-5 transition-colors cursor-pointer ${
                    isSelected ? "border-ora-signal" : "border-border hover:border-border-strong"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3 className="text-foreground" style={{ fontSize: "16px", fontWeight: 500 }}>
                          {campaign.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded text-white ${statusColors[campaign.status]}`}
                          style={{ fontSize: "10px", fontWeight: 600 }}
                        >
                          {campaign.status}
                        </span>
                        <span className="text-ora-signal" style={{ fontSize: "14px", fontWeight: 600 }}>
                          {campaign.score}/100
                        </span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2" style={{ fontSize: "14px" }}>
                        {campaign.brief}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {campaign.formats.map((format) => (
                        <span
                          key={`${campaign.id}-${format}`}
                          className="px-2 py-1 rounded-md bg-secondary text-muted-foreground"
                          style={{ fontSize: "11px", fontWeight: 450 }}
                        >
                          {format}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "12px" }}>
                        <FileText size={12} />
                        {campaign.pieces} pieces
                      </span>
                      <span className="text-muted-foreground" style={{ fontSize: "12px" }}>
                        {campaign.date}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 h-fit sticky top-[84px]">
            {!selectedCampaign ? (
              <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
                Select a campaign to review, publish, export, or delete.
              </p>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-foreground" style={{ fontSize: "17px", fontWeight: 600 }}>
                      {selectedCampaign.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-white ${statusColors[selectedCampaign.status]}`}
                      style={{ fontSize: "10px", fontWeight: 600 }}
                    >
                      {selectedCampaign.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                    {selectedCampaign.brief}
                  </p>
                  <Link
                    to={`/studio/campaign/${selectedCampaign.id}`}
                    className="inline-flex mt-2 text-ora-signal hover:opacity-80 transition-opacity"
                    style={{ fontSize: "12px", fontWeight: 600 }}
                  >
                    Open campaign view →
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePublish(selectedCampaign.id)}
                    className="flex items-center justify-center gap-1.5 border border-border px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <Zap size={13} />
                    <span style={{ fontSize: "12px", fontWeight: 500 }}>Publish</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport(selectedCampaign.id)}
                    className="flex items-center justify-center gap-1.5 border border-border px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <Download size={13} />
                    <span style={{ fontSize: "12px", fontWeight: 500 }}>Export</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedCampaign.id)}
                    className="flex items-center justify-center gap-1.5 border border-border px-2.5 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span style={{ fontSize: "12px", fontWeight: 500 }}>Delete</span>
                  </button>
                </div>

                <div>
                  <p className="text-foreground mb-2" style={{ fontSize: "13px", fontWeight: 600 }}>
                    Assets ({selectedCampaign.assets.length})
                  </p>
                  <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
                    {selectedCampaign.assets.map((asset) => {
                      const key = `${selectedCampaign.id}:${asset.id}`;
                      const selectedFolder = assetFolderByKey.get(key) ?? "";
                      return (
                        <div key={asset.id} className="border border-border rounded-lg p-2.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-foreground" style={{ fontSize: "12px", fontWeight: 600 }}>
                              {asset.title}
                            </span>
                            <span className="text-ora-signal" style={{ fontSize: "11px", fontWeight: 600 }}>
                              {asset.compliance}/100
                            </span>
                          </div>
                          <p className="text-muted-foreground mb-2" style={{ fontSize: "11px" }}>
                            {asset.channel}
                          </p>
                          <p className="text-foreground/80 line-clamp-2 mb-2" style={{ fontSize: "11px", lineHeight: 1.45 }}>
                            {asset.body}
                          </p>
                          <select
                            value={selectedFolder}
                            onChange={(event) =>
                              void persistStore(
                                assignAssetToFolder(store, {
                                  campaignId: selectedCampaign.id,
                                  assetId: asset.id,
                                  folderId: event.target.value,
                                }),
                              )
                            }
                            className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-foreground"
                            style={{ fontSize: "11px" }}
                          >
                            <option value="">No folder</option>
                            {store.folders.map((folder) => (
                              <option key={folder.id} value={folder.id}>
                                {folder.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-foreground mb-2" style={{ fontSize: "13px", fontWeight: 600 }}>
                    Folders
                  </p>
                  <div className="flex items-center gap-2 mb-2.5">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(event) => setNewFolderName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleCreateFolder();
                        }
                      }}
                      placeholder="Folder name"
                      className="flex-1 bg-background border border-border rounded-md px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/50"
                      style={{ fontSize: "12px" }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateFolder}
                      className="flex items-center gap-1.5 border border-border px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <FolderPlus size={12} />
                      <span style={{ fontSize: "11px", fontWeight: 500 }}>Add</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {!store.folders.length && (
                      <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                        Create a folder to organize assets.
                      </p>
                    )}
                    {store.folders.map((folder) => {
                      const usage = folder.assets.filter((assetRef) => assetRef.campaignId === selectedCampaign.id).length;
                      return (
                        <div key={folder.id} className="border border-border rounded-md p-2">
                          <input
                            type="text"
                            value={folderDrafts[folder.id] ?? ""}
                            onChange={(event) => setFolderDrafts((prev) => ({ ...prev, [folder.id]: event.target.value }))}
                            onBlur={() => commitFolderRename(folder.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                commitFolderRename(folder.id);
                              }
                            }}
                            className="w-full bg-background border border-border rounded px-2 py-1 text-foreground"
                            style={{ fontSize: "11px" }}
                          />
                          <p className="text-muted-foreground mt-1" style={{ fontSize: "10px" }}>
                            {usage} asset{usage > 1 ? "s" : ""} from this campaign
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
