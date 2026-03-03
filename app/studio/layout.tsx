import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("credits, role, plan")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar
        credits={profile?.credits ?? 0}
        email={user.email ?? ""}
        role={profile?.role}
        plan={profile?.plan ?? "trial"}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
