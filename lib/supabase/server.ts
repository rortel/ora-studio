import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getChunkedCookie,
  buildChunkedCookies,
  staleChunkNames,
  CHUNK_SIZE,
} from "./cookie-chunks";

// Support both NEXT_PUBLIC_ (Next.js) and VITE_ (legacy) prefixes for Vercel compatibility
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          const all = cookieStore.getAll();
          const seen = new Set<string>();
          const result: { name: string; value: string }[] = [];
          for (const cookie of all) {
            const baseMatch = cookie.name.match(/^(.+)\.\d+$/);
            const baseName = baseMatch ? baseMatch[1] : cookie.name;
            if (seen.has(baseName)) continue;
            seen.add(baseName);
            const full = getChunkedCookie(baseName, all);
            if (full !== undefined) result.push({ name: baseName, value: full });
          }
          return result;
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const chunks = buildChunkedCookies(name, value, options ?? {});
              chunks.forEach(({ name: n, value: v, options: o }) => {
                cookieStore.set(n, v, o as Parameters<typeof cookieStore.set>[2]);
              });
              const keepCount = Math.ceil(value.length / CHUNK_SIZE);
              staleChunkNames(name, keepCount).forEach((staleName) => {
                cookieStore.delete(staleName);
              });
            });
          } catch {
            // Called from Server Component — cookies will be set by middleware
          }
        },
      },
    }
  );
}

// Admin client (bypasses RLS) — server-side only
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
