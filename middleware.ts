import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  buildChunkedCookies,
  getChunkedCookie,
  staleChunkNames,
  CHUNK_SIZE,
} from "@/lib/supabase/cookie-chunks";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  "";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        const all = request.cookies.getAll();
        // Reassemble chunked cookies so Supabase sees the full value
        const seen = new Set<string>();
        const result: { name: string; value: string }[] = [];

        for (const cookie of all) {
          // Skip chunk sub-keys (e.g. "sb-xxx.1", "sb-xxx.2")
          const baseMatch = cookie.name.match(/^(.+)\.\d+$/);
          const baseName = baseMatch ? baseMatch[1] : cookie.name;
          if (seen.has(baseName)) continue;
          seen.add(baseName);

          const full = getChunkedCookie(baseName, all);
          if (full !== undefined) {
            result.push({ name: baseName, value: full });
          }
        }
        return result;
      },

      setAll(cookiesToSet) {
        // Write each cookie value split into CHUNK_SIZE chunks
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          const chunks = buildChunkedCookies(name, value, options ?? {});
          chunks.forEach(({ name: n, value: v, options: o }) => {
            supabaseResponse.cookies.set(n, v, o);
          });
          // Delete stale extra chunks
          const keepCount = Math.ceil(value.length / CHUNK_SIZE);
          staleChunkNames(name, keepCount).forEach((staleName) => {
            supabaseResponse.cookies.delete(staleName);
          });
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect /studio and /admin routes
  if (
    (pathname.startsWith("/studio") || pathname.startsWith("/admin")) &&
    !user
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect logged-in users away from login page
  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/studio", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
