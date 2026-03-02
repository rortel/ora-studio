"use client";

import { useState } from "react";
import { Search, ChevronUp, ChevronDown, Edit2, Check, X } from "lucide-react";
import { clsx } from "clsx";

interface User {
  id: string;
  email: string;
  credits: number;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminUsersClient({ users: initialUsers }: { users: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"created_at" | "credits">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCredits, setEditCredits] = useState(0);
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = users
    .filter((u) => u.email?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const mult = sortDir === "asc" ? 1 : -1;
      if (sortField === "credits") return (a.credits - b.credits) * mult;
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mult;
    });

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditCredits(user.credits);
    setEditRole(user.role ?? "client");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (userId: string) => {
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, credits: editCredits, role: editRole }),
    });

    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, credits: editCredits, role: editRole } : u
        )
      );
      setEditingId(null);
    }
    setSaving(false);
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (
      sortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />
    ) : null;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white font-bold text-xl">Utilisateurs ({users.length})</h1>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="bg-surface border border-border/40 text-white text-sm rounded-lg pl-8 pr-4 py-2 focus:outline-none focus:border-primary placeholder-zinc-600 w-56"
          />
        </div>
      </div>

      <div className="bg-surface border border-border/40 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-left text-zinc-500 px-4 py-3 font-medium">Email</th>
              <th className="text-left text-zinc-500 px-4 py-3 font-medium">Rôle</th>
              <th
                className="text-left text-zinc-500 px-4 py-3 font-medium cursor-pointer hover:text-white select-none"
                onClick={() => toggleSort("credits")}
              >
                <span className="flex items-center gap-1">
                  Crédits <SortIcon field="credits" />
                </span>
              </th>
              <th
                className="text-left text-zinc-500 px-4 py-3 font-medium cursor-pointer hover:text-white select-none"
                onClick={() => toggleSort("created_at")}
              >
                <span className="flex items-center gap-1">
                  Inscrit <SortIcon field="created_at" />
                </span>
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.id} className="border-b border-border/20 last:border-0 hover:bg-white/2 transition-colors">
                <td className="px-4 py-3 text-zinc-200">{user.email}</td>
                <td className="px-4 py-3">
                  {editingId === user.id ? (
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="bg-surface2 border border-border/40 text-white text-xs rounded px-2 py-1"
                    >
                      <option value="client">client</option>
                      <option value="admin">admin</option>
                    </select>
                  ) : (
                    <span className={clsx(
                      "text-xs px-2 py-0.5 rounded-full",
                      user.role === "admin" ? "bg-red-500/15 text-red-400" : "bg-zinc-700 text-zinc-400"
                    )}>
                      {user.role ?? "client"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === user.id ? (
                    <input
                      type="number"
                      value={editCredits}
                      onChange={(e) => setEditCredits(Number(e.target.value))}
                      className="bg-surface2 border border-border/40 text-white text-xs rounded px-2 py-1 w-20"
                      min={0}
                    />
                  ) : (
                    <span className="text-zinc-300">{user.credits}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(user.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-3">
                  {editingId === user.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveEdit(user.id)}
                        disabled={saving}
                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <Check size={15} />
                      </button>
                      <button onClick={cancelEdit} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(user)}
                      className="text-zinc-600 hover:text-white transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
