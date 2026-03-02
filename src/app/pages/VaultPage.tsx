import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router";
import {
  ArrowLeft,
  Globe,
  FileText,
  Palette,
  Users,
  Shield,
  Target,
  BookOpen,
  RefreshCw,
  Check,
  Plus,
  Upload,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { getAccessToken } from "../lib/authToken";

type VaultDoc = {
  id: string;
  name: string;
  type?: string;
  size?: number;
  addedAt?: string;
};

type VaultRecord = {
  id: string;
  name: string;
  websiteUrl: string;
  sourceUrls: string[];
  documents: VaultDoc[];
  logoUrl: string;
  summary: string;
  semanticTone: {
    formality: string;
    warmth: string;
    boldness: string;
    technicality: string;
    humor: string;
  };
  vocabulary: {
    approved: string[];
    forbidden: string[];
    expertise: string[];
  };
  structure: {
    titleStyle: string;
    headlinePattern: string;
    ctaStyle: string;
  };
  visualIntent: {
    palette: string[];
    lighting: string;
    humanPresence: string;
    mood: string;
  };
  positioning: {
    expertise: string;
    positioning: string;
    target: string;
    competitors: string[];
  };
  status: string;
  lastAnalyzedAt: string;
};

type VaultStore = {
  activeVaultId: string;
  vaults: VaultRecord[];
};

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
          logoUrl: "",
          summary: "",
          semanticTone: { formality: "--", warmth: "--", boldness: "--", technicality: "--", humor: "--" },
          vocabulary: { approved: [], forbidden: [], expertise: [] },
          structure: { titleStyle: "--", headlinePattern: "--", ctaStyle: "--" },
          visualIntent: { palette: [], lighting: "--", humanPresence: "--", mood: "--" },
          positioning: { expertise: "--", positioning: "--", target: "--", competitors: [] },
          status: "pending",
          lastAnalyzedAt: "",
        },
      ],
    };
  }
  const source = raw as Partial<VaultStore>;
  const vaults = Array.isArray(source.vaults)
    ? source.vaults.filter((vault): vault is VaultRecord => Boolean(vault && typeof vault === "object" && !Array.isArray(vault)))
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

function formatDate(value: string) {
  if (!value) return "No crawl yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No crawl yet";
  return date.toLocaleString();
}

export function VaultPage() {
  const { profile } = useAuth();
  const fallbackVaultName = (profile?.company || profile?.organizationName || "Default Vault").trim();
  const [store, setStore] = useState<VaultStore>(() => normalizeVaultStore(null, fallbackVaultName));
  const [selectedVaultId, setSelectedVaultId] = useState("default-vault");
  const [vaultName, setVaultName] = useState(fallbackVaultName);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const activeVault = useMemo(() => {
    return store.vaults.find((vault) => vault.id === selectedVaultId) || store.vaults[0];
  }, [selectedVaultId, store.vaults]);

  useEffect(() => {
    if (!activeVault) return;
    setSelectedVaultId(activeVault.id);
    setVaultName(activeVault.name);
    setWebsiteUrl(activeVault.websiteUrl);
    setLogoUrl(activeVault.logoUrl);
  }, [activeVault?.id]);

  const loadVaults = async () => {
    const token = getAccessToken();
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/vault-store", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(asText(payload?.error) || "Unable to load Brand Vault");
      }
      const nextStore = normalizeVaultStore(payload?.store, fallbackVaultName);
      setStore(nextStore);
      setSelectedVaultId(nextStore.activeVaultId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load Brand Vault");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadVaults();
  }, []);

  const persistStore = async (nextStore: VaultStore) => {
    const token = getAccessToken();
    if (!token) {
      setStore(nextStore);
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/vault-store", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ store: nextStore }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(asText(payload?.error) || "Unable to save Brand Vault");
      }
      const safe = normalizeVaultStore(payload?.store, fallbackVaultName);
      setStore(safe);
      setNotice("Brand Vault saved.");
    } catch (persistError) {
      setError(persistError instanceof Error ? persistError.message : "Unable to save Brand Vault");
    } finally {
      setIsSaving(false);
    }
  };

  const analyzeVault = async () => {
    if (!activeVault) return;
    if (!websiteUrl.trim()) {
      setError("Please enter a website URL before analyzing.");
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setError("Session expired. Please sign in again.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/vault-store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "analyze",
          vaultId: activeVault.id,
          name: vaultName,
          url: websiteUrl,
          logoUrl,
          documents: docFiles.map((doc) => ({
            name: doc.name,
            type: doc.type,
            size: doc.size,
          })),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.ok === false) {
        throw new Error(asText(payload?.error) || "URL analysis failed");
      }
      const nextStore = normalizeVaultStore(payload?.store, fallbackVaultName);
      setStore(nextStore);
      setSelectedVaultId(nextStore.activeVaultId);
      setNotice(payload?.warning ? `Analysis completed with warning: ${payload.warning}` : "Brand Vault analyzed successfully.");
      setDocFiles([]);
    } catch (analyzeError) {
      setError(analyzeError instanceof Error ? analyzeError.message : "URL analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createVault = async () => {
    const nextId = `vault-${Date.now().toString(36)}`;
    const nextName = `New Vault ${store.vaults.length + 1}`;
    const nextStore: VaultStore = {
      ...store,
      activeVaultId: nextId,
      vaults: [
        ...store.vaults,
        {
          id: nextId,
          name: nextName,
          websiteUrl: "",
          sourceUrls: [],
          documents: [],
          logoUrl: "",
          summary: "",
          semanticTone: { formality: "--", warmth: "--", boldness: "--", technicality: "--", humor: "--" },
          vocabulary: { approved: [], forbidden: [], expertise: [] },
          structure: { titleStyle: "--", headlinePattern: "--", ctaStyle: "--" },
          visualIntent: { palette: [], lighting: "--", humanPresence: "--", mood: "--" },
          positioning: { expertise: "--", positioning: "--", target: "--", competitors: [] },
          status: "pending",
          lastAnalyzedAt: "",
        },
      ],
    };
    setStore(nextStore);
    setSelectedVaultId(nextId);
    setVaultName(nextName);
    setWebsiteUrl("");
    setLogoUrl("");
    await persistStore(nextStore);
  };

  const saveMetaOnly = async () => {
    if (!activeVault) return;
    const nextStore: VaultStore = {
      ...store,
      vaults: store.vaults.map((vault) =>
        vault.id === activeVault.id
          ? {
              ...vault,
              name: asText(vaultName) || vault.name,
              websiteUrl: asText(websiteUrl) || vault.websiteUrl,
              logoUrl: asText(logoUrl),
            }
          : vault,
      ),
    };
    await persistStore(nextStore);
  };

  const sections = useMemo(() => {
    if (!activeVault) return [];
    return [
      {
        icon: Globe,
        title: "Digital Presence",
        score: activeVault.status === "analyzed" ? 100 : 0,
        items: [
          { label: "Website crawled", value: activeVault.websiteUrl || "Not analyzed yet" },
          { label: "References", value: `${activeVault.sourceUrls.length} URL(s)` },
          { label: "Last updated", value: formatDate(activeVault.lastAnalyzedAt) },
        ],
      },
      {
        icon: Palette,
        title: "Tone & Voice",
        score: activeVault.status === "analyzed" ? 100 : 0,
        items: [
          { label: "Formality", value: activeVault.semanticTone.formality || "--" },
          { label: "Warmth", value: activeVault.semanticTone.warmth || "--" },
          { label: "Boldness", value: activeVault.semanticTone.boldness || "--" },
          { label: "Technicality", value: activeVault.semanticTone.technicality || "--" },
        ],
      },
      {
        icon: BookOpen,
        title: "Vocabulary",
        score: activeVault.status === "analyzed" ? 100 : 0,
        items: [
          { label: "Approved terms", value: `${activeVault.vocabulary.approved.length} terms` },
          { label: "Forbidden terms", value: `${activeVault.vocabulary.forbidden.length} terms` },
          { label: "Expertise terms", value: `${activeVault.vocabulary.expertise.length} terms` },
        ],
      },
      {
        icon: Users,
        title: "Audience",
        score: activeVault.status === "analyzed" ? 100 : 0,
        items: [
          { label: "Target", value: activeVault.positioning.target || "--" },
          { label: "Positioning", value: activeVault.positioning.positioning || "--" },
          { label: "Expertise", value: activeVault.positioning.expertise || "--" },
        ],
      },
      {
        icon: Target,
        title: "Competitors",
        score: activeVault.status === "analyzed" ? 100 : 0,
        items: [
          { label: "Tracked", value: `${activeVault.positioning.competitors.length} competitors` },
          { label: "Top rival", value: activeVault.positioning.competitors[0] || "--" },
          { label: "Second rival", value: activeVault.positioning.competitors[1] || "--" },
        ],
      },
      {
        icon: Shield,
        title: "Visual Intent",
        score: activeVault.status === "analyzed" ? 100 : 0,
        items: [
          { label: "Lighting", value: activeVault.visualIntent.lighting || "--" },
          { label: "Human presence", value: activeVault.visualIntent.humanPresence || "--" },
          { label: "Mood", value: activeVault.visualIntent.mood || "--" },
        ],
      },
    ];
  }, [activeVault]);

  if (!activeVault) return null;

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

          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-foreground" style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "-0.03em" }}>
                  Brand Vault
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-ora-signal-light text-ora-signal" style={{ fontSize: "12px", fontWeight: 600 }}>
                  {activeVault.status === "analyzed" ? "READY" : "PENDING"}
                </span>
              </div>
              <p className="text-muted-foreground" style={{ fontSize: "15px" }}>
                {activeVault.name} — {activeVault.summary || "Add URL + docs to build your brand foundation."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadVaults()}
              className="flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-foreground hover:bg-secondary transition-colors cursor-pointer"
              style={{ fontSize: "13px", fontWeight: 500 }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-6">
        <div className="bg-card border border-border rounded-xl p-5 grid gap-3">
          <div className="grid md:grid-cols-[220px_minmax(0,1fr)_auto] gap-3">
            <label className="text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>
              Vault
              <select
                value={selectedVaultId}
                onChange={(event) => setSelectedVaultId(event.target.value)}
                className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                style={{ fontSize: "13px" }}
              >
                {store.vaults.map((vault) => (
                  <option key={vault.id} value={vault.id}>
                    {vault.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>
              Vault name
              <input
                value={vaultName}
                onChange={(event) => setVaultName(event.target.value)}
                className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground"
                style={{ fontSize: "13px" }}
              />
            </label>

            <button
              type="button"
              onClick={() => void createVault()}
              className="self-end inline-flex items-center gap-2 border border-border px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              style={{ fontSize: "12px", fontWeight: 600 }}
            >
              <Plus size={12} />
              New vault
            </button>
          </div>

          <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <label className="text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>
              Website URL (scrape + fetch)
              <input
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://your-company.com"
                className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50"
                style={{ fontSize: "13px" }}
              />
            </label>
            <label className="text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>
              Logo PNG URL (optional)
              <input
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                placeholder="https://.../logo.png"
                className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/50"
                style={{ fontSize: "13px" }}
              />
            </label>
          </div>

          <label className="text-muted-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>
            Documents (PDF, PPT, PPTX, DOC, DOCX)
            <input
              type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx"
              multiple
              onChange={(event) => setDocFiles(Array.from(event.target.files || []))}
              className="hidden"
              id="vault-documents"
            />
            <label
              htmlFor="vault-documents"
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer inline-flex items-center gap-2"
              style={{ fontSize: "13px" }}
            >
              <Upload size={14} />
              {docFiles.length ? `${docFiles.length} file(s) selected` : "Upload docs for analysis"}
            </label>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void analyzeVault()}
              disabled={isAnalyzing}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-70 cursor-pointer"
              style={{ fontSize: "13px", fontWeight: 600 }}
            >
              <RefreshCw size={14} />
              {isAnalyzing ? "Analyzing..." : "Analyze URL + docs"}
            </button>
            <button
              type="button"
              onClick={() => void saveMetaOnly()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 border border-border px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              style={{ fontSize: "13px", fontWeight: 600 }}
            >
              Save vault
            </button>
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Last analyzed: {formatDate(activeVault.lastAnalyzedAt)}
            </p>
          </div>

          {error && (
            <p className="text-destructive" style={{ fontSize: "12px" }}>
              {error}
            </p>
          )}
          {notice && (
            <p className="text-ora-signal" style={{ fontSize: "12px" }}>
              {notice}
            </p>
          )}
          {isLoading && (
            <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
              Loading Brand Vault...
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map((section, i) => {
            const Icon = section.icon;
            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="text-left bg-card border border-border rounded-xl p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className="text-muted-foreground" />
                    <span className="text-foreground" style={{ fontSize: "15px", fontWeight: 500 }}>
                      {section.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={12} className="text-ora-signal" />
                    <span className="text-ora-signal" style={{ fontSize: "13px", fontWeight: 600 }}>
                      {section.score}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground" style={{ fontSize: "13px" }}>
                        {item.label}
                      </span>
                      <span className="text-foreground text-right" style={{ fontSize: "13px", fontWeight: 450 }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <FileText size={16} className="text-ora-signal" />
              <h3 className="text-foreground" style={{ fontSize: "16px", fontWeight: 500 }}>
                Approved Vocabulary
              </h3>
              <span className="ml-auto text-muted-foreground" style={{ fontSize: "12px" }}>
                {activeVault.vocabulary.approved.length} terms
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {!activeVault.vocabulary.approved.length && (
                <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                  No approved vocabulary extracted yet.
                </p>
              )}
              {activeVault.vocabulary.approved.map((term) => (
                <span
                  key={term}
                  className="px-3 py-1.5 rounded-lg bg-ora-signal-light text-foreground border border-ora-signal/10"
                  style={{ fontSize: "13px" }}
                >
                  {term}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Shield size={16} className="text-destructive/60" />
              <h3 className="text-foreground" style={{ fontSize: "16px", fontWeight: 500 }}>
                Forbidden Terms
              </h3>
              <span className="ml-auto text-muted-foreground" style={{ fontSize: "12px" }}>
                {activeVault.vocabulary.forbidden.length} terms
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {!activeVault.vocabulary.forbidden.length && (
                <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                  No forbidden terms extracted yet.
                </p>
              )}
              {activeVault.vocabulary.forbidden.map((term) => (
                <span
                  key={term}
                  className="px-3 py-1.5 rounded-lg bg-destructive/5 text-destructive/70 border border-destructive/10 line-through"
                  style={{ fontSize: "13px" }}
                >
                  {term}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={16} className="text-muted-foreground" />
            <h3 className="text-foreground" style={{ fontSize: "16px", fontWeight: 500 }}>
              Visual Palette
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {!activeVault.visualIntent.palette.length && (
              <p className="text-muted-foreground" style={{ fontSize: "13px" }}>
                No color palette extracted yet.
              </p>
            )}
            {activeVault.visualIntent.palette.map((color) => (
              <div key={color} className="flex items-center gap-2 border border-border rounded-lg px-2.5 py-1.5">
                <span className="inline-block w-4 h-4 rounded-sm border border-border" style={{ backgroundColor: color }} />
                <span className="text-foreground" style={{ fontSize: "12px", fontWeight: 500 }}>
                  {color}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
