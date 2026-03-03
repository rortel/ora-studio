/**
 * Cookie chunking utilities for Supabase SSR.
 *
 * Vercel limits total request headers to 16KB. Supabase JWTs can be 4–8KB,
 * so we split them into 3000-byte chunks and reassemble on read.
 */

export const CHUNK_SIZE = 3000;

/** Read a (possibly chunked) cookie value from a flat list of cookies. */
export function getChunkedCookie(
  name: string,
  all: { name: string; value: string }[]
): string | undefined {
  const main = all.find((c) => c.name === name);
  if (!main) return undefined;

  const parts = [main.value];
  for (let i = 1; ; i++) {
    const chunk = all.find((c) => c.name === `${name}.${i}`);
    if (!chunk) break;
    parts.push(chunk.value);
  }
  return parts.join("");
}

/** Produce the list of {name,value,options} cookies needed to store a value in chunks. */
export function buildChunkedCookies(
  name: string,
  value: string,
  options: Record<string, unknown>
): { name: string; value: string; options: Record<string, unknown> }[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  return chunks.map((chunk, i) => ({
    name: i === 0 ? name : `${name}.${i}`,
    value: chunk,
    options,
  }));
}

/** Names of all chunk cookies for a given base name (to clean up stale chunks). */
export function staleChunkNames(
  name: string,
  keepCount: number,
  maxChunks = 10
): string[] {
  const stale: string[] = [];
  for (let i = keepCount; i <= maxChunks; i++) {
    stale.push(`${name}.${i}`);
  }
  return stale;
}
