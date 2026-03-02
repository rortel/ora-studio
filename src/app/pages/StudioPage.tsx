import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Send, Sparkles, FileText, Zap, BarChart3, Shield, ChevronRight, Save } from "lucide-react";
import { Link } from "react-router";
import {
  buildCampaignFromMessages,
  loadCampaignStoreAsync,
  saveCampaignStoreAsync,
  upsertCampaign,
  type CampaignRecord,
} from "../lib/campaignStore";
import { useAuth } from "../lib/auth";

interface Message {
  id: number;
  agent: string | null;
  role: string;
  text: string;
  score?: number;
  timestamp: string;
}

interface GeneratedAsset {
  type: string;
  title: string;
  channel: string;
  body: string;
  compliance?: number;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  mediaProvider?: "replicate" | "fal" | "fallback";
  mediaStatus?: "ready" | "processing" | "failed" | "skipped";
}

interface GenerationResult {
  campaignName?: string;
  score?: number;
  assets: GeneratedAsset[];
  blocked?: boolean;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function extractUrls(text: string) {
  const matches = text.match(/https?:\/\/[^\s)]+/gi);
  return matches ? Array.from(new Set(matches.map((url) => url.trim()))) : [];
}

function inferSupportFromText(text: string) {
  const source = text.toLowerCase();
  if (source.includes("linkedin")) return "linkedin-post";
  if (source.includes("instagram")) return "instagram-post";
  if (source.includes("facebook")) return "facebook-post";
  if (source.includes("email") || source.includes("newsletter")) return "email";
  if (source.includes("video") || source.includes("film")) return "short-video";
  return "linkedin-post";
}

function inferObjectiveFromText(text: string) {
  const source = text.toLowerCase();
  if (source.includes("conversion") || source.includes("convertir") || source.includes("vente")) return "conversion";
  if (source.includes("lead")) return "generation de leads";
  if (source.includes("engagement")) return "engagement";
  if (source.includes("notori") || source.includes("awareness")) return "notoriete";
  return "consideration";
}

function inferTargetFromText(text: string) {
  const source = text.toLowerCase();
  const patterns = [
    /(?:cible|target)\s*[:=-]\s*([^\n,.;]+)/i,
    /(?:pour|for)\s+([^\n,.;]{4,80})/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "decision-makers B2B";
}

function parseStructuredBrief(brief: string) {
  const lines = brief
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const fields: Record<string, string> = {};
  lines.forEach((line) => {
    const match = line.match(/^(support|format|canal|cible|target|objectif|objective|message)\s*[:=-]\s*(.+)$/i);
    if (!match) return;
    fields[match[1].toLowerCase()] = match[2].trim();
  });

  const message = fields.message || brief;
  const support = fields.support || fields.format || fields.canal || inferSupportFromText(brief);
  const target = fields.cible || fields.target || inferTargetFromText(brief);
  const objective = fields.objectif || fields.objective || inferObjectiveFromText(brief);

  return { message, support, target, objective };
}

const initialMessages: Message[] = [];

const morningPulse = [
  { label: "Brand Health", value: "--", trend: "" },
  { label: "Content Queue", value: "0 pending", trend: "" },
  { label: "Compliance", value: "--", trend: "" },
  { label: "Weekly Goal", value: "0/0", trend: "" },
];

const quickBriefs = [
  "Product launch campaign for Q3 feature release",
  "Weekly LinkedIn thought leadership post",
  "Email nurture sequence for new trial users",
  "Crisis response draft for service outage",
];

export function StudioPage() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [savedCampaigns, setSavedCampaigns] = useState<CampaignRecord[]>([]);
  const [latestGeneration, setLatestGeneration] = useState<GenerationResult | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const workspaceName = asText(profile?.company) || asText(profile?.organizationName) || "Workspace";
  const timeStamp = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const refreshSavedCampaigns = async () => {
      const store = await loadCampaignStoreAsync();
      setSavedCampaigns(store.campaigns.slice(0, 8));
    };

    void refreshSavedCampaigns();
    const handleStorage = () => {
      void refreshSavedCampaigns();
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const brief = input.trim();
    const userMsg: Message = {
      id: Date.now(),
      agent: null,
      role: "user",
      text: brief,
      timestamp: timeStamp(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setLatestGeneration(null);

    try {
      const briefUrls = extractUrls(brief);
      const structured = parseStructuredBrief(brief);
      const brandVaultSignals = messages
        .filter((message) => Boolean(message.agent))
        .map((message) => asText(message.text))
        .filter((text) => /brand vault|tone|vocabulary|visual|compliance|guideline/i.test(text))
        .slice(-8)
        .map((text) => ({ type: "vault-note", summary: text }));

      const response = await fetch("/api/generate-campaign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brief,
          strictThreshold: 98,
          creationCenter: {
            request: structured.message,
            message: structured.message,
            support: structured.support,
            target: structured.target,
            objective: structured.objective,
            urls: briefUrls.map((url) => ({ url, type: "product-or-service" })),
          },
          brandVault: {
            references: brandVaultSignals,
          },
        }),
      });

      const payload = await response.json().catch(() => null);
      const agentMessages = Array.isArray(payload?.messages) ? payload.messages : [];

      if (!response.ok || !agentMessages.length) {
        throw new Error(asText(payload?.error) || "generation failed");
      }

      const generatedMessages: Message[] = agentMessages.map((entry, index) => ({
        id: Date.now() + index + 1,
        agent: asText(entry.agent) || "ORA",
        role: asText(entry.role) || "Agent",
        text: asText(entry.text) || "Generation completed.",
        score: typeof payload?.score === "number" && index === agentMessages.length - 1 ? payload.score : undefined,
        timestamp: timeStamp(),
      }));

      setMessages((prev) => [...prev, ...generatedMessages]);

      const generatedAssets = Array.isArray(payload?.assets)
        ? payload.assets
            .map((asset) => {
              if (!asset || typeof asset !== "object") return null;
              return {
                type: asText(asset.type) || "asset",
                title: asText(asset.title) || "Asset",
                channel: asText(asset.channel) || "Channel",
                body: asText(asset.body) || "",
                compliance: typeof asset.compliance === "number" ? asset.compliance : undefined,
                mediaUrl: asText(asset.mediaUrl) || undefined,
                mediaType: asset.mediaType === "video" ? "video" : asset.mediaType === "image" ? "image" : undefined,
                mediaProvider:
                  asset.mediaProvider === "replicate"
                    ? "replicate"
                    : asset.mediaProvider === "fal"
                      ? "fal"
                      : asset.mediaProvider === "fallback"
                        ? "fallback"
                        : undefined,
                mediaStatus:
                  asset.mediaStatus === "ready" ||
                  asset.mediaStatus === "processing" ||
                  asset.mediaStatus === "failed" ||
                  asset.mediaStatus === "skipped"
                    ? asset.mediaStatus
                    : undefined,
              } satisfies GeneratedAsset;
            })
            .filter((asset): asset is GeneratedAsset => Boolean(asset))
        : [];

      setLatestGeneration({
        campaignName: asText(payload?.campaignName) || undefined,
        score: typeof payload?.score === "number" ? payload.score : undefined,
        assets: generatedAssets,
        blocked: Boolean(payload?.blocked),
      });

      const warnings = Array.isArray(payload?.warnings) ? payload.warnings.map((item) => asText(item)).filter(Boolean) : [];
      if (warnings.length) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 200,
            agent: "ORA",
            role: "Media Engine",
            text: `Warnings: ${warnings.join(" · ")}`,
            timestamp: timeStamp(),
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          agent: "ORA",
          role: "System",
          text: `Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: timeStamp(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSaveAssets = async () => {
    if (latestGeneration?.blocked || (latestGeneration && latestGeneration.assets.length === 0)) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 3,
          agent: "ORA",
          role: "Compliance Gate",
          text: "No compliant assets to save yet. Generation is blocked until Brand Vault coherence reaches 98/100.",
          timestamp: timeStamp(),
        },
      ]);
      return;
    }

    const latestBrief =
      [...messages].reverse().find((message) => !message.agent && message.text.trim())?.text ||
      input.trim();
    if (!latestBrief) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 3,
          agent: "ORA",
          role: "System",
          text: "Nothing to save yet. Add a brief first.",
          timestamp: timeStamp(),
        },
      ]);
      return;
    }

    const campaign = buildCampaignFromMessages(latestBrief, messages, {
      name: latestGeneration?.campaignName,
      score: latestGeneration?.score,
      assets: latestGeneration?.assets,
    });
    const current = await loadCampaignStoreAsync();
    const next = upsertCampaign(current, campaign);
    const saved = await saveCampaignStoreAsync(next);
    setSavedCampaigns(saved.campaigns.slice(0, 8));

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + 4,
        agent: "ORA",
        role: "Campaign Archivist",
        text: `Campaign saved: "${campaign.name}" (${campaign.pieces} assets). Visible now in Campaigns.`,
        score: campaign.score,
        timestamp: timeStamp(),
      },
    ]);
  };

  return (
    <div className="h-[calc(100vh-56px)] flex">
      {/* Left sidebar */}
      <div className="hidden lg:flex w-[260px] border-r border-border flex-col bg-card">
        {/* Morning Pulse */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-ora-signal" />
            <span
              className="text-foreground"
              style={{ fontSize: '13px', fontWeight: 600 }}
            >
              Morning Pulse
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {morningPulse.map((item) => (
              <div key={item.label} className="bg-secondary/60 rounded-lg p-2.5">
                <p className="text-muted-foreground mb-0.5" style={{ fontSize: '11px' }}>
                  {item.label}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-foreground" style={{ fontSize: '14px', fontWeight: 600 }}>
                    {item.value}
                  </span>
                  {item.trend && (
                    <span className="text-ora-signal" style={{ fontSize: '10px' }}>
                      {item.trend}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent campaigns */}
        <div className="p-5 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-foreground" style={{ fontSize: '13px', fontWeight: 600 }}>
              Campaigns
            </span>
            <button className="text-ora-signal cursor-pointer" style={{ fontSize: '12px', fontWeight: 500 }}>
              + New
            </button>
          </div>
          <div className="space-y-1.5">
            {savedCampaigns.length === 0 && (
              <div className="border border-border rounded-lg p-3">
                <p className="text-muted-foreground" style={{ fontSize: "11px" }}>
                  No campaigns yet. Generate and save assets to populate this list.
                </p>
              </div>
            )}
            {savedCampaigns.map((campaign) => {
              const status = campaign.status;
              const formats = campaign.formats.length || campaign.pieces;
              return (
                <button
                  key={campaign.id}
                  className="w-full text-left p-3 rounded-lg hover:bg-secondary/60 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-foreground" style={{ fontSize: '13px', fontWeight: 500 }}>
                      {campaign.name}
                    </span>
                    <ChevronRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground" style={{ fontSize: '11px' }}>
                      {formats} formats
                    </span>
                    <span className="text-ora-signal" style={{ fontSize: '11px', fontWeight: 500 }}>
                      {campaign.score}/100
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-white ${
                        status === "Live" ? "bg-green-500" :
                        status === "Review" ? "bg-yellow-500" :
                        status === "Approved" ? "bg-ora-signal" :
                        "bg-muted-foreground/50"
                      }`}
                      style={{ fontSize: '9px', fontWeight: 600 }}
                    >
                      {status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Vault link */}
        <div className="p-5 border-t border-border">
          <Link
            to="/studio/vault"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontSize: '13px' }}
          >
            <Shield size={14} />
            Brand Vault
            <span className="ml-auto text-ora-signal" style={{ fontSize: '11px', fontWeight: 500 }}>
              --
            </span>
          </Link>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-foreground" style={{ fontSize: '14px', fontWeight: 500 }}>
                New Campaign
              </span>
            </div>
            <span className="text-muted-foreground" style={{ fontSize: '13px' }}>
              {workspaceName}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <FileText size={14} />
              <span style={{ fontSize: '13px' }}>Preview</span>
            </button>
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <BarChart3 size={14} />
              <span style={{ fontSize: '13px' }}>Analytics</span>
            </button>
            <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <Zap size={14} />
              <span style={{ fontSize: '13px' }}>Cascade</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void handleSaveAssets();
              }}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Save size={14} />
              <span style={{ fontSize: "13px" }}>Save assets</span>
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg) => {
            if (msg.agent) {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-[680px]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-ora-signal" />
                    <span className="text-foreground" style={{ fontSize: '14px', fontWeight: 600 }}>
                      {msg.agent}
                    </span>
                    <span className="text-muted-foreground" style={{ fontSize: '13px' }}>
                      \u00B7 {msg.role}
                    </span>
                    {msg.score !== undefined && (
                      <span className="text-ora-signal" style={{ fontSize: '14px', fontWeight: 600 }}>
                        {msg.score}
                      </span>
                    )}
                    <span className="ml-auto text-muted-foreground/50" style={{ fontSize: '11px' }}>
                      {msg.timestamp}
                    </span>
                  </div>
                  <p
                    className="text-foreground/80 pl-4 border-l-2 border-border"
                    style={{ fontSize: '15px', lineHeight: 1.6 }}
                  >
                    {msg.text}
                  </p>
                </motion.div>
              );
            }
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end"
              >
                <div className="max-w-[520px]">
                  <div className="bg-primary text-primary-foreground px-4 py-3 rounded-xl rounded-br-sm">
                    <p style={{ fontSize: '15px', lineHeight: 1.5 }}>{msg.text}</p>
                  </div>
                  <p className="text-muted-foreground/50 text-right mt-1" style={{ fontSize: '11px' }}>
                    {msg.timestamp}
                  </p>
                </div>
              </motion.div>
            );
          })}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 pl-4"
            >
              <span className="w-2 h-2 rounded-full bg-ora-signal" />
              <span className="text-muted-foreground" style={{ fontSize: '13px' }}>
                ORA is thinking...
              </span>
              <motion.span
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-ora-signal"
              />
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick briefs */}
        {messages.length <= 1 && (
          <div className="px-6 pb-3">
            <p className="text-muted-foreground mb-2" style={{ fontSize: '12px', fontWeight: 500 }}>
              Quick start
            </p>
            <div className="flex flex-wrap gap-2">
              {quickBriefs.map((brief) => (
                <button
                  key={brief}
                  onClick={() => {
                    setInput(brief);
                  }}
                  className="border border-border px-3 py-1.5 rounded-lg text-foreground/70 hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                  style={{ fontSize: '13px' }}
                >
                  {brief}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="px-6 pb-6 pt-3">
          <div className="flex items-end gap-3 bg-card border border-border rounded-xl p-3"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Brief your team... (e.g. 'Launch campaign for new pricing, target CFOs, emphasize ROI')"
              rows={1}
              className="flex-1 bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground/50"
              style={{ fontSize: '15px', lineHeight: 1.5 }}
            />
            <button
              onClick={() => {
                void handleSend();
              }}
              disabled={!input.trim() || isTyping}
              className="p-2.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-opacity flex-shrink-0 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-center text-muted-foreground/40 mt-2" style={{ fontSize: '11px' }}>
            ORA validates every output against your Brand Vault before showing it.
          </p>
        </div>
      </div>
    </div>
  );
}
