import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Verify requester is admin
  const admin = createAdminClient();
  const { data: requester } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  const isAdmin = requester?.role === "admin" || adminEmails.includes(user.email ?? "");
  if (!isAdmin) return new Response("Forbidden", { status: 403 });

  const { id, credits, role } = await request.json();
  if (!id) return new Response("Missing id", { status: 400 });

  const { data, error } = await admin
    .from("profiles")
    .update({ credits, role, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });

  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
}
