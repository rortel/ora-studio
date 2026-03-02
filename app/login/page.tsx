"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sparkles, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { clsx } from "clsx";

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

export default function LoginPage() {
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
      // Translate common Supabase errors
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
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
            <Sparkles size={22} className="text-white" />
          </div>
          <h1 className="text-white font-bold text-2xl tracking-tight">Ora Studio</h1>
          <p className="text-zinc-500 text-sm mt-1">Générez. Créez. Innovez.</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border/50 rounded-2xl p-6">
          {/* Tabs */}
          <div className="flex rounded-lg bg-surface2 p-0.5 mb-6">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={clsx(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                mode === "login" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Connexion
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className={clsx(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                mode === "register" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Inscription
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-zinc-400 text-xs mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-3 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  required
                  className="w-full bg-surface2 border border-border/40 text-white text-sm rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-primary placeholder-zinc-600 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-zinc-400 text-xs mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-3 text-zinc-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Min. 6 caractères" : "••••••••"}
                  required
                  className="w-full bg-surface2 border border-border/40 text-white text-sm rounded-lg pl-9 pr-10 py-2.5 focus:outline-none focus:border-primary placeholder-zinc-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Success message */}
            {message && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg px-3 py-2">
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 rounded-lg text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /></>
              ) : (
                mode === "login" ? "Se connecter" : "Créer mon compte"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border/40" />
            <span className="text-zinc-600 text-xs">ou</span>
            <div className="flex-1 h-px bg-border/40" />
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full bg-surface2 hover:bg-white/5 border border-border/40 text-white font-medium py-2.5 rounded-lg text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
          >
            {googleLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><GoogleIcon />Continuer avec Google</>
            )}
          </button>

          {mode === "register" && (
            <p className="text-zinc-600 text-xs text-center mt-4">
              Vous recevrez 100 crédits gratuits à l&apos;inscription.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
