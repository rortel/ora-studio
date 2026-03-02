import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient, type Session, type User } from "@supabase/supabase-js";
import { clearAccessToken, setAccessToken } from "./authToken";

export type AuthProfile = {
  userId: string;
  email: string;
  fullName: string;
  company?: string;
  timezone?: string;
  language?: string;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
  isAdmin?: boolean;
  role: string;
  status: string;
  subscription: string;
  credits: number;
  creditsMonthly?: number;
  creditsPurchased?: number;
  campaignCount: number;
  pieceCount: number;
  organizationId?: string;
  organizationName?: string;
  teamId?: string;
};

type AuthActionResult = {
  ok: boolean;
  error?: string;
  needsEmailConfirmation?: boolean;
};

type AuthContextValue = {
  enabled: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  isAdmin: boolean;
  signIn: (params: { email: string; password: string }) => Promise<AuthActionResult>;
  signInWithGoogle: (nextPath?: string) => Promise<AuthActionResult>;
  signUp: (params: { email: string; password: string; fullName?: string }) => Promise<AuthActionResult>;
  requestPasswordReset: (email: string) => Promise<AuthActionResult>;
  updatePassword: (password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || "";
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || "";
const authEnabled = Boolean(supabaseUrl && supabaseAnonKey);

const supabase = authEnabled
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeProfile(input: unknown): AuthProfile | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  const userId = asText(value.userId);
  const email = asText(value.email);
  if (!userId || !email) return null;

  return {
    userId,
    email,
    fullName: asText(value.fullName),
    company: asText(value.company) || undefined,
    timezone: asText(value.timezone) || undefined,
    language: asText(value.language) || undefined,
    avatarUrl: asText(value.avatarUrl || value.avatar_url) || undefined,
    twoFactorEnabled: Boolean(value.twoFactorEnabled ?? value.two_factor_enabled),
    isAdmin: Boolean(value.isAdmin ?? value.is_admin),
    role: asText(value.role) || "client",
    status: asText(value.status) || "active",
    subscription: asText(value.subscription) || "Simple",
    credits: typeof value.credits === "number" ? value.credits : Number(value.credits) || 0,
    creditsMonthly:
      typeof value.creditsMonthly === "number"
        ? value.creditsMonthly
        : typeof value.credits_monthly === "number"
          ? value.credits_monthly
          : undefined,
    creditsPurchased:
      typeof value.creditsPurchased === "number"
        ? value.creditsPurchased
        : typeof value.credits_purchased === "number"
          ? value.credits_purchased
          : undefined,
    campaignCount: typeof value.campaignCount === "number" ? value.campaignCount : Number(value.campaignCount) || 0,
    pieceCount: typeof value.pieceCount === "number" ? value.pieceCount : Number(value.pieceCount) || 0,
    organizationId: asText(value.organizationId) || undefined,
    organizationName: asText(value.organizationName) || undefined,
    teamId: asText(value.teamId) || undefined,
  };
}

async function fetchProfile(accessToken: string) {
  const response = await fetch("/api/auth-sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: "sync" }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(asText(payload?.error) || "Unable to sync account");
  }
  return normalizeProfile(payload?.profile);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  const refreshProfile = async () => {
    if (!session?.access_token) return;
    try {
      const nextProfile = await fetchProfile(session.access_token);
      setProfile(nextProfile);
    } catch (_error) {
      // Keep session alive even if profile sync fails.
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        const nextSession = data.session ?? null;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        if (nextSession?.access_token) {
          setAccessToken(nextSession.access_token);
          try {
            const nextProfile = await fetchProfile(nextSession.access_token);
            if (mounted) setProfile(nextProfile);
          } catch (_error) {
            if (mounted) setProfile(null);
          }
        } else {
          clearAccessToken();
          setProfile(null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);

      if (nextSession?.access_token) {
        setAccessToken(nextSession.access_token);
        try {
          const nextProfile = await fetchProfile(nextSession.access_token);
          if (mounted) setProfile(nextProfile);
        } catch (_error) {
          if (mounted) setProfile(null);
        }
      } else {
        clearAccessToken();
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn: AuthContextValue["signIn"] = async ({ email, password }) => {
    if (!supabase) return { ok: false, error: "Supabase auth is not configured." };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };

    const nextSession = data.session ?? null;
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    if (nextSession?.access_token) {
      setAccessToken(nextSession.access_token);
      try {
        const nextProfile = await fetchProfile(nextSession.access_token);
        setProfile(nextProfile);
      } catch (_error) {
        setProfile(null);
      }
    }
    return { ok: true };
  };

  const signInWithGoogle: AuthContextValue["signInWithGoogle"] = async (nextPath) => {
    if (!supabase) return { ok: false, error: "Supabase auth is not configured." };
    const safeNext = asText(nextPath).startsWith("/") ? asText(nextPath) : "";
    const options: { redirectTo?: string } = {};
    if (safeNext) {
      options.redirectTo = `${window.location.origin}${safeNext}`;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const signUp: AuthContextValue["signUp"] = async ({ email, password, fullName }) => {
    if (!supabase) return { ok: false, error: "Supabase auth is not configured." };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || "",
        },
      },
    });
    if (error) return { ok: false, error: error.message };

    const nextSession = data.session ?? null;
    if (nextSession?.access_token) {
      setAccessToken(nextSession.access_token);
      setSession(nextSession);
      setUser(nextSession.user);
      try {
        const nextProfile = await fetchProfile(nextSession.access_token);
        setProfile(nextProfile);
      } catch (_error) {
        setProfile(null);
      }
    }

    return {
      ok: true,
      needsEmailConfirmation: !nextSession,
    };
  };

  const requestPasswordReset: AuthContextValue["requestPasswordReset"] = async (email) => {
    if (!supabase) return { ok: false, error: "Supabase auth is not configured." };
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(asText(email), { redirectTo });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const updatePassword: AuthContextValue["updatePassword"] = async (password) => {
    if (!supabase) return { ok: false, error: "Supabase auth is not configured." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    clearAccessToken();
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      enabled: authEnabled,
      loading,
      user,
      session,
      profile,
      isAdmin: Boolean(profile?.isAdmin),
      signIn,
      signInWithGoogle,
      signUp,
      requestPasswordReset,
      updatePassword,
      signOut,
      refreshProfile,
    }),
    [loading, user, session, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
