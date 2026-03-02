import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Users, LayoutDashboard, Shield } from "lucide-react";

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check admin role
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const isAdmin = profile?.role === "admin" || adminEmails.includes(user.email ?? "");

  if (!isAdmin) redirect("/studio");

  return (
    <div className="flex min-h-screen bg-bg text-white">
      {/* Admin Sidebar */}
      <aside className="flex flex-col w-56 min-h-screen bg-surface border-r border-border/50 py-6 px-3 shrink-0">
        <div className="flex items-center gap-2 px-3 mb-2">
          <div className="w-7 h-7 rounded-lg bg-red-500/20 flex items-center justify-center">
            <Shield size={14} className="text-red-400" />
          </div>
          <span className="text-white font-bold text-sm">Admin</span>
        </div>
        <p className="text-zinc-600 text-xs px-3 mb-6">{user.email}</p>

        <nav className="flex-1 space-y-1">
          {ADMIN_NAV.map(({ href, label, icon: Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        <Link
          href="/studio"
          className="flex items-center gap-2 px-3 py-2 text-zinc-500 hover:text-white text-sm transition-colors"
        >
          ← Studio
        </Link>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
