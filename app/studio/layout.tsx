import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCredits } from "@/lib/credits";
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
  const [credits, { data: profile }] = await Promise.all([
    getCredits(user.id),
    admin.from("profiles").select("role").eq("id", user.id).single(),
  ]);

  return (
    <div className="flex min-h-screen bg-bg text-white">
      <Sidebar credits={credits} email={user.email ?? ""} role={profile?.role} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
