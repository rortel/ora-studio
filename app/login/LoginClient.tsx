"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { PulseIcon } from "@/components/landing/PulseMotif";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginClient() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setError("Impossible de se connecter avec Google");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/studio");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${location.origin}/studio` },
        });
        if (error) throw error;
        setMessage("Vérifiez votre email pour confirmer votre compte.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue";
      if (msg.includes("Invalid login credentials")) {
        setError("Email ou mot de passe incorrect");
      } else if (msg.includes("User already registered")) {
        setError("Un compte existe déjà avec cet email");
      } else if (msg.includes("Password should be at least")) {
        setError("Le mot de passe doit faire au moins 6 caractères");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <PulseIcon size={40} />
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
            ORA Studio
          </h1>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginTop: "4px" }}>
            Your Brand. Amplified.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{ background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.05)" }}
        >
          {/* Tabs */}
          <div
            className="flex rounded-lg p-0.5 mb-6"
            style={{ background: "var(--secondary)" }}
          >
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className="flex-1 py-1.5 rounded-md transition-all"
                style={{
                  fontSize: "13px",
                  fontWeight: mode === m ? 500 : 400,
                  color: mode === m ? "var(--foreground)" : "var(--muted-foreground)",
                  background: mode === m ? "var(--card)" : "transparent",
                  boxShadow: mode === m ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                {m === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "6px" }}>
                Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-3" style={{ color: "var(--muted-foreground)" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg outline-none transition-colors"
                  style={{
                    fontSize: "14px",
                    background: "var(--input-background)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--ora-signal)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--muted-foreground)", display: "block", marginBottom: "6px" }}>
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-3" style={{ color: "var(--muted-foreground)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Min. 6 caractères" : "••••••••"}
                  required
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg outline-none transition-colors"
                  style={{
                    fontSize: "14px",
                    background: "var(--input-background)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--ora-signal)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 transition-colors"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: "rgba(212,24,61,0.06)", border: "1px solid rgba(212,24,61,0.15)", color: "var(--destructive)", fontSize: "13px" }}
              >
                {error}
              </div>
            )}

            {message && (
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", color: "#16a34a", fontSize: "13px" }}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ fontSize: "14px", fontWeight: 500, background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                mode === "login" ? "Se connecter" : "Créer mon compte"
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>ou</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full py-2.5 rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2.5"
            style={{
              fontSize: "14px",
              fontWeight: 500,
              background: "var(--card)",
              border: "1px solid var(--border-strong)",
              color: "var(--foreground)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
          >
            {googleLoading ? (
              <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
              <><GoogleIcon />Continuer avec Google</>
            )}
          </button>

          {mode === "register" && (
            <p className="text-center mt-4" style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
              100 crédits offerts à l&apos;inscription.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
