function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toLower(value) {
  return asText(value).toLowerCase();
}

export function getSupabaseConfig() {
  const url = asText(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const anonKey = asText(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const serviceRoleKey = asText(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const apiKey = serviceRoleKey || anonKey;
  return {
    url,
    anonKey,
    serviceRoleKey,
    apiKey,
    enabled: Boolean(url && apiKey),
  };
}

export function getBearerToken(req) {
  const header = asText(req.headers.authorization || req.headers.Authorization);
  if (!header) return "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export async function getSupabaseUserFromToken(accessToken) {
  const cfg = getSupabaseConfig();
  if (!cfg.enabled) {
    return { ok: false, error: "Supabase environment not configured" };
  }
  if (!asText(accessToken)) {
    return { ok: false, error: "Missing bearer token" };
  }

  try {
    const response = await fetch(`${cfg.url}/auth/v1/user`, {
      method: "GET",
      headers: {
        apikey: cfg.apiKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.id) {
      return {
        ok: false,
        error: asText(payload?.msg || payload?.error_description || payload?.error) || "Invalid session token",
      };
    }

    return { ok: true, user: payload };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Token verification failed",
    };
  }
}

export function parseAdminEmails() {
  const raw = asText(process.env.ADMIN_EMAILS);
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((entry) => toLower(entry))
      .filter(Boolean),
  );
}

export function isAdminEmail(email) {
  const admins = parseAdminEmails();
  if (!admins.size) return false;
  return admins.has(toLower(email));
}

export function normalizeEmail(email) {
  return toLower(email);
}

export function nowIso() {
  return new Date().toISOString();
}

export function profileKey(userId) {
  return `ora:user:${userId}`;
}

export const USER_INDEX_KEY = "ora:users:index";
export const ADMIN_LOGS_KEY = "ora:admin:logs";
