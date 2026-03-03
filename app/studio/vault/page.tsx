"use client";

import { useState, useEffect } from "react";
import {
  Shield, Plus, Trash2, Globe, ChevronRight, Loader2,
  Palette, BookOpen, Users, Video, ImageIcon, Sparkles,
  Building2, Target, Share2, CheckCircle, XCircle, TrendingUp,
} from "lucide-react";
import { clsx } from "clsx";

interface Guidelines {
  brand_name?: string;
  brand_summary?: string;
  industry?: string;
  logo_url?: string;
  hero_image?: string;
  products_services?: string[];
  competitors?: string[];
  social_media?: Record<string, string>;
  editorial?: {
    tone?: string;
    formality?: string;
    language_style?: string;
    vocabulary_approved?: string[];
    vocabulary_forbidden?: string[];
    key_messages?: string[];
    tagline?: string;
  };
  visual?: {
    primary_colors?: string[];
    secondary_colors?: string[];
    style?: string;
    imagery_style?: string;
    typography_style?: string;
    avoid?: string[];
  };
  audience?: {
    primary?: string;
    secondary?: string;
    age_range?: string;
    values?: string[];
    pain_points?: string[];
  };
  content_guidelines?: {
    do?: string[];
    dont?: string[];
    image_formats?: string[];
    video_style?: string;
    posting_frequency?: string;
  };
}

interface BrandVault {
  id: string;
  name: string;
  brand_name?: string;
  website_url?: string;
  guidelines?: Guidelines;
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

const SOCIAL_ICONS: Record<string, string> = {
  instagram: "IG",
  linkedin: "LI",
  twitter: "X",
  facebook: "FB",
  youtube: "YT",
  tiktok: "TK",
};

export default function VaultPage() {
  const [vaults, setVaults] = useState<BrandVault[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedVault, setSelectedVault] = useState<BrandVault | null>(null);
  const [view, setView] = useState<"vaults" | "create_vault" | "vault_detail" | "create_campaign" | "campaign_detail">("vaults");
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);

  const [vaultName, setVaultName] = useState("");
  const [websiteUrls, setWebsiteUrls] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

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
    if (selectedVault?.id === id) { setSelectedVault(null); setView("vaults"); }
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

  const g = selectedVault?.guidelines;

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
            <p className="text-zinc-500 text-sm">Chartes de marque · Stratégie · Campagnes IA</p>
          </div>
        </div>
        {view === "vaults" && (
          <button onClick={() => setView("create_vault")}
            className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
            <Plus size={15} />Nouveau Vault
          </button>
        )}
        {view !== "vaults" && (
          <button onClick={() => setView("vaults")} className="text-zinc-400 hover:text-white text-sm transition-colors">
            ← Retour
          </button>
        )}
      </div>

      {/* ── VAULTS LIST ── */}
      {view === "vaults" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">
              Vaults ({vaults.length})
            </h2>
            {vaults.length === 0 ? (
              <div className="bg-surface border border-dashed border-border/50 rounded-xl p-8 text-center">
                <Shield size={32} className="text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm mb-1">Aucun vault de marque</p>
                <p className="text-zinc-600 text-xs mb-4">Créez votre premier vault en analysant votre site web</p>
                <button onClick={() => setView("create_vault")}
                  className="bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm transition-all">
                  Créer un vault
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vaults.map((vault) => {
                  const logo = vault.guidelines?.logo_url;
                  const colors = vault.guidelines?.visual?.primary_colors ?? [];
                  return (
                    <div key={vault.id}
                      className="bg-surface border border-border/40 rounded-xl p-4 hover:border-primary/30 transition-all group cursor-pointer"
                      onClick={() => { setSelectedVault(vault); setView("vault_detail"); }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {logo ? (
                            <img src={logo} alt="logo" className="w-10 h-10 rounded-lg object-contain bg-white/5 p-1" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                              <Shield size={16} className="text-primary" />
                            </div>
                          )}
                          <div>
                            <h3 className="text-white font-semibold text-sm">{vault.brand_name ?? vault.name}</h3>
                            {vault.guidelines?.industry && (
                              <p className="text-zinc-500 text-xs">{vault.guidelines.industry}</p>
                            )}
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteVault(vault.id); }}
                          className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {colors.length > 0 && (
                        <div className="flex gap-1.5 mb-3">
                          {colors.slice(0, 5).map((c, i) => (
                            <div key={i} className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: c }} title={c} />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-zinc-600 text-xs">{new Date(vault.created_at).toLocaleDateString("fr-FR")}</span>
                        <ChevronRight size={14} className="text-zinc-600 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {campaigns.length > 0 && (
            <div>
              <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">Campagnes récentes</h2>
              <div className="space-y-2">
                {campaigns.slice(0, 5).map((c) => (
                  <div key={c.id}
                    className="flex items-center gap-3 bg-surface border border-border/30 rounded-xl px-4 py-3 hover:border-border transition-all cursor-pointer"
                    onClick={() => { setActiveCampaign(c); setView("campaign_detail"); }}>
                    <Sparkles size={14} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{c.name}</p>
                      <p className="text-zinc-500 text-xs truncate">{c.brief}</p>
                    </div>
                    <span className={clsx("text-xs px-2 py-0.5 rounded-full",
                      c.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-700 text-zinc-400")}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE VAULT ── */}
      {view === "create_vault" && (
        <div className="max-w-xl">
          <h2 className="text-white font-semibold mb-2">Créer un nouveau vault</h2>
          <p className="text-zinc-500 text-sm mb-6">
            L'IA analyse votre site et extrait logo, couleurs, ton, concurrents, audience et plus.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-zinc-400 text-xs mb-2 block">Nom du vault</label>
              <input type="text" value={vaultName} onChange={(e) => setVaultName(e.target.value)}
                placeholder="Ex: Ma Marque, Acme Corp..."
                className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary placeholder-zinc-600 transition-colors" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-2 block">URLs à analyser (une par ligne)</label>
              <textarea value={websiteUrls} onChange={(e) => setWebsiteUrls(e.target.value)}
                placeholder={"https://www.mamarque.com\nhttps://www.mamarque.com/a-propos\nhttps://www.mamarque.com/produits"}
                rows={4}
                className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary placeholder-zinc-600 resize-none transition-colors" />
              <p className="text-zinc-600 text-xs mt-1">
                Ajoutez homepage + page À propos + pages produits pour une analyse complète.
              </p>
            </div>
            {analyzeError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                {analyzeError}
              </div>
            )}
            <button onClick={handleAnalyzeAndCreate}
              disabled={analyzing || !vaultName.trim() || !websiteUrls.trim()}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 disabled:opacity-40 text-white font-medium py-3 rounded-xl text-sm transition-all">
              {analyzing ? (
                <><Loader2 size={15} className="animate-spin" /> Analyse en cours…</>
              ) : (
                <><Globe size={15} /> Analyser et créer le vault</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── VAULT DETAIL ── */}
      {view === "vault_detail" && selectedVault && g && (
        <div>
          {/* Vault header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {g.logo_url ? (
                <img src={g.logo_url} alt="logo" className="w-16 h-16 rounded-xl object-contain bg-white/5 p-2 border border-border/30" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary/15 flex items-center justify-center border border-border/30">
                  <Shield size={24} className="text-primary" />
                </div>
              )}
              <div>
                <h2 className="text-white font-bold text-xl">{selectedVault.brand_name ?? selectedVault.name}</h2>
                {g.industry && <p className="text-primary text-sm">{g.industry}</p>}
                {selectedVault.website_url && (
                  <a href={selectedVault.website_url} target="_blank" rel="noopener noreferrer"
                    className="text-zinc-500 text-xs hover:text-zinc-300 transition-colors">
                    {selectedVault.website_url}
                  </a>
                )}
              </div>
            </div>
            <button onClick={() => setView("create_campaign")}
              className="flex items-center gap-2 bg-primary hover:bg-primary/80 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
              <Plus size={15} />Nouvelle campagne
            </button>
          </div>

          {/* Hero image */}
          {g.hero_image && (
            <div className="mb-4 rounded-xl overflow-hidden border border-border/30 h-40">
              <img src={g.hero_image} alt="hero" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Brand summary */}
          {g.brand_summary && (
            <div className="bg-surface border border-border/40 rounded-xl p-4 mb-4">
              <p className="text-zinc-300 text-sm leading-relaxed italic">"{g.brand_summary}"</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Editorial */}
            {g.editorial && (
              <div className="bg-surface border border-border/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={14} className="text-violet-400" />
                  <h3 className="text-white text-sm font-medium">Charte éditoriale</h3>
                </div>
                <div className="space-y-2 text-sm">
                  {g.editorial.tone && <div><span className="text-zinc-500">Ton :</span> <span className="text-zinc-300">{g.editorial.tone}</span></div>}
                  {g.editorial.formality && <div><span className="text-zinc-500">Formalité :</span> <span className="text-zinc-300">{g.editorial.formality}</span></div>}
                  {g.editorial.language_style && <div><span className="text-zinc-500">Style :</span> <span className="text-zinc-300">{g.editorial.language_style}</span></div>}
                  {g.editorial.tagline && (
                    <div className="bg-primary/10 rounded-lg px-3 py-2 mt-2">
                      <span className="text-primary text-xs font-medium">Tagline</span>
                      <p className="text-white text-sm italic mt-0.5">"{g.editorial.tagline}"</p>
                    </div>
                  )}
                  {g.editorial.key_messages && g.editorial.key_messages.length > 0 && (
                    <div>
                      <span className="text-zinc-500">Messages clés :</span>
                      <ul className="mt-1 space-y-1">
                        {g.editorial.key_messages.map((m, i) => <li key={i} className="text-zinc-300 text-xs">• {m}</li>)}
                      </ul>
                    </div>
                  )}
                  {g.editorial.vocabulary_approved && g.editorial.vocabulary_approved.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-xs">Vocabulaire ✓</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {g.editorial.vocabulary_approved.map((w, i) => (
                          <span key={i} className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full">{w}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {g.editorial.vocabulary_forbidden && g.editorial.vocabulary_forbidden.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-xs">À éviter ✗</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {g.editorial.vocabulary_forbidden.map((w, i) => (
                          <span key={i} className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded-full">{w}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visual */}
            {g.visual && (
              <div className="bg-surface border border-border/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Palette size={14} className="text-emerald-400" />
                  <h3 className="text-white text-sm font-medium">Charte visuelle</h3>
                </div>
                <div className="space-y-2 text-sm">
                  {g.visual.primary_colors && g.visual.primary_colors.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-xs">Couleurs primaires</span>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {g.visual.primary_colors.map((color, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded border border-white/10" style={{ backgroundColor: color }} />
                            <span className="text-zinc-400 text-xs font-mono">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {g.visual.secondary_colors && g.visual.secondary_colors.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-xs">Couleurs secondaires</span>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {g.visual.secondary_colors.map((color, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded border border-white/10" style={{ backgroundColor: color }} />
                            <span className="text-zinc-400 text-xs font-mono">{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {g.visual.style && <div><span className="text-zinc-500">Style :</span> <span className="text-zinc-300">{g.visual.style}</span></div>}
                  {g.visual.imagery_style && <div><span className="text-zinc-500">Images :</span> <span className="text-zinc-300">{g.visual.imagery_style}</span></div>}
                  {g.visual.typography_style && <div><span className="text-zinc-500">Typo :</span> <span className="text-zinc-300">{g.visual.typography_style}</span></div>}
                  {g.visual.avoid && g.visual.avoid.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-xs">À éviter :</span>
                      <ul className="mt-1">{g.visual.avoid.map((a, i) => <li key={i} className="text-zinc-400 text-xs">• {a}</li>)}</ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Audience */}
            {g.audience && (
              <div className="bg-surface border border-border/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-blue-400" />
                  <h3 className="text-white text-sm font-medium">Audience cible</h3>
                </div>
                <div className="space-y-2 text-sm">
                  {g.audience.primary && <div><span className="text-zinc-500">Primaire :</span> <span className="text-zinc-300">{g.audience.primary}</span></div>}
                  {g.audience.secondary && <div><span className="text-zinc-500">Secondaire :</span> <span className="text-zinc-300">{g.audience.secondary}</span></div>}
                  {g.audience.age_range && <div><span className="text-zinc-500">Âge :</span> <span className="text-zinc-300">{g.audience.age_range}</span></div>}
                  {g.audience.values && g.audience.values.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-xs">Valeurs :</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {g.audience.values.map((v, i) => <span key={i} className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded-full">{v}</span>)}
                      </div>
                    </div>
                  )}
                  {g.audience.pain_points && g.audience.pain_points.length > 0 && (
                    <div>
                      <span className="text-zinc-500 text-xs">Points de douleur :</span>
                      <ul className="mt-1">{g.audience.pain_points.map((p, i) => <li key={i} className="text-zinc-400 text-xs">• {p}</li>)}</ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Competitors + Products */}
            <div className="space-y-4">
              {g.competitors && g.competitors.length > 0 && (
                <div className="bg-surface border border-border/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={14} className="text-amber-400" />
                    <h3 className="text-white text-sm font-medium">Concurrents identifiés</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.competitors.map((c, i) => (
                      <span key={i} className="bg-amber-500/10 text-amber-300 text-xs px-3 py-1 rounded-full border border-amber-500/20">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {g.products_services && g.products_services.length > 0 && (
                <div className="bg-surface border border-border/40 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 size={14} className="text-cyan-400" />
                    <h3 className="text-white text-sm font-medium">Produits & Services</h3>
                  </div>
                  <ul className="space-y-1">
                    {g.products_services.map((p, i) => (
                      <li key={i} className="text-zinc-300 text-xs flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-cyan-400 shrink-0" />{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Content guidelines */}
            {g.content_guidelines && (g.content_guidelines.do?.length || g.content_guidelines.dont?.length) && (
              <div className="bg-surface border border-border/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={14} className="text-rose-400" />
                  <h3 className="text-white text-sm font-medium">Bonnes pratiques</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {g.content_guidelines.do && g.content_guidelines.do.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <CheckCircle size={12} className="text-emerald-400" />
                        <span className="text-emerald-400 text-xs font-medium">À faire</span>
                      </div>
                      <ul className="space-y-1">
                        {g.content_guidelines.do.map((d, i) => <li key={i} className="text-zinc-400 text-xs">• {d}</li>)}
                      </ul>
                    </div>
                  )}
                  {g.content_guidelines.dont && g.content_guidelines.dont.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <XCircle size={12} className="text-red-400" />
                        <span className="text-red-400 text-xs font-medium">À éviter</span>
                      </div>
                      <ul className="space-y-1">
                        {g.content_guidelines.dont.map((d, i) => <li key={i} className="text-zinc-400 text-xs">• {d}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
                {g.content_guidelines.video_style && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-1 mb-1"><Video size={12} className="text-rose-400" /><span className="text-zinc-500 text-xs">Style vidéo</span></div>
                    <p className="text-zinc-300 text-xs">{g.content_guidelines.video_style}</p>
                  </div>
                )}
              </div>
            )}

            {/* Social media */}
            {g.social_media && Object.keys(g.social_media).length > 0 && (
              <div className="bg-surface border border-border/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Share2 size={14} className="text-pink-400" />
                  <h3 className="text-white text-sm font-medium">Réseaux sociaux</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(g.social_media).map(([network, url]) => (
                    <a key={network} href={url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs text-zinc-300 hover:text-white transition-all">
                      <span className="text-zinc-500 font-mono text-xs">{SOCIAL_ICONS[network] ?? network.slice(0, 2).toUpperCase()}</span>
                      {network}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE CAMPAIGN ── */}
      {view === "create_campaign" && selectedVault && (
        <div className="max-w-2xl">
          <h2 className="text-white font-semibold mb-2">Nouvelle campagne</h2>
          <p className="text-zinc-500 text-sm mb-6">
            Vault : <span className="text-primary">{selectedVault.brand_name ?? selectedVault.name}</span>
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-zinc-400 text-xs mb-2 block">Nom de la campagne</label>
              <input type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Ex: Lancement Produit Été 2025"
                className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary placeholder-zinc-600 transition-colors" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-2 block">Brief de campagne</label>
              <textarea value={campaignBrief} onChange={(e) => setCampaignBrief(e.target.value)}
                placeholder="Décrivez l'objectif, le message principal, le public visé, le ton souhaité..."
                rows={4}
                className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary placeholder-zinc-600 resize-none transition-colors" />
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-2 block">URL produit (optionnel)</label>
              <input type="url" value={productUrl} onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://www.mamarque.com/produit"
                className="w-full bg-surface border border-border/40 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-primary placeholder-zinc-600 transition-colors" />
              <p className="text-zinc-600 text-xs mt-1">Le contenu de la page sera analysé pour enrichir les assets.</p>
            </div>
            <div>
              <label className="text-zinc-400 text-xs mb-3 block">Assets à générer</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "text", label: "Textes", icon: Sparkles },
                  { id: "image_prompt", label: "Prompts Images", icon: ImageIcon },
                  { id: "video_prompt", label: "Prompts Vidéo", icon: Video },
                ].map(({ id, label, icon: Icon }) => (
                  <button key={id}
                    onClick={() => setAssetTypes((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all",
                      assetTypes.includes(id)
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "border-border/30 text-zinc-400 hover:text-white hover:border-border"
                    )}>
                    <Icon size={14} />{label}
                  </button>
                ))}
              </div>
            </div>
            {genError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">{genError}</div>
            )}
            <button onClick={handleCreateCampaign}
              disabled={generating || !campaignName.trim() || !campaignBrief.trim() || assetTypes.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 disabled:opacity-40 text-white font-medium py-3 rounded-xl text-sm transition-all">
              {generating ? (
                <><Loader2 size={15} className="animate-spin" /> Génération en cours…</>
              ) : (
                <><Sparkles size={15} /> Générer la campagne</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── CAMPAIGN DETAIL ── */}
      {view === "campaign_detail" && activeCampaign && (
        <div>
          <div className="mb-6">
            <h2 className="text-white font-bold text-lg">{activeCampaign.name}</h2>
            <p className="text-zinc-400 text-sm mt-1">{activeCampaign.brief}</p>
          </div>
          <div className="space-y-4">
            {activeCampaign.assets?.map((asset, i) => (
              <div key={i} className="bg-surface border border-border/40 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {asset.type === "text" && <Sparkles size={14} className="text-violet-400" />}
                    {asset.type === "image_prompts" && <ImageIcon size={14} className="text-emerald-400" />}
                    {asset.type === "video_prompts" && <Video size={14} className="text-rose-400" />}
                    <h3 className="text-white text-sm font-medium">
                      {asset.type === "text" ? "Contenus texte" :
                       asset.type === "image_prompts" ? "Prompts Images" : "Prompts Vidéo"}
                    </h3>
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(asset.content)}
                    className="text-xs text-zinc-500 hover:text-white transition-colors px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10">
                    Copier
                  </button>
                </div>
                <div className="bg-surface2 rounded-lg p-4">
                  <pre className="text-zinc-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">{asset.content}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
