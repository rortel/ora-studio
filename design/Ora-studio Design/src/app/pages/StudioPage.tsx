import { useState, useCallback, useRef, useEffect } from "react";
import {
  MousePointer2, Move, Type, ImageIcon, Square, Crop, PenTool, Hand,
  ZoomIn, ZoomOut, Undo2, Redo2, Download, Share2, Check,
  Mail, MessageSquare, Megaphone, Layout, Smartphone, Newspaper, Sparkles,
  ChevronDown, Layers as LayersIcon, FolderOpen, MessageCircle,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, Palette,
  Shield, Linkedin, ArrowUp, Wand2, Grid3x3,
  SlidersHorizontal, Film, RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import { StudioCanvas, type FormatType } from "../components/studio/StudioCanvas";
import { MediaLibrary } from "../components/studio/MediaLibrary";
import { LayersPanel } from "../components/studio/LayersPanel";
import { EditorTimeline } from "../components/studio/EditorTimeline";

/* ---- FORMAT DEFINITIONS ---- */

const formats: { id: FormatType; label: string; icon: typeof Mail; shortcut?: string }[] = [
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, shortcut: "1" },
  { id: "email", label: "Email", icon: Mail, shortcut: "2" },
  { id: "sms", label: "SMS", icon: MessageSquare, shortcut: "3" },
  { id: "ad", label: "Ad", icon: Megaphone, shortcut: "4" },
  { id: "landing", label: "Landing", icon: Layout, shortcut: "5" },
  { id: "stories", label: "Stories", icon: Smartphone, shortcut: "6" },
  { id: "newsletter", label: "Newsletter", icon: Newspaper, shortcut: "7" },
];

/* ---- TOOL DEFINITIONS ---- */

const tools = [
  { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { id: "move", icon: Move, label: "Move", shortcut: "M" },
  { id: "text", icon: Type, label: "Text", shortcut: "T" },
  { id: "image", icon: ImageIcon, label: "Image", shortcut: "I" },
  { id: "shape", icon: Square, label: "Shape", shortcut: "R" },
  { id: "crop", icon: Crop, label: "Crop", shortcut: "C" },
  { id: "pen", icon: PenTool, label: "Pen", shortcut: "P" },
  { id: "hand", icon: Hand, label: "Hand", shortcut: "H" },
];

/* ---- LEFT PANEL TABS ---- */

type LeftPanelTab = "layers" | "media";

/* ---- RIGHT PANEL TABS ---- */

type RightPanelTab = "properties" | "chat" | "history";

/* ---- ELEMENT PROPERTIES ---- */

const elementProperties: Record<string, { type: string; label: string; font?: string; size?: number; color?: string; opacity?: number; width?: number; height?: number }> = {
  "ln-header": { type: "group", label: "Profile Header", opacity: 100, width: 520, height: 60 },
  "ln-body": { type: "text", label: "Post Body", font: "Inter", size: 14, color: "#111113", opacity: 100 },
  "ln-image": { type: "image", label: "Post Image", opacity: 100, width: 520, height: 280 },
  "ln-engagement": { type: "shape", label: "Engagement Bar", opacity: 100, width: 520, height: 60 },
  "em-header": { type: "group", label: "Header", opacity: 100 },
  "em-hero": { type: "image", label: "Hero Image", opacity: 100, width: 600, height: 200 },
  "em-headline": { type: "text", label: "Headline", font: "Inter", size: 22, color: "#111113", opacity: 100 },
  "em-body": { type: "text", label: "Body Text", font: "Inter", size: 14, color: "#6b6b7b", opacity: 100 },
  "em-cta": { type: "button", label: "CTA Button", font: "Inter", size: 14, color: "#ffffff", opacity: 100 },
  "em-footer": { type: "text", label: "Footer", font: "Inter", size: 10, color: "#6b6b7b", opacity: 100 },
  "sms-header": { type: "group", label: "Contact Header", opacity: 100 },
  "sms-msg1": { type: "text", label: "Message 1", font: "SF Pro", size: 14, color: "#000000", opacity: 100 },
  "sms-msg2": { type: "text", label: "Message 2 — Link", font: "SF Pro", size: 14, color: "#000000", opacity: 100 },
  "ad-bg": { type: "shape", label: "Background", opacity: 100, width: 728, height: 400 },
  "ad-headline": { type: "text", label: "Headline", font: "Inter", size: 28, color: "#ffffff", opacity: 100 },
  "ad-visual": { type: "image", label: "Pulse Visual", opacity: 100, width: 128, height: 128 },
  "ad-cta": { type: "button", label: "CTA", font: "Inter", size: 13, color: "#ffffff", opacity: 100 },
  "ad-logo": { type: "image", label: "Logo", opacity: 70, width: 100, height: 20 },
  "lp-nav": { type: "group", label: "Navigation", opacity: 100 },
  "lp-hero": { type: "text", label: "Headline", font: "Inter", size: 28, color: "#111113", opacity: 100 },
  "lp-sub": { type: "text", label: "Subtitle", font: "Inter", size: 14, color: "#6b6b7b", opacity: 100 },
  "lp-cta": { type: "button", label: "CTA Button", font: "Inter", size: 13, color: "#ffffff", opacity: 100 },
  "lp-visual": { type: "image", label: "Hero Visual", opacity: 100, width: 800, height: 220 },
  "st-bg": { type: "shape", label: "Background", opacity: 100, width: 360, height: 640 },
  "st-visual": { type: "image", label: "Pulse Visual", opacity: 100, width: 112, height: 112 },
  "st-text": { type: "text", label: "Text Overlay", font: "Inter", size: 24, color: "#ffffff", opacity: 100 },
  "st-cta": { type: "button", label: "Swipe Up", font: "Inter", size: 13, color: "#ffffff", opacity: 100 },
  "nl-header": { type: "group", label: "Newsletter Header", opacity: 100 },
  "nl-s1": { type: "group", label: "Section — Feature", opacity: 100 },
  "nl-s2": { type: "group", label: "Section — Quick Bites", opacity: 100 },
  "nl-s3": { type: "group", label: "Section — Customer Story", opacity: 100 },
};

/* ---- AI CHAT MESSAGES ---- */

interface ChatMessage {
  id: string;
  role: "agent" | "user";
  agent: string;
  text: string;
  timestamp: string;
  status?: "thinking" | "done";
}

const initialMessages: ChatMessage[] = [
  { id: "m1", role: "agent", agent: "Brand Analyst", text: "Brand Vault loaded for Acme Corp. Tone: 7.2/10 formality. 342 approved terms indexed. Ready to create.", timestamp: "9:41 AM", status: "done" },
  { id: "m2", role: "agent", agent: "Creative Director", text: "Campaign Q2 initialized with 7 format targets. LinkedIn, Email, SMS, Ad, Landing, Stories, Newsletter all linked to master brief.", timestamp: "9:41 AM", status: "done" },
  { id: "m3", role: "agent", agent: "Copywriter", text: "LinkedIn draft ready. Compliance score: 96/100. Tone aligned with vault.", timestamp: "9:42 AM", status: "done" },
];

/* ---- QUICK ACTIONS (contextual) ---- */

function getQuickActions(format: FormatType, selectedId: string | null): { label: string; icon: typeof Wand2; command: string }[] {
  const common = [
    { label: "Rewrite", icon: RotateCcw, command: "Rewrite this with a bolder tone" },
    { label: "Shorten", icon: Type, command: "Make this shorter and punchier" },
    { label: "Add CTA", icon: ArrowUp, command: "Add a compelling call to action" },
  ];

  if (format === "stories" || format === "ad") {
    return [
      { label: "Add Motion", icon: Film, command: "Add subtle entrance animation" },
      { label: "Change Style", icon: Palette, command: "Try a different visual style" },
      ...common,
    ];
  }

  if (selectedId?.includes("image") || selectedId?.includes("hero") || selectedId?.includes("visual")) {
    return [
      { label: "Regenerate", icon: Sparkles, command: "Generate a new visual for this" },
      { label: "Adjust Style", icon: SlidersHorizontal, command: "Adjust the visual style" },
      { label: "Add Motion", icon: Film, command: "Add subtle animation to this image" },
      ...common.slice(0, 1),
    ];
  }

  return [
    { label: "Cascade All", icon: Grid3x3, command: "Cascade these changes to all 7 formats" },
    ...common,
    { label: "Translate", icon: MessageCircle, command: "Translate to French" },
  ];
}

/* ---- MAIN COMPONENT ---- */

export function StudioPage() {
  const [activeFormat, setActiveFormat] = useState<FormatType>("linkedin");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState("select");
  const [leftPanel, setLeftPanel] = useState<LeftPanelTab>("layers");
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("chat");
  const [zoom, setZoom] = useState(80);
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({});
  const [showTimeline, setShowTimeline] = useState(false);
  const [commandInput, setCommandInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialMessages);
  const [complianceScore] = useState(96);
  const [isThinking, setIsThinking] = useState(false);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const selectedProps = selectedId ? elementProperties[selectedId] : null;
  const quickActions = getQuickActions(activeFormat, selectedId);

  // Auto-switch right panel to properties when element selected
  useEffect(() => {
    if (selectedId) setRightPanelTab("properties");
    else setRightPanelTab("chat");
  }, [selectedId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(200, z + 10)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(30, z - 10)), []);

  const handleToggleVisibility = useCallback((id: string) => {
    setLayerVisibility((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }));
  }, []);

  // The "SMS" command handler
  const handleCommand = (text?: string) => {
    const msg = text || commandInput;
    if (!msg.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      agent: "",
      text: msg,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setCommandInput("");
    setIsThinking(true);

    // Simulate AI response
    setTimeout(() => {
      const responses: Record<string, { agent: string; text: string }[]> = {
        default: [
          { agent: "Copywriter", text: "Done. Updated the copy across all active formats. Compliance held at 96/100." },
        ],
        shorten: [
          { agent: "Copywriter", text: "Shortened by 40%. Key message preserved. Compliance: 97/100." },
        ],
        motion: [
          { agent: "Art Director", text: "Added fade-in animation (0.6s ease-out) to the headline. Check the timeline to fine-tune timing." },
          { agent: "Video Maker", text: "Motion preview ready. Timeline updated with 3 keyframes." },
        ],
        cascade: [
          { agent: "Campaign Multiplier", text: "Cascaded to all 7 formats. Each adapted to platform constraints. Average compliance: 95/100." },
          { agent: "Compliance Guard", text: "All formats verified. 0 violations. 2 minor suggestions flagged in Email format." },
        ],
        visual: [
          { agent: "Art Director", text: "Generated 3 visual variants. Check the Media panel to preview and select." },
        ],
        translate: [
          { agent: "Copywriter", text: "Translated to French. Tone adjusted for FR market conventions. Compliance: 94/100." },
        ],
      };

      const key = msg.toLowerCase().includes("cascade") ? "cascade"
        : msg.toLowerCase().includes("motion") || msg.toLowerCase().includes("anim") ? "motion"
        : msg.toLowerCase().includes("short") || msg.toLowerCase().includes("punch") ? "shorten"
        : msg.toLowerCase().includes("visual") || msg.toLowerCase().includes("generat") ? "visual"
        : msg.toLowerCase().includes("translat") || msg.toLowerCase().includes("french") ? "translate"
        : "default";

      const resps = responses[key];
      resps.forEach((r, i) => {
        setTimeout(() => {
          setChatMessages((prev) => [...prev, {
            id: `resp-${Date.now()}-${i}`,
            role: "agent",
            agent: r.agent,
            text: r.text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            status: "done",
          }]);
          if (i === resps.length - 1) setIsThinking(false);

          // Auto-show timeline for motion commands
          if (key === "motion") setShowTimeline(true);
        }, 600 + i * 800);
      });
    }, 800);
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-background">
      {/* ═══════ TOP BAR ═══════ */}
      <div className="flex items-center justify-between px-3 h-10 border-b bg-card flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        {/* Format tabs */}
        <div className="flex items-center gap-0.5">
          {formats.map((f) => {
            const Icon = f.icon;
            const isActive = activeFormat === f.id;
            return (
              <button
                key={f.id}
                onClick={() => { setActiveFormat(f.id); setSelectedId(null); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  isActive ? "bg-ora-signal-light text-ora-signal" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                style={{ fontSize: "11px", fontWeight: isActive ? 600 : 400 }}
                title={`${f.label} (${f.shortcut})`}
              >
                <Icon size={12} />
                <span className="hidden xl:inline">{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Center info */}
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground" style={{ fontSize: "11px" }}>Acme Corp — Campaign Q2</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-ora-signal-light">
            <Shield size={10} className="text-ora-signal" />
            <span className="text-ora-signal" style={{ fontSize: "11px", fontWeight: 600 }}>{complianceScore}/100</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer" title="Undo"><Undo2 size={14} /></button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer" title="Redo"><Redo2 size={14} /></button>
          <div className="w-px h-4 bg-border mx-1" />
          <button className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer" title="Export"><Download size={14} /></button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground cursor-pointer" title="Share"><Share2 size={14} /></button>
          <div className="w-px h-4 bg-border mx-1" />
          <button
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-white cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: "var(--ora-signal)", fontSize: "11px", fontWeight: 500 }}
          >
            <Check size={12} />
            Approve
          </button>
        </div>
      </div>

      {/* ═══════ MAIN AREA ═══════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ─── LEFT: Toolbar + Panel ─── */}
        <div className="flex flex-shrink-0">
          {/* Vertical tool bar */}
          <div className="w-10 bg-card border-r flex flex-col items-center py-2 gap-0.5" style={{ borderColor: "var(--border)" }}>
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${
                    isActive ? "bg-ora-signal-light text-ora-signal" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                  title={`${tool.label} (${tool.shortcut})`}
                >
                  <Icon size={14} />
                </button>
              );
            })}

            <div className="flex-1" />

            {/* Panel toggles */}
            {([
              { id: "layers" as LeftPanelTab, icon: LayersIcon, label: "Layers" },
              { id: "media" as LeftPanelTab, icon: FolderOpen, label: "Media" },
            ]).map((p) => {
              const Icon = p.icon;
              const isActive = leftPanel === p.id && leftPanelOpen;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    if (leftPanel === p.id && leftPanelOpen) setLeftPanelOpen(false);
                    else { setLeftPanel(p.id); setLeftPanelOpen(true); }
                  }}
                  className={`w-7 h-7 flex items-center justify-center rounded-md transition-all cursor-pointer ${
                    isActive ? "bg-ora-signal-light text-ora-signal" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                  title={p.label}
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </div>

          {/* Expandable left panel */}
          <AnimatePresence>
            {leftPanelOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 240, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-r overflow-hidden bg-card flex-shrink-0"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="w-[240px] h-full">
                  {leftPanel === "layers" && (
                    <LayersPanel
                      format={activeFormat}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      layerVisibility={layerVisibility}
                      onToggleVisibility={handleToggleVisibility}
                    />
                  )}
                  {leftPanel === "media" && (
                    <MediaLibrary />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── CENTER: Canvas + Quick Actions + Timeline ─── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <StudioCanvas
            format={activeFormat}
            selectedId={selectedId}
            onSelect={setSelectedId}
            zoom={zoom}
          />

          {/* Zoom bar */}
          <div className="flex items-center justify-center gap-3 px-4 py-1.5 bg-card border-t" style={{ borderColor: "var(--border)" }}>
            <button onClick={handleZoomOut} className="text-muted-foreground hover:text-foreground cursor-pointer"><ZoomOut size={13} /></button>
            <div className="w-24 h-1 bg-secondary rounded-full relative">
              <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${((zoom - 30) / 170) * 100}%`, background: "var(--ora-signal)" }} />
            </div>
            <button onClick={handleZoomIn} className="text-muted-foreground hover:text-foreground cursor-pointer"><ZoomIn size={13} /></button>
            <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--muted-foreground)", minWidth: 32 }}>{zoom}%</span>
            <div className="w-px h-3 bg-border mx-1" />
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition-colors ${showTimeline ? "bg-ora-signal-light text-ora-signal" : "text-muted-foreground hover:text-foreground"}`}
              style={{ fontSize: "10px", fontWeight: 500 }}
            >
              <Film size={10} />
              Timeline
            </button>
          </div>

          {/* Timeline */}
          <EditorTimeline visible={showTimeline} />
        </div>

        {/* ─── RIGHT: Properties / Chat ─── */}
        <div className="w-[260px] border-l bg-card flex-shrink-0 flex flex-col hidden lg:flex" style={{ borderColor: "var(--border)" }}>
          {/* Tabs */}
          <div className="flex items-center border-b px-1 h-9 flex-shrink-0" style={{ borderColor: "var(--border)" }}>
            {([
              { id: "chat" as RightPanelTab, label: "AI Chat", icon: MessageCircle },
              { id: "properties" as RightPanelTab, label: "Properties", icon: SlidersHorizontal },
            ]).map((tab) => {
              const Icon = tab.icon;
              const isActive = rightPanelTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRightPanelTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                    isActive ? "text-foreground bg-secondary/60" : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={{ fontSize: "11px", fontWeight: isActive ? 500 : 400 }}
                >
                  <Icon size={11} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            {rightPanelTab === "properties" && selectedProps ? (
              <PropertiesPanel props={selectedProps} />
            ) : rightPanelTab === "properties" && !selectedProps ? (
              <EmptyPropertiesPanel activeFormat={activeFormat} complianceScore={complianceScore} />
            ) : (
              <ChatHistoryPanel messages={chatMessages} isThinking={isThinking} scrollRef={chatScrollRef} />
            )}
          </div>
        </div>
      </div>

      {/* ═══════ BOTTOM: Quick Actions + Command Bar (the "SMS") ═══════ */}
      <div className="border-t bg-card flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        {/* Quick actions */}
        <div className="flex items-center gap-1.5 px-4 pt-2 pb-1.5 overflow-x-auto">
          <Wand2 size={11} className="text-muted-foreground flex-shrink-0" />
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => handleCommand(action.command)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-border-strong cursor-pointer transition-all flex-shrink-0"
                style={{ borderColor: "var(--border)", fontSize: "11px", fontWeight: 400 }}
              >
                <Icon size={10} />
                {action.label}
              </button>
            );
          })}
        </div>

        {/* Command input — the "SMS bar" */}
        <div className="px-4 pb-3 pt-1">
          <div
            className="flex items-center gap-2 rounded-xl border bg-background px-4 py-2.5 transition-all focus-within:border-ora-signal/40 focus-within:ring-2 focus-within:ring-ora-signal/10"
            style={{ borderColor: "var(--border)" }}
          >
            <Sparkles size={15} className="text-ora-signal flex-shrink-0" />
            <input
              ref={commandInputRef}
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCommand(); } }}
              placeholder="Describe what you want to change..."
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/40 min-w-0"
              style={{ fontSize: "14px", fontWeight: 400 }}
            />
            {isThinking ? (
              <div className="flex items-center gap-1.5 px-2">
                <motion.div
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-ora-signal"
                />
                <span style={{ fontSize: "11px", color: "var(--ora-signal)", fontWeight: 500 }}>Thinking...</span>
              </div>
            ) : (
              <button
                onClick={() => handleCommand()}
                disabled={!commandInput.trim()}
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:opacity-90"
                style={{ background: commandInput.trim() ? "var(--ora-signal)" : "var(--secondary)", color: commandInput.trim() ? "#fff" : "var(--muted-foreground)" }}
              >
                <ArrowUp size={15} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1">
            <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
              Press Enter to send — ORA's 15 agents handle the rest
            </span>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>
                <kbd className="px-1 py-0.5 rounded border bg-secondary/60 text-muted-foreground" style={{ fontSize: "9px", borderColor: "var(--border)" }}>Cmd+K</kbd>
                {" "}Focus
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────
   CHAT HISTORY PANEL (right sidebar)
   ────────────────────────────────── */

function ChatHistoryPanel({ messages, isThinking, scrollRef }: {
  messages: ChatMessage[];
  isThinking: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "agent" ? (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ora-signal flex-shrink-0" />
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--foreground)" }}>ORA</span>
                  <span style={{ fontSize: "9px", color: "var(--muted-foreground)" }}>{msg.agent}</span>
                  <span className="flex-1" />
                  <span style={{ fontSize: "8px", color: "var(--muted-foreground)" }}>{msg.timestamp}</span>
                </div>
                <p style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--foreground)", opacity: 0.85 }}>
                  {msg.text}
                </p>
              </div>
            ) : (
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground px-3 py-2 rounded-xl rounded-br-sm max-w-[90%]">
                  <p style={{ fontSize: "12px", lineHeight: 1.45 }}>{msg.text}</p>
                  <p className="text-right mt-0.5" style={{ fontSize: "8px", opacity: 0.5 }}>{msg.timestamp}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-ora-signal" />
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                  className="w-1 h-1 rounded-full bg-ora-signal"
                />
              ))}
            </div>
            <span style={{ fontSize: "10px", color: "var(--muted-foreground)" }}>Agents working...</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────
   EMPTY PROPERTIES STATE
   ────────────────────────────────── */

function EmptyPropertiesPanel({ activeFormat, complianceScore }: { activeFormat: FormatType; complianceScore: number }) {
  return (
    <div className="p-4">
      <div className="text-center py-6">
        <MousePointer2 size={20} className="mx-auto mb-3 text-muted-foreground/30" />
        <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
          Select an element to edit its properties
        </p>
      </div>

      <div className="border-t pt-4 mt-4" style={{ borderColor: "var(--border)" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
          Format
        </p>
        <div className="mt-2 flex items-center gap-2">
          {(() => {
            const f = formats.find((f) => f.id === activeFormat);
            if (!f) return null;
            const Icon = f.icon;
            return (
              <>
                <Icon size={14} className="text-ora-signal" />
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--foreground)" }}>{f.label}</span>
              </>
            );
          })()}
        </div>
      </div>

      <div className="border-t pt-4 mt-4" style={{ borderColor: "var(--border)" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
          Compliance
        </p>
        <div className="mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-ora-signal" style={{ fontSize: "24px", fontWeight: 500, letterSpacing: "-0.02em" }}>{complianceScore}</span>
            <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>/100</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full mt-2 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${complianceScore}%`, background: "var(--ora-signal)" }} />
          </div>
        </div>
      </div>

      <div className="border-t pt-4 mt-4" style={{ borderColor: "var(--border)" }}>
        <Link
          to="/studio/vault"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontSize: "12px" }}
        >
          <Shield size={13} />
          Open Brand Vault
        </Link>
      </div>
    </div>
  );
}

/* ──────────────────────────────────
   PROPERTIES PANEL
   ────────────────────────────────── */

function PropertiesPanel({ props }: { props: { type: string; label: string; font?: string; size?: number; color?: string; opacity?: number; width?: number; height?: number } }) {
  return (
    <div className="p-3 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="px-1.5 py-0.5 rounded text-ora-signal bg-ora-signal-light" style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase" }}>
            {props.type}
          </span>
          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--foreground)" }}>{props.label}</span>
        </div>
      </div>

      {(props.width || props.height) && (
        <PropertySection title="Transform">
          <div className="grid grid-cols-2 gap-2">
            {props.width && <PropertyInput label="W" value={props.width} suffix="px" />}
            {props.height && <PropertyInput label="H" value={props.height} suffix="px" />}
            <PropertyInput label="X" value={0} suffix="px" />
            <PropertyInput label="Y" value={0} suffix="px" />
            <PropertyInput label="R" value={0} suffix="deg" />
          </div>
        </PropertySection>
      )}

      {props.font && (
        <PropertySection title="Typography">
          <div className="space-y-2">
            <div className="bg-secondary/60 rounded-md px-2.5 py-1.5 flex items-center justify-between">
              <span style={{ fontSize: "11px", color: "var(--foreground)" }}>{props.font}</span>
              <ChevronDown size={10} className="text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <PropertyInput label="Size" value={props.size || 14} suffix="px" />
              <PropertyInput label="Height" value={1.5} suffix="" />
            </div>
            <div className="flex items-center gap-1">
              {[
                { icon: Bold, label: "Bold" },
                { icon: Italic, label: "Italic" },
                { icon: AlignLeft, label: "Left" },
                { icon: AlignCenter, label: "Center" },
                { icon: AlignRight, label: "Right" },
              ].map((a) => {
                const Icon = a.icon;
                return (
                  <button key={a.label} className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer" title={a.label}>
                    <Icon size={12} />
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <PropertyInput label="Spacing" value={0} suffix="px" />
              <PropertyInput label="Tracking" value={0} suffix="em" />
            </div>
          </div>
        </PropertySection>
      )}

      {props.color && (
        <PropertySection title="Fill">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded border" style={{ background: props.color, borderColor: "var(--border)" }} />
            <div className="flex-1 bg-secondary/60 rounded-md px-2.5 py-1.5">
              <span style={{ fontSize: "11px", color: "var(--foreground)", fontFamily: "monospace" }}>{props.color}</span>
            </div>
            <Palette size={12} className="text-muted-foreground" />
          </div>
        </PropertySection>
      )}

      <PropertySection title="Opacity">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-secondary rounded-full relative overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${props.opacity || 100}%`, background: "var(--ora-signal)" }} />
          </div>
          <span style={{ fontSize: "11px", color: "var(--foreground)", minWidth: 28, textAlign: "right" }}>{props.opacity || 100}%</span>
        </div>
      </PropertySection>

      <PropertySection title="Border">
        <div className="grid grid-cols-2 gap-2">
          <PropertyInput label="Width" value={0} suffix="px" />
          <PropertyInput label="Radius" value={0} suffix="px" />
        </div>
      </PropertySection>

      <PropertySection title="Shadow">
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 rounded border text-muted-foreground hover:text-foreground cursor-pointer" style={{ borderColor: "var(--border)", fontSize: "10px" }}>
            + Add shadow
          </button>
        </div>
      </PropertySection>

      {/* AI edit shortcut */}
      <PropertySection title="AI Edit">
        <div className="space-y-1.5">
          {["Rewrite this", "Make bolder", "Shorten"].map((cmd) => (
            <button
              key={cmd}
              className="w-full text-left px-2.5 py-1.5 rounded-md border text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer transition-colors"
              style={{ borderColor: "var(--border)", fontSize: "11px" }}
            >
              <Sparkles size={10} className="inline mr-1.5 text-ora-signal" />
              {cmd}
            </button>
          ))}
        </div>
      </PropertySection>
    </div>
  );
}

function PropertySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
      <p className="mb-2" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function PropertyInput({ label, value, suffix }: { label: string; value: number | string; suffix: string }) {
  return (
    <div className="flex items-center gap-1 bg-secondary/60 rounded-md px-2 py-1">
      <span style={{ fontSize: "9px", fontWeight: 500, color: "var(--muted-foreground)", minWidth: 12 }}>{label}</span>
      <input
        type="text"
        defaultValue={value}
        className="flex-1 bg-transparent border-none outline-none text-foreground min-w-0"
        style={{ fontSize: "11px", fontWeight: 400 }}
      />
      {suffix && <span style={{ fontSize: "9px", color: "var(--muted-foreground)" }}>{suffix}</span>}
    </div>
  );
}