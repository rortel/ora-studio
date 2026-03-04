"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "clsx";
import {
  Sparkles, Code2, ImageIcon, Video, LogOut, LayoutDashboard,
  Bot, Shield, Settings, Clapperboard, CreditCard, Music, Frame, GitBranch, RefreshCcw,
} from "lucide-react";
import { PulseIcon } from "./landing/PulseMotif";

const NAV_ITEMS = [
  { href: "/studio", label: "Command Center", icon: LayoutDashboard, exact: true },
  { href: "/studio/chat", label: "Agrégateur IA", icon: Bot },
  { href: "/studio/text", label: "Texte", icon: Sparkles },
  { href: "/studio/code", label: "Code", icon: Code2 },
  { href: "/studio/image", label: "Image", icon: ImageIcon },
  { href: "/studio/video", label: "Vidéo", icon: Video },
  { href: "/studio/audio", label: "Audio", icon: Music },
];

const BRAND_ITEMS = [
  { href: "/studio/vault", label: "Brand Vault", icon: Shield, studioOnly: true },
  { href: "/studio/canvas", label: "Table de montage", icon: Frame, studioOnly: true },
  { href: "/studio/production", label: "Asset Builder", icon: Clapperboard, studioOnly: false },
  { href: "/studio/flows", label: "Flows", icon: GitBranch, studioOnly: false },
  { href: "/studio/remix", label: "Brand Remix", icon: RefreshCcw, studioOnly: false },
];

const PLAN_LABELS: Record<string, string> = {
  trial: "Essai",
  generate: "Generate",
  studio: "Studio",
};

const PLAN_COLORS: Record<string, string> = {
  trial: "var(--muted-foreground)",
  generate: "var(--ora-signal)",
  studio: "#8b5cf6",
};

const PLAN_BG: Record<string, string> = {
  trial: "var(--secondary)",
  generate: "var(--ora-signal-light)",
  studio: "rgba(139,92,246,0.1)",
};

interface SidebarProps {
  credits: number;
  email: string;
  role?: string | null;
  plan?: string | null;
}

export default function Sidebar({ credits, email, role, plan = "trial" }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const maxCredits = plan === "studio" ? 500 : plan === "generate" ? 200 : 50;

  return (
    <aside
      className="flex flex-col w-60 min-h-screen py-5 px-3 shrink-0"
      style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}
    >
      {/* Logo + Plan badge */}
      <div className="flex items-center justify-between px-3 mb-8">
        <div className="flex items-center gap-2.5">
          <PulseIcon size={22} />
          <span style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
            ORA
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full"
          style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", color: PLAN_COLORS[plan ?? "trial"], background: PLAN_BG[plan ?? "trial"] }}>
          {PLAN_LABELS[plan ?? "trial"]}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={clsx("flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors", !isActive && "hover:bg-[var(--secondary)]")}
              style={{ fontSize: "14px", fontWeight: isActive ? 500 : 400, color: isActive ? "var(--ora-signal)" : "var(--muted-foreground)", background: isActive ? "var(--ora-signal-light)" : undefined }}>
              <Icon size={16} style={{ color: isActive ? "var(--ora-signal)" : "var(--muted-foreground)", flexShrink: 0 }} />
              {label}
            </Link>
          );
        })}

        <div className="pt-4 pb-1 px-3">
          <span className="uppercase" style={{ fontSize: "10px", fontWeight: 500, color: "var(--muted-foreground)", letterSpacing: "0.1em" }}>
            Brand & Studio
          </span>
        </div>

        {BRAND_ITEMS.map(({ href, label, icon: Icon, studioOnly }) => {
          const isActive = pathname.startsWith(href);
          const locked = studioOnly && plan !== "studio";
          return (
            <Link key={href} href={href}
              className={clsx("flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors", !isActive && "hover:bg-[var(--secondary)]")}
              style={{ fontSize: "14px", fontWeight: isActive ? 500 : 400, color: isActive ? "var(--ora-signal)" : "var(--muted-foreground)", background: isActive ? "var(--ora-signal-light)" : undefined, opacity: locked ? 0.6 : 1 }}>
              <Icon size={16} style={{ color: isActive ? "var(--ora-signal)" : "var(--muted-foreground)", flexShrink: 0 }} />
              <span className="flex-1">{label}</span>
              {locked && (
                <span style={{ fontSize: "9px", fontWeight: 600, color: "#8b5cf6", background: "rgba(139,92,246,0.1)", padding: "1px 5px", borderRadius: 4 }}>
                  Studio
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Credits */}
      <div className="mt-4">
        <Link href="/studio/credits">
          <div className="rounded-xl px-4 py-3 mb-3 transition-all hover:opacity-80"
            style={{ background: "var(--secondary)", border: "1px solid var(--border)", cursor: "pointer" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Crédits
              </span>
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--foreground)" }}>{credits}</span>
                <CreditCard size={12} style={{ color: "var(--ora-signal)" }} />
              </div>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${Math.min((credits / Math.max(maxCredits, credits)) * 100, 100)}%`, background: "var(--ora-signal)" }} />
            </div>
            <div className="mt-1.5" style={{ fontSize: "10px", color: "var(--ora-signal)" }}>
              + Acheter des crédits
            </div>
          </div>
        </Link>

        {role === "admin" && (
          <Link href="/admin"
            className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg transition-colors hover:bg-red-50"
            style={{ fontSize: "12px", color: "var(--destructive)" }}>
            <Settings size={13} />
            Panel Admin
          </Link>
        )}

        <div className="flex items-center justify-between px-2 py-2" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="truncate max-w-[130px]" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
            {email}
          </span>
          <button onClick={handleLogout}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--secondary)]"
            style={{ color: "var(--muted-foreground)" }} title="Déconnexion">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
