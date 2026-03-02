import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Sparkles, Code2, ImageIcon, Video, ArrowRight, Bot } from "lucide-react";

const TOOLS = [
  {
    href: "/studio/chat",
    label: "Agrégateur IA",
    desc: "Chat avec GPT-4o, Claude, Gemini, Mistral. Mode Multi-IA pour comparer jusqu'à 3 modèles en parallèle.",
    icon: Bot,
    cost: "1–3 crédits",
    color: "from-primary/20 to-primary/5",
    border: "border-primary/20",
    iconColor: "text-primary",
  },
  {
    href: "/studio/text",
    label: "Génération Texte",
    desc: "Créez articles, résumés, emails et bien plus avec Mistral Large.",
    icon: Sparkles,
    cost: "1 crédit",
    color: "from-violet-500/20 to-violet-500/5",
    border: "border-violet-500/20",
    iconColor: "text-violet-400",
  },
  {
    href: "/studio/code",
    label: "Génération Code",
    desc: "Générez du code propre et documenté dans tous les langages avec Codestral.",
    icon: Code2,
    cost: "2 crédits",
    color: "from-blue-500/20 to-blue-500/5",
    border: "border-blue-500/20",
    iconColor: "text-blue-400",
  },
  {
    href: "/studio/image",
    label: "Génération Image",
    desc: "Créez des images époustouflantes avec FLUX via Fal AI.",
    icon: ImageIcon,
    cost: "5 crédits",
    color: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  {
    href: "/studio/video",
    label: "Génération Vidéo",
    desc: "Générez des clips vidéo IA avec MiniMax et WAN via Replicate.",
    icon: Video,
    cost: "20 crédits",
    color: "from-rose-500/20 to-rose-500/5",
    border: "border-rose-500/20",
    iconColor: "text-rose-400",
  },
];

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Recent generations
  const admin = createAdminClient();
  const { data: recent } = await admin
    .from("generations")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">
          Bonjour 👋
        </h1>
        <p className="text-zinc-400">
          Que voulez-vous créer aujourd&apos;hui ?
        </p>
      </div>

      {/* Tool cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {TOOLS.map(({ href, label, desc, icon: Icon, cost, color, border, iconColor }) => (
          <Link
            key={href}
            href={href}
            className={`group relative rounded-xl border ${border} bg-gradient-to-br ${color} p-5 hover:scale-[1.02] transition-all duration-200`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg bg-black/30 ${iconColor}`}>
                <Icon size={20} />
              </div>
              <span className="text-zinc-500 text-xs bg-black/30 px-2 py-1 rounded-full">
                {cost}
              </span>
            </div>
            <h2 className="text-white font-semibold mb-1">{label}</h2>
            <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
            <div className="flex items-center gap-1 mt-3 text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors">
              Ouvrir <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent generations */}
      {recent && recent.length > 0 && (
        <div>
          <h2 className="text-white font-semibold mb-4">Récentes générations</h2>
          <div className="space-y-2">
            {recent.map((gen) => (
              <div
                key={gen.id}
                className="flex items-center gap-3 bg-surface rounded-lg px-4 py-3 border border-border/30"
              >
                <span className="text-xs bg-surface2 text-zinc-400 px-2 py-0.5 rounded-full capitalize">
                  {gen.type}
                </span>
                <span className="text-zinc-300 text-sm truncate flex-1">
                  {gen.prompt}
                </span>
                <span className="text-zinc-600 text-xs shrink-0">
                  {new Date(gen.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
