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
    <div className="p-8 max-w-5xl mx-auto" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: "var(--ora-signal-light)" }}>
            <Shield size={20} style={{ color: "var(--ora-signal)" }} />
          </div>
          <div>
            <h1 style={{ fontSize: "18px", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
              Brand Vault
            </h1>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
              Chartes de marque · Stratégie · Campagnes IA
            </p>
          </div>
        </div>
        {view === "vaults" && (
          <button
            onClick={() => setView("create_vault")}
            className="flex items-center gap-2 rounded-lg px-4 py-2 transition-all"
            style={{ background: "var(--ora-signal)", color: "#ffffff", fontSize: "13px", fontWeight: 500 }}>
            <Plus size={15} />Nouveau Vault
          </button>
        )}
        {view !== "vaults" && (
          <button
            onClick={() => setView("vaults")}
            className="transition-colors"
            style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
            ← Retour
          </button>
        )}
      </div>

      {/* ── VAULTS LIST ── */}
      {view === "vaults" && (
        <div className="space-y-6">
          <div>
            <h2 style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "12px" }}>
              Vaults ({vaults.length})
            </h2>
            {vaults.length === 0 ? (
              <div
                className="rounded-xl p-8 text-center"
                style={{ border: "1px dashed var(--border)", background: "var(--card)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <Shield size={32} className="mx-auto mb-3" style={{ color: "var(--muted-foreground)", opacity: 0.4 }} />
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "4px" }}>Aucun vault de marque</p>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", opacity: 0.6, marginBottom: "16px" }}>
                  Créez votre premier vault en analysant votre site web
                </p>
                <button
                  onClick={() => setView("create_vault")}
                  className="rounded-lg px-4 py-2 transition-all"
                  style={{ background: "var(--ora-signal)", color: "#ffffff", fontSize: "13px", fontWeight: 500 }}>
                  Créer un vault
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vaults.map((vault) => {
                  const logo = vault.guidelines?.logo_url;
                  const colors = vault.guidelines?.visual?.primary_colors ?? [];
                  return (
                    <div
                      key={vault.id}
                      className="rounded-xl p-4 transition-all group cursor-pointer"
                      style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
                      onClick={() => { setSelectedVault(vault); setView("vault_detail"); }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {logo ? (
                            <img
                              src={logo}
                              alt="logo"
                              className="w-10 h-10 rounded-lg object-contain p-1"
                              style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ background: "var(--ora-signal-light)" }}>
                              <Shield size={16} style={{ color: "var(--ora-signal)" }} />
                            </div>
                          )}
                          <div>
                            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--foreground)" }}>
                              {vault.brand_name ?? vault.name}
                            </h3>
                            {vault.guidelines?.industry && (
                              <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{vault.guidelines.industry}</p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteVault(vault.id); }}
                          className="transition-colors opacity-0 group-hover:opacity-100"
                          style={{ color: "var(--muted-foreground)" }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {colors.length > 0 && (
                        <div className="flex gap-1.5 mb-3">
                          {colors.slice(0, 5).map((c, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: c, border: "1px solid var(--border)" }}
                              title={c}
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                          {new Date(vault.created_at).toLocaleDateString("fr-FR")}
                        </span>
                        <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {campaigns.length > 0 && (
            <div>
              <h2 style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "12px" }}>
                Campagnes récentes
              </h2>
              <div className="space-y-2">
                {campaigns.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all cursor-pointer"
                    style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}
                    onClick={() => { setActiveCampaign(c); setView("campaign_detail"); }}>
                    <Sparkles size={14} style={{ color: "var(--ora-signal)" }} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate" style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>{c.name}</p>
                      <p className="truncate" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{c.brief}</p>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5"
                      style={
                        c.status === "approved"
                          ? { background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", color: "#16a34a", fontSize: "11px" }
                          : { background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: "11px" }
                      }>
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
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)", marginBottom: "8px" }}>
            Créer un nouveau vault
          </h2>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "24px" }}>
            L'IA analyse votre site et extrait logo, couleurs, ton, concurrents, audience et plus.
          </p>
          <div className="space-y-4">
            <div>
              <label style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                Nom du vault
              </label>
              <input
                type="text"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                placeholder="Ex: Ma Marque, Acme Corp..."
                className="w-full rounded-xl px-4 py-3 focus:outline-none transition-colors"
                style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                URLs à analyser (une par ligne)
              </label>
              <textarea
                value={websiteUrls}
                onChange={(e) => setWebsiteUrls(e.target.value)}
                placeholder={"https://www.mamarque.com\nhttps://www.mamarque.com/a-propos\nhttps://www.mamarque.com/produits"}
                rows={4}
                className="w-full rounded-xl px-4 py-3 focus:outline-none resize-none transition-colors"
                style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "13px" }}
              />
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)", opacity: 0.7, marginTop: "4px" }}>
                Ajoutez homepage + page À propos + pages produits pour une analyse complète.
              </p>
            </div>
            {analyzeError && (
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: "rgba(212,24,61,0.06)", border: "1px solid rgba(212,24,61,0.15)", color: "var(--destructive)", fontSize: "13px" }}>
                {analyzeError}
              </div>
            )}
            <button
              onClick={handleAnalyzeAndCreate}
              disabled={analyzing || !vaultName.trim() || !websiteUrls.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 transition-all disabled:opacity-40"
              style={{ background: "var(--ora-signal)", color: "#ffffff", fontSize: "13px", fontWeight: 500 }}>
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
                <img
                  src={g.logo_url}
                  alt="logo"
                  className="w-16 h-16 rounded-xl object-contain p-2"
                  style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--ora-signal-light)", border: "1px solid var(--border)" }}>
                  <Shield size={24} style={{ color: "var(--ora-signal)" }} />
                </div>
              )}
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
                  {selectedVault.brand_name ?? selectedVault.name}
                </h2>
                {g.industry && (
                  <p style={{ fontSize: "13px", color: "var(--ora-signal)", marginTop: "2px" }}>{g.industry}</p>
                )}
                {selectedVault.website_url && (
                  <a
                    href={selectedVault.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors"
                    style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                    {selectedVault.website_url}
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => setView("create_campaign")}
              className="flex items-center gap-2 rounded-lg px-4 py-2 transition-all"
              style={{ background: "var(--ora-signal)", color: "#ffffff", fontSize: "13px", fontWeight: 500 }}>
              <Plus size={15} />Nouvelle campagne
            </button>
          </div>

          {/* Hero image */}
          {g.hero_image && (
            <div className="mb-4 rounded-xl overflow-hidden h-40" style={{ border: "1px solid var(--border)" }}>
              <img src={g.hero_image} alt="hero" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Brand summary */}
          {g.brand_summary && (
            <div
              className="rounded-xl p-4 mb-4"
              style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
              <p style={{ fontSize: "13px", color: "var(--foreground)", lineHeight: "1.6", fontStyle: "italic" }}>
                "{g.brand_summary}"
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Editorial */}
            {g.editorial && (
              <div
                className="rounded-xl p-4"
                style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={14} style={{ color: "#8b5cf6" }} />
                  <h3 style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>Charte éditoriale</h3>
                </div>
                <div className="space-y-2">
                  {g.editorial.tone && (
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ color: "var(--muted-foreground)" }}>Ton : </span>
                      <span style={{ color: "var(--foreground)" }}>{g.editorial.tone}</span>
                    </div>
                  )}
                  {g.editorial.formality && (
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ color: "var(--muted-foreground)" }}>Formalité : </span>
                      <span style={{ color: "var(--foreground)" }}>{g.editorial.formality}</span>
                    </div>
                  )}
                  {g.editorial.language_style && (
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ color: "var(--muted-foreground)" }}>Style : </span>
                      <span style={{ color: "var(--foreground)" }}>{g.editorial.language_style}</span>
                    </div>
                  )}
                  {g.editorial.tagline && (
                    <div
                      className="rounded-lg px-3 py-2 mt-2"
                      style={{ background: "var(--ora-signal-light)", border: "1px solid var(--ora-signal-ring)" }}>
                      <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--ora-signal)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        Tagline
                      </span>
                      <p style={{ fontSize: "13px", fontStyle: "italic", color: "var(--foreground)", marginTop: "2px" }}>
                        "{g.editorial.tagline}"
                      </p>
                    </div>
                  )}
                  {g.editorial.key_messages && g.editorial.key_messages.length > 0 && (
                    <div>
                      <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Messages clés :</span>
                      <ul className="mt-1 space-y-1">
                        {g.editorial.key_messages.map((m, i) => (
                          <li key={i} style={{ fontSize: "12px", color: "var(--foreground)" }}>• {m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {g.editorial.vocabulary_approved && g.editorial.vocabulary_approved.length > 0 && (
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Vocabulaire ✓</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {g.editorial.vocabulary_approved.map((w, i) => (
                          <span
                            key={i}
                            className="rounded-full px-2 py-0.5"
                            style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", color: "#16a34a", fontSize: "11px" }}>
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {g.editorial.vocabulary_forbidden && g.editorial.vocabulary_forbidden.length > 0 && (
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>À éviter ✗</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {g.editorial.vocabulary_forbidden.map((w, i) => (
                          <span
                            key={i}
                            className="rounded-full px-2 py-0.5"
                            style={{ background: "rgba(212,24,61,0.06)", border: "1px solid rgba(212,24,61,0.15)", color: "var(--destructive)", fontSize: "11px" }}>
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visual */}
            {g.visual && (
              <div
                className="rounded-xl p-4"
                style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Palette size={14} style={{ color: "#10b981" }} />
                  <h3 style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>Charte visuelle</h3>
                </div>
                <div className="space-y-2">
                  {g.visual.primary_colors && g.visual.primary_colors.length > 0 && (
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Couleurs primaires</span>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {g.visual.primary_colors.map((color, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div
                              className="w-6 h-6 rounded"
                              style={{ backgroundColor: color, border: "1px solid var(--border)" }}
                            />
                            <span style={{ fontSize: "11px", color: "var(--muted-foreground)", fontFamily: "monospace" }}>{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {g.visual.secondary_colors && g.visual.secondary_colors.length > 0 && (
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Couleurs secondaires</span>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {g.visual.secondary_colors.map((color, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div
                              className="w-5 h-5 rounded"
                              style={{ backgroundColor: color, border: "1px solid var(--border)" }}
                            />
                            <span style={{ fontSize: "11px", color: "var(--muted-foreground)", fontFamily: "monospace" }}>{color}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {g.visual.style && (
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ color: "var(--muted-foreground)" }}>Style : </span>
                      <span style={{ color: "var(--foreground)" }}>{g.visual.style}</span>
                    </div>
                  )}
                  {g.visual.imagery_style && (
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ color: "var(--muted-foreground)" }}>Images : </span>
                      <span style={{ color: "var(--foreground)" }}>{g.visual.imagery_style}</span>
                    </div>
                  )}
                  {g.visual.typography_style && (
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ color: "var(--muted-foreground)" }}>Typo : </span>
                      <span style={{ color: "var(--foreground)" }}>{g.visual.typography_style}</span>
                    </div>
                  )}
                  {g.visual.avoid && g.visual.avoid.length > 0 && (
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>À éviter :</span>
                      <ul className="mt-1">
                        {g.visual.avoid.map((a, i) => (
                          <li key={i} style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>• {a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Audience */}
            {g.audience && (
              <div
                className="rounded-xl p-4"
                style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} style={{ color: "#3b82f6" }} />
                  <h3 style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>Audience cible</h3>
                </div>
                <div className="space-y-2">
                  {g.audience.primary && (
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ color: "var(--muted-foreground)" }}>Primaire : </span>
                      <span style={{ color: "var(--foreground)" }}>{g.audience.primary}</span>
                    </div>
                  )}
                  {g.audience.secondary && (
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ color: "var(--muted-foreground)" }}>Secondaire : </span>
                      <span style={{ color: "var(--foreground)" }}>{g.audience.secondary}</span>
                    </div>
                  )}
                  {g.audience.age_range && (
                    <div style={{ fontSize: "13px" }}>
                      <span style={{ color: "var(--muted-foreground)" }}>Âge : </span>
                      <span style={{ color: "var(--foreground)" }}>{g.audience.age_range}</span>
                    </div>
                  )}
                  {g.audience.values && g.audience.values.length > 0 && (
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Valeurs :</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {g.audience.values.map((v, i) => (
                          <span
                            key={i}
                            className="rounded-full px-2 py-0.5"
                            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#2563eb", fontSize: "11px" }}>
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {g.audience.pain_points && g.audience.pain_points.length > 0 && (
                    <div>
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Points de douleur :</span>
                      <ul className="mt-1">
                        {g.audience.pain_points.map((p, i) => (
                          <li key={i} style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>• {p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Competitors + Products */}
            <div className="space-y-4">
              {g.competitors && g.competitors.length > 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={14} style={{ color: "#f59e0b" }} />
                    <h3 style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>Concurrents identifiés</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.competitors.map((c, i) => (
                      <span
                        key={i}
                        className="rounded-full px-3 py-1"
                        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#b45309", fontSize: "12px" }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {g.products_services && g.products_services.length > 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 size={14} style={{ color: "#06b6d4" }} />
                    <h3 style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>Produits & Services</h3>
                  </div>
                  <ul className="space-y-1">
                    {g.products_services.map((p, i) => (
                      <li key={i} className="flex items-center gap-2" style={{ fontSize: "12px", color: "var(--foreground)" }}>
                        <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: "#06b6d4" }} />{p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Content guidelines */}
            {g.content_guidelines && (g.content_guidelines.do?.length || g.content_guidelines.dont?.length) && (
              <div
                className="rounded-xl p-4"
                style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Target size={14} style={{ color: "#f43f5e" }} />
                  <h3 style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>Bonnes pratiques</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {g.content_guidelines.do && g.content_guidelines.do.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <CheckCircle size={12} style={{ color: "#16a34a" }} />
                        <span style={{ fontSize: "11px", fontWeight: 500, color: "#16a34a" }}>À faire</span>
                      </div>
                      <ul className="space-y-1">
                        {g.content_guidelines.do.map((d, i) => (
                          <li key={i} style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>• {d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {g.content_guidelines.dont && g.content_guidelines.dont.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <XCircle size={12} style={{ color: "var(--destructive)" }} />
                        <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--destructive)" }}>À éviter</span>
                      </div>
                      <ul className="space-y-1">
                        {g.content_guidelines.dont.map((d, i) => (
                          <li key={i} style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>• {d}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {g.content_guidelines.video_style && (
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-1 mb-1">
                      <Video size={12} style={{ color: "#f43f5e" }} />
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>Style vidéo</span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--foreground)" }}>{g.content_guidelines.video_style}</p>
                  </div>
                )}
              </div>
            )}

            {/* Social media */}
            {g.social_media && Object.keys(g.social_media).length > 0 && (
              <div
                className="rounded-xl p-4"
                style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Share2 size={14} style={{ color: "#ec4899" }} />
                  <h3 style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>Réseaux sociaux</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(g.social_media).map(([network, url]) => (
                    <a
                      key={network}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all"
                      style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "12px" }}>
                      <span style={{ color: "var(--muted-foreground)", fontFamily: "monospace", fontSize: "11px" }}>
                        {SOCIAL_ICONS[network] ?? network.slice(0, 2).toUpperCase()}
                      </span>
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
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)", marginBottom: "8px" }}>
            Nouvelle campagne
          </h2>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "24px" }}>
            Vault :{" "}
            <span style={{ color: "var(--ora-signal)" }}>{selectedVault.brand_name ?? selectedVault.name}</span>
          </p>
          <div className="space-y-4">
            <div>
              <label style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                Nom de la campagne
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Ex: Lancement Produit Été 2025"
                className="w-full rounded-xl px-4 py-3 focus:outline-none transition-colors"
                style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                Brief de campagne
              </label>
              <textarea
                value={campaignBrief}
                onChange={(e) => setCampaignBrief(e.target.value)}
                placeholder="Décrivez l'objectif, le message principal, le public visé, le ton souhaité..."
                rows={4}
                className="w-full rounded-xl px-4 py-3 focus:outline-none resize-none transition-colors"
                style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "13px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                URL produit (optionnel)
              </label>
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://www.mamarque.com/produit"
                className="w-full rounded-xl px-4 py-3 focus:outline-none transition-colors"
                style={{ background: "var(--input-background)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "13px" }}
              />
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)", opacity: 0.7, marginTop: "4px" }}>
                Le contenu de la page sera analysé pour enrichir les assets.
              </p>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", color: "var(--muted-foreground)", textTransform: "uppercase", display: "block", marginBottom: "12px" }}>
                Assets à générer
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "text", label: "Textes", icon: Sparkles },
                  { id: "image_prompt", label: "Prompts Images", icon: ImageIcon },
                  { id: "video_prompt", label: "Prompts Vidéo", icon: Video },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setAssetTypes((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                    style={
                      assetTypes.includes(id)
                        ? { background: "var(--ora-signal-light)", color: "var(--ora-signal)", border: "1px solid var(--ora-signal-ring)", fontSize: "13px" }
                        : { background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)", fontSize: "13px" }
                    }>
                    <Icon size={14} />{label}
                  </button>
                ))}
              </div>
            </div>
            {genError && (
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: "rgba(212,24,61,0.06)", border: "1px solid rgba(212,24,61,0.15)", color: "var(--destructive)", fontSize: "13px" }}>
                {genError}
              </div>
            )}
            <button
              onClick={handleCreateCampaign}
              disabled={generating || !campaignName.trim() || !campaignBrief.trim() || assetTypes.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 transition-all disabled:opacity-40"
              style={{ background: "var(--ora-signal)", color: "#ffffff", fontSize: "13px", fontWeight: 500 }}>
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
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--foreground)", letterSpacing: "-0.01em" }}>
              {activeCampaign.name}
            </h2>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>{activeCampaign.brief}</p>
          </div>
          <div className="space-y-4">
            {activeCampaign.assets?.map((asset, i) => (
              <div
                key={i}
                className="rounded-xl p-5"
                style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {asset.type === "text" && <Sparkles size={14} style={{ color: "#8b5cf6" }} />}
                    {asset.type === "image_prompts" && <ImageIcon size={14} style={{ color: "#10b981" }} />}
                    {asset.type === "video_prompts" && <Video size={14} style={{ color: "#f43f5e" }} />}
                    <h3 style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>
                      {asset.type === "text" ? "Contenus texte" :
                       asset.type === "image_prompts" ? "Prompts Images" : "Prompts Vidéo"}
                    </h3>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(asset.content)}
                    className="rounded-lg px-3 py-1 transition-all"
                    style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontSize: "12px" }}>
                    Copier
                  </button>
                </div>
                <div className="rounded-lg p-4" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                  <pre style={{ fontSize: "13px", color: "var(--foreground)", whiteSpace: "pre-wrap", fontFamily: "sans-serif", lineHeight: "1.6" }}>
                    {asset.content}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
