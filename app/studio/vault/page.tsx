"use client";

import { useState, useEffect } from "react";
import {
  Shield, Plus, Trash2, Globe, ChevronRight, Loader2,
  Palette, BookOpen, Users, Video, ImageIcon, Sparkles,
} from "lucide-react";
import { clsx } from "clsx";

interface BrandVault {
  id: string;
  name: string;
  brand_name?: string;
  website_url?: string;
  guidelines?: Record<string, unknown>;
  sources?: string[];
  created_at: string;
  updated_at: string;
}

interface Campaign {
  id: string;
  name: string;
  brief: string;
  status: string;
  assets: Array<{ type: string; content: string }>;
  created_at: string;
  brand_vaults?: { name: string };
}

export default function VaultPage() {
  const [vaults, setVaults] = useState<BrandVault[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedVault, setSelectedVault] = useState<BrandVault | null>(null);
  const [view, setView] = useState<"vaults" | "create_vault" | "vault_detail" | "create_campaign" | "campaign_detail">("vaults");
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);

  // Create vault form
  const [vaultName, setVaultName] = useState("");
  const [websiteUrls, setWebsiteUrls] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  // Create campaign form
  const [campaignName, setCampaignName] = useState("");
  const [campaignBrief, setCampaignBrief] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [assetTypes, setAssetTypes] = useState<string[]>(["text", "image_prompt"]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  useEffect(() => {
    fetchVaults();
    fetchCampaigns();
  }, []);

  const fetchVaults = async () => {
    const res = await fetch("/api/vault");
    if (res.ok) setVaults(await res.json());
  };

  const fetchCampaigns = async () => {
    const res = await fetch("/api/vault/campaign");
    if (res.ok) setCampaigns(await res.json());
  };

  const handleAnalyzeAndCreate = async () => {
    if (!vaultName.trim() || !websiteUrls.trim()) return;
    setAnalyzing(true);
    setAnalyzeError("");

    const urls = websiteUrls.split("\n").map((u) => u.trim()).filter(Boolean);

    // Analyze URLs
    const analyzeRes = await fetch("/api/vault/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });

    if (!analyzeRes.ok) {
      const err = await analyzeRes.json();
      setAnalyzeError(err.error ?? "Erreur d'analyse");
      setAnalyzing(false);
      return;
    }

    const { guidelines } = await analyzeRes.json();

    // Create vault
    const createRes = await fetch("/api/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: vaultName,
        brand_name: guidelines.brand_name ?? vaultName,
        website_url: urls[0],
        guidelines,
        sources: urls,
      }),
    });

    if (createRes.ok) {
      await fetchVaults();
      setVaultName("");
      setWebsiteUrls("");
      setView("vaults");
    } else {
      const err = await createRes.json();
      setAnalyzeError(err.error ?? "Erreur de création");
    }

    setAnalyzing(false);
  };

  const handleDeleteVault = async (id: string) => {
    await fetch("/api/vault", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setVaults((v) => v.filter((vault) => vault.id !== id));
    if (selectedVault?.id === id) {
      setSelectedVault(null);
      setView("vaults");
    }
  };

  const handleCreateCampaign = async () => {
    if (!selectedVault || !campaignName.trim() || !campaignBrief.trim()) return;
    setGenerating(true);
    setGenError("");

    const res = await fetch("/api/vault/campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vault_id: selectedVault.id,
        name: campaignName,
        brief: campaignBrief,
        product_url: productUrl || undefined,
        asset_types: assetTypes,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      setGenError(err.error ?? "Erreur de génération");
      setGenerating(false);
      return;
    }

    const campaign = await res.json();
    setCampaigns((c) => [campaign, ...c]);
    setActiveCampaign(campaign);
    setCampaignName("");
    setCampaignBrief("");
    setProductUrl("");
    setView("campaign_detail");
    setGenerating(false);
  };

  const guidelines = selectedVault?.guidelines as Record<string, unknown> | undefined;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/15">
            <Shield size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Brand Vault</h1>
            <p className="text-zinc-500 text-sm">Gérez vos chartes de marque et générez des campagnes conformes</p>
          </div>
        </div>
        {view === "vaults" && (
          <button
            onClick={() => setView("create_vault")}
            className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
          >
            <Plus size={15} />
            Nouveau Vault
          </button>
        )}
        {view !== "vaults" && (
          <button
            onClick={() => setView("vaults")}
            className="text-zinc-400 hover:text-white text-sm transition-colors"
          >
            ← Retour
          </button>
        )}
      </div>

      {/* VAULTS LIST */}
      {view === "vaults" && (
        <div className="space-y-6">
          {/* Vaults */}
          <div>
            <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">
              Vaults ({vaults.length})
            </h2>
            {vaults.length === 0 ? (
              <div className="bg-surface border border-dashed border-border/50 rounded-xl p-8 text-center">
                <Shield size={32} className="text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm mb-1">Aucun vault de marque</p>
                <p className="text-zinc-600 text-xs mb-4">
                  Créez votre premier vault en analysant votre site web
                </p>
                <button
                  onClick={() => setView("create_vault")}
                  className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm transition-all"
                >
                  Créer un vault
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vaults.map((vault) => (
                  <div
                    key={vault.id}
                    className="bg-surface border border-border/40 rounded-xl p-4 hover:border-primary/30 transition-all group cursor-pointer"
                    onClick={() => { setSelectedVault(vault); setView("vault_detail"); }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Shield size={14} className="text-primary" />
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteVault(vault.id); }}
                        className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <h3 className="text-white font-semibold text-sm">{vault.brand_name ?? vault.name}</h3>
                    {vault.website_url && (
                      <p className="text-zinc-500 text-xs mt-0.5 truncate">{vault.website_url}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-zinc-600 text-xs">
                        {new Date(vault.created_at).toLocaleDateString("fr-FR")}
                      </span>
                      <ChevronRight size={14} className="text-zinc-600 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campaigns */}
          {campaigns.length > 0 && (
            <div>
              <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">
                Campagnes récentes
              </h2>
              <div className="space-y-2">
                {campaigns.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 bg-surface border border-border/30 rounded-xl px-4 py-3 hover:border-border transition-all cursor-pointer"
                    onClick={() => { setActiveCampaign(c); setView("campaign_detail"); }}
                  >
                    <Sparkles size={14} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{c.name}</p>
                      <p className="text-zinc-500 text-xs truncate">{c.brief}</p>
                    </div>
                    <span className={clsx(
                      "text-xs px-2 py-0.5 rounded-full",
                      c.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-700 text-zinc-400"
                    )}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE VAULT */}
      {view === "create_vault" && (
        <div className="max-w-xl">
          <h2 className="text-white font-semibold mb-6">Créer un nouveau vault</h2>

          <div className="space-y-4">
            <div>
              <label className="text-zinc-400 text-xs mb-2 block">Nom du vault</label>
              <input
                type="text"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                placeholder="Ex: Ma Marque, Acme Corp..."
                className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary placeholder-zinc-600 transition-colors"
              />
            </div>

            <div>
              <label className="text-zinc-400 text-xs mb-2 block">
                URLs à analyser (une par ligne)
              </label>
              <textarea
                value={websiteUrls}
                onChange={(e) => setWebsiteUrls(e.target.value)}
                placeholder={"https://www.mamarque.com\nhttps://www.mamarque.com/a-propos\nhttps://www.mamarque.com/produits"}
                rows={4}
                className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary placeholder-zinc-600 resize-none transition-colors"
              />
              <p className="text-zinc-600 text-xs mt-1">
                Ajoutez votre site, page À propos, pages produits… L'IA analysera la charte graphique et éditoriale.
              </p>
            </div>

            {analyzeError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                {analyzeError}
              </div>
            )}

            <button
              onClick={handleAnalyzeAndCreate}
              disabled={analyzing || !vaultName.trim() || !websiteUrls.trim()}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 disabled:opacity-40 text-white font-medium py-3 rounded-xl text-sm transition-all"
            >
              {analyzing ? (
                <><Loader2 size={15} className="animate-spin" /> Analyse en cours...</>
              ) : (
                <><Globe size={15} /> Analyser et créer le vault</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* VAULT DETAIL */}
      {view === "vault_detail" && selectedVault && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-bold text-lg">{selectedVault.brand_name ?? selectedVault.name}</h2>
              {selectedVault.website_url && (
                <a href={selectedVault.website_url} target="_blank" rel="noopener noreferrer"
                  className="text-zinc-500 text-sm hover:text-primary transition-colors">
                  {selectedVault.website_url}
                </a>
              )}
            </div>
            <button
              onClick={() => { setView("create_campaign"); }}
              className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              <Plus size={15} />
              Nouvelle campagne
            </button>
          </div>

          {guidelines && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Editorial */}
              {(guidelines.editorial as Record<string, unknown>) && (
                <div className="bg-surface border border-border/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen size={14} className="text-violet-400" />
                    <h3 className="text-white text-sm font-medium">Charte éditoriale</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    {(guidelines.editorial as Record<string, unknown>).tone && (
                      <div><span className="text-zinc-500">Ton :</span> <span className="text-zinc-300">{String((guidelines.editorial as Record<string, unknown>).tone)}</span></div>
                    )}
                    {(guidelines.editorial as Record<string, unknown>).formality && (
                      <div><span className="text-zinc-500">Formalité :</span> <span className="text-zinc-300">{String((guidelines.editorial as Record<string, unknown>).formality)}</span></div>
                    )}
                    {(guidelines.editorial as Record<string, unknown>).tagline && (
                      <div><span className="text-zinc-500">Tagline :</span> <span className="text-zinc-300 italic">"{String((guidelines.editorial as Record<string, unknown>).tagline)}"</span></div>
                    )}
                    {Array.isArray((guidelines.editorial as Record<string, unknown>).key_messages) && (
                      <div>
                        <span className="text-zinc-500">Messages clés :</span>
                        <ul className="mt-1 space-y-1">
                          {((guidelines.editorial as Record<string, unknown>).key_messages as string[]).map((m, i) => (
                            <li key={i} className="text-zinc-300 text-xs">• {m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {Array.isArray((guidelines.editorial as Record<string, unknown>).vocabulary_approved) && ((guidelines.editorial as Record<string, unknown>).vocabulary_approved as string[]).length > 0 && (
                      <div>
                        <span className="text-zinc-500">Vocabulaire approuvé :</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {((guidelines.editorial as Record<string, unknown>).vocabulary_approved as string[]).map((w, i) => (
                            <span key={i} className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full">{w}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {Array.isArray((guidelines.editorial as Record<string, unknown>).vocabulary_forbidden) && ((guidelines.editorial as Record<string, unknown>).vocabulary_forbidden as string[]).length > 0 && (
                      <div>
                        <span className="text-zinc-500">À éviter :</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {((guidelines.editorial as Record<string, unknown>).vocabulary_forbidden as string[]).map((w, i) => (
                            <span key={i} className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded-full">{w}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Visual */}
              {(guidelines.visual as Record<string, unknown>) && (
                <div className="bg-surface border border-border/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Palette size={14} className="text-emerald-400" />
                    <h3 className="text-white text-sm font-medium">Charte visuelle</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    {Array.isArray((guidelines.visual as Record<string, unknown>).primary_colors) && (
                      <div>
                        <span className="text-zinc-500">Couleurs primaires :</span>
                        <div className="flex gap-2 mt-1">
                          {((guidelines.visual as Record<string, unknown>).primary_colors as string[]).map((color, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded border border-white/10" style={{ backgroundColor: color }} />
                              <span className="text-zinc-400 text-xs">{color}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(guidelines.visual as Record<string, unknown>).style && (
                      <div><span className="text-zinc-500">Style :</span> <span className="text-zinc-300">{String((guidelines.visual as Record<string, unknown>).style)}</span></div>
                    )}
                    {(guidelines.visual as Record<string, unknown>).imagery_style && (
                      <div><span className="text-zinc-500">Images :</span> <span className="text-zinc-300">{String((guidelines.visual as Record<string, unknown>).imagery_style)}</span></div>
                    )}
                    {(guidelines.visual as Record<string, unknown>).video_style && (
                      <div><span className="text-zinc-500">Vidéo :</span> <span className="text-zinc-300">{String((guidelines.visual as Record<string, unknown>).video_style)}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Audience */}
              {(guidelines.audience as Record<string, unknown>) && (
                <div className="bg-surface border border-border/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={14} className="text-blue-400" />
                    <h3 className="text-white text-sm font-medium">Audience cible</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    {(guidelines.audience as Record<string, unknown>).primary && (
                      <div><span className="text-zinc-500">Primaire :</span> <span className="text-zinc-300">{String((guidelines.audience as Record<string, unknown>).primary)}</span></div>
                    )}
                    {(guidelines.audience as Record<string, unknown>).age_range && (
                      <div><span className="text-zinc-500">Âge :</span> <span className="text-zinc-300">{String((guidelines.audience as Record<string, unknown>).age_range)}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Summary */}
              {(guidelines as Record<string, unknown>).brand_summary && (
                <div className="bg-surface border border-border/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={14} className="text-primary" />
                    <h3 className="text-white text-sm font-medium">Résumé de marque</h3>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed">{String((guidelines as Record<string, unknown>).brand_summary)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CREATE CAMPAIGN */}
      {view === "create_campaign" && selectedVault && (
        <div className="max-w-2xl">
          <h2 className="text-white font-semibold mb-2">Nouvelle campagne</h2>
          <p className="text-zinc-500 text-sm mb-6">
            Vault : <span className="text-primary">{selectedVault.brand_name ?? selectedVault.name}</span>
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-zinc-400 text-xs mb-2 block">Nom de la campagne</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Ex: Lancement Produit Été 2025"
                className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary placeholder-zinc-600 transition-colors"
              />
            </div>

            <div>
              <label className="text-zinc-400 text-xs mb-2 block">Brief de campagne</label>
              <textarea
                value={campaignBrief}
                onChange={(e) => setCampaignBrief(e.target.value)}
                placeholder="Décrivez l'objectif, le message principal, le public visé, le ton souhaité..."
                rows={4}
                className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary placeholder-zinc-600 resize-none transition-colors"
              />
            </div>

            <div>
              <label className="text-zinc-400 text-xs mb-2 block">URL produit (optionnel)</label>
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://www.mamarque.com/produit"
                className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary placeholder-zinc-600 transition-colors"
              />
              <p className="text-zinc-600 text-xs mt-1">
                Le contenu de la page sera analysé pour enrichir les assets générés.
              </p>
            </div>

            <div>
              <label className="text-zinc-400 text-xs mb-3 block">Assets à générer</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "text", label: "Textes", icon: Sparkles },
                  { id: "image_prompt", label: "Prompts Images", icon: ImageIcon },
                  { id: "video_prompt", label: "Prompts Vidéo", icon: Video },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setAssetTypes((prev) =>
                      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
                    )}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all",
                      assetTypes.includes(id)
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "border-border/30 text-zinc-400 hover:text-white hover:border-border"
                    )}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {genError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                {genError}
              </div>
            )}

            <button
              onClick={handleCreateCampaign}
              disabled={generating || !campaignName.trim() || !campaignBrief.trim() || assetTypes.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 disabled:opacity-40 text-white font-medium py-3 rounded-xl text-sm transition-all"
            >
              {generating ? (
                <><Loader2 size={15} className="animate-spin" /> Génération en cours...</>
              ) : (
                <><Sparkles size={15} /> Générer la campagne</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* CAMPAIGN DETAIL */}
      {view === "campaign_detail" && activeCampaign && (
        <div>
          <div className="mb-6">
            <h2 className="text-white font-bold text-lg">{activeCampaign.name}</h2>
            <p className="text-zinc-400 text-sm mt-1">{activeCampaign.brief}</p>
          </div>

          <div className="space-y-4">
            {activeCampaign.assets?.map((asset, i) => (
              <div key={i} className="bg-surface border border-border/40 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  {asset.type === "text" && <Sparkles size={14} className="text-violet-400" />}
                  {asset.type === "image_prompts" && <ImageIcon size={14} className="text-emerald-400" />}
                  {asset.type === "video_prompts" && <Video size={14} className="text-rose-400" />}
                  <h3 className="text-white text-sm font-medium capitalize">
                    {asset.type === "text" ? "Contenus texte" :
                     asset.type === "image_prompts" ? "Prompts Images (copiez dans Génération Image)" :
                     "Prompts Vidéo (copiez dans Génération Vidéo)"}
                  </h3>
                </div>
                <div className="bg-surface2 rounded-lg p-4">
                  <pre className="text-zinc-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                    {asset.content}
                  </pre>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(asset.content)}
                  className="mt-2 text-xs text-zinc-500 hover:text-white transition-colors"
                >
                  Copier le contenu
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
