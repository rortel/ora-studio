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
  Coins,
  LayoutDashboard,
  Bot,
  Shield,
  Settings,
  Clapperboard,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/studio", label: "Dashboard", icon: LayoutDashboard, exact: true },
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
    <aside className="flex flex-col w-60 min-h-screen bg-surface border-r border-border/50 py-6 px-3 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">Ora Studio</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={18} className={clsx(isActive ? "text-primary" : "text-zinc-500")} />
              {label}
            </Link>
          );
        })}

        {/* Brand & Production separator */}
        <div className="pt-3 pb-1 px-3">
          <span className="text-zinc-600 text-[10px] uppercase tracking-widest font-medium">Brand</span>
        </div>

        <Link
          href="/studio/vault"
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            pathname.startsWith("/studio/vault")
              ? "bg-primary/15 text-primary"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Shield size={18} className={clsx(pathname.startsWith("/studio/vault") ? "text-primary" : "text-zinc-500")} />
          Brand Vault
        </Link>

        <Link
          href="/studio/production"
          className={clsx(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
            pathname.startsWith("/studio/production")
              ? "bg-primary/15 text-primary"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Clapperboard size={18} className={clsx(pathname.startsWith("/studio/production") ? "text-primary" : "text-zinc-500")} />
          Production
        </Link>
      </nav>

      {/* Credits */}
      <div className="mt-4 mx-0">
        <div className="bg-surface2 rounded-lg px-3 py-3 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-zinc-400 text-xs">Crédits restants</span>
            <Coins size={14} className="text-yellow-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-white font-bold text-xl">{credits}</span>
            <span className="text-zinc-500 text-xs">crédits</span>
          </div>
          <div className="mt-2 h-1 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-violet-400 rounded-full transition-all"
              style={{ width: `${Math.min((credits / 100) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Admin link */}
        {(role === "admin") && (
          <Link
            href="/admin"
            className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Settings size={13} />
            Panel Admin
          </Link>
        )}

        {/* User + Logout */}
        <div className="flex items-center justify-between px-1">
          <span className="text-zinc-500 text-xs truncate max-w-[130px]">{email}</span>
          <button
            onClick={handleLogout}
            className="text-zinc-500 hover:text-red-400 transition-colors p-1 rounded"
            title="Déconnexion"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
