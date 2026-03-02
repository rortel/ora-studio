import { createAdminClient } from "@/lib/supabase/server";
import AdminUsersClient from "./client";

export default async function AdminUsersPage() {
  const admin = createAdminClient();
  const { data: users } = await admin
    .from("profiles")
    .select("id, email, credits, role, created_at, updated_at")
    .order("created_at", { ascending: false });

  return <AdminUsersClient users={users ?? []} />;
}
