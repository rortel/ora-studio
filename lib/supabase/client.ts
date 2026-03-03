import { createBrowserClient } from "@supabase/ssr";
import {
  getChunkedCookie,
  buildChunkedCookies,
  staleChunkNames,
  CHUNK_SIZE,
} from "./cookie-chunks";

function parseBrowserCookies(): { name: string; value: string }[] {
  return document.cookie.split(";").map((c) => {
    const idx = c.indexOf("=");
    return {
      name: c.slice(0, idx).trim(),
      value: c.slice(idx + 1).trim(),
    };
  });
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const all = parseBrowserCookies();
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
              let cookie = `${n}=${v}; path=${(o as Record<string, string>)?.path ?? "/"}; SameSite=Lax`;
              if ((o as Record<string, number>)?.maxAge)
                cookie += `; max-age=${(o as Record<string, number>).maxAge}`;
              document.cookie = cookie;
            });
            const keepCount = Math.ceil(value.length / CHUNK_SIZE);
            staleChunkNames(name, keepCount).forEach((staleName) => {
              document.cookie = `${staleName}=; path=/; max-age=0`;
            });
          });
        },
      },
    }
  );
}
