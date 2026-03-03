"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clsx } from "clsx";
import {
  Sparkles,
  Code2,
  ImageIcon,
  Video,
  LogOut,
  LayoutDashboard,
  Bot,
  Shield,
  Settings,
  Clapperboard,
} from "lucide-react";
import { PulseIcon } from "./landing/PulseMotif";

const NAV_ITEMS = [
  { href: "/studio", label: "Command Center", icon: LayoutDashboard, exact: true },
  { href: "/studio/chat", label: "Agrégateur IA", icon: Bot },
  { href: "/studio/text", label: "Texte", icon: Sparkles },
  { href: "/studio/code", label: "Code", icon: Code2 },
  { href: "/studio/image", label: "Image", icon: ImageIcon },
  { href: "/studio/video", label: "Vidéo", icon: Video },
];

interface SidebarProps {
  credits: number;
  email: string;
  role?: string | null;
}

export default function Sidebar({ credits, email, role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside
      className="flex flex-col w-60 min-h-screen py-5 px-3 shrink-0"
      style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <PulseIcon size={22} />
        <span style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
          ORA Studio
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx("flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors", !isActive && "hover:bg-[var(--secondary)]")}
              style={{
                fontSize: "14px",
                fontWeight: isActive ? 500 : 400,
                color: isActive ? "var(--ora-signal)" : "var(--muted-foreground)",
                background: isActive ? "var(--ora-signal-light)" : undefined,
              }}
            >
              <Icon size={16} style={{ color: isActive ? "var(--ora-signal)" : "var(--muted-foreground)", flexShrink: 0 }} />
              {label}
            </Link>
          );
        })}

        <div className="pt-4 pb-1 px-3">
          <span
            className="uppercase"
            style={{ fontSize: "10px", fontWeight: 500, color: "var(--muted-foreground)", letterSpacing: "0.1em" }}
          >
            Brand
          </span>
        </div>

        {[
          { href: "/studio/vault", label: "Brand Vault", icon: Shield },
          { href: "/studio/production", label: "Production", icon: Clapperboard },
        ].map(({ href, label, icon: Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx("flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors", !isActive && "hover:bg-[var(--secondary)]")}
              style={{
                fontSize: "14px",
                fontWeight: isActive ? 500 : 400,
                color: isActive ? "var(--ora-signal)" : "var(--muted-foreground)",
                background: isActive ? "var(--ora-signal-light)" : undefined,
              }}
            >
              <Icon size={16} style={{ color: isActive ? "var(--ora-signal)" : "var(--muted-foreground)", flexShrink: 0 }} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Credits */}
      <div className="mt-4">
        <div
          className="rounded-xl px-4 py-3 mb-3"
          style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Crédits
            </span>
            <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--foreground)" }}>{credits}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.min((credits / 100) * 100, 100)}%`, background: "var(--ora-signal)" }}
            />
          </div>
        </div>

        {role === "admin" && (
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg transition-colors hover:bg-red-50"
            style={{ fontSize: "12px", color: "var(--destructive)" }}
          >
            <Settings size={13} />
            Panel Admin
          </Link>
        )}

        <div className="flex items-center justify-between px-2 py-2" style={{ borderTop: "1px solid var(--border)" }}>
          <span className="truncate max-w-[130px]" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
            {email}
          </span>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--secondary)]"
            style={{ color: "var(--muted-foreground)" }}
            title="Déconnexion"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
