import { createAdminClient } from "@/lib/supabase/server";
import { Users, Zap, BarChart2 } from "lucide-react";

export default async function AdminDashboard() {
  const admin = createAdminClient();

  const [
    { count: userCount },
    { count: genCount },
    { data: recentUsers },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("generations").select("*", { count: "exact", head: true }),
    admin.from("profiles").select("id, email, credits, role, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const stats = [
    { label: "Utilisateurs", value: userCount ?? 0, icon: Users, color: "text-blue-400" },
    { label: "Générations", value: genCount ?? 0, icon: Zap, color: "text-yellow-400" },
    { label: "Taux actifs", value: `~${Math.min(Math.round(((genCount ?? 0) / Math.max(userCount ?? 1, 1)) * 10), 100)}%`, icon: BarChart2, color: "text-emerald-400" },
  ];

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-white font-bold text-2xl mb-8">Dashboard Admin</h1>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface border border-border/40 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm">{label}</span>
              <Icon size={16} className={color} />
            </div>
            <div className="text-white font-bold text-2xl">{value}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-3">
          Derniers inscrits
        </h2>
        <div className="bg-surface border border-border/40 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left text-zinc-500 px-4 py-3 font-medium">Email</th>
                <th className="text-left text-zinc-500 px-4 py-3 font-medium">Rôle</th>
                <th className="text-left text-zinc-500 px-4 py-3 font-medium">Crédits</th>
                <th className="text-left text-zinc-500 px-4 py-3 font-medium">Inscrit</th>
              </tr>
            </thead>
            <tbody>
              {(recentUsers ?? []).map((u) => (
                <tr key={u.id} className="border-b border-border/20 last:border-0">
                  <td className="px-4 py-3 text-zinc-200">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      u.role === "admin" ? "bg-red-500/15 text-red-400" : "bg-zinc-700 text-zinc-400"
                    }`}>
                      {u.role ?? "client"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{u.credits}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(u.created_at).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
