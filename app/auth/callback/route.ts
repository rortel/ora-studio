import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  getChunkedCookie,
  buildChunkedCookies,
  staleChunkNames,
  CHUNK_SIZE,
} from "@/lib/supabase/cookie-chunks";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/studio";

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
