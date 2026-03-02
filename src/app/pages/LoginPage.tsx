import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { useLocation, useNavigate } from "react-router";
import { PulseIcon } from "../components/PulseMotif";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../lib/auth";

function safeNext(search: string) {
  const params = new URLSearchParams(search);
  const value = (params.get("next") || "").trim();
  if (!value.startsWith("/")) return "/dashboard";
  return value;
}

export function LoginPage() {
  const location = useLocation();
  const startsInSignup = location.pathname === "/signup" || new URLSearchParams(location.search).get("mode") === "signup";
  const [isSignUp, setIsSignUp] = useState(startsInSignup);
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const navigate = useNavigate();
  const nextPath = useMemo(() => safeNext(location.search), [location.search]);
  const { enabled, loading, user, signIn, signInWithGoogle, signUp } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate(nextPath, { replace: true });
    }
  }, [loading, user, navigate, nextPath]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setNotice("");

    if (!enabled) {
      setError("Authentication is not configured (missing Supabase env vars).");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    if (isSignUp && password.trim().length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        const result = await signUp({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
        });
        if (!result.ok) {
          setError(result.error || "Unable to create account.");
          return;
        }
        if (result.needsEmailConfirmation) {
          setNotice("Account created. Confirm your email, then sign in.");
          setIsSignUp(false);
          setPassword("");
          return;
        }
        navigate(nextPath, { replace: true });
        return;
      }

      const result = await signIn({ email: email.trim(), password });
      if (!result.ok) {
        setError(result.error || "Invalid credentials.");
        return;
      }
      navigate(nextPath, { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSubmitting) return;
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const result = await signInWithGoogle(nextPath);
      if (!result.ok) {
        setError(result.error || "Google sign-in failed.");
      } else {
        setNotice("Redirecting to Google...");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px]"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <PulseIcon size={32} />
          <span
            className="text-foreground"
            style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em' }}
          >
            ORA Studio
          </span>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-7" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.04)' }}>
          <h1
            className="text-foreground text-center mb-2"
            style={{ fontSize: '22px', fontWeight: 500, letterSpacing: '-0.02em' }}
          >
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-muted-foreground text-center mb-7" style={{ fontSize: '14px' }}>
            {isSignUp
              ? "Start your 14-day free trial. No credit card."
              : "Sign in to your ORA Studio account."}
          </p>

          {/* Google sign in */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2.5 border border-border py-2.5 rounded-lg text-foreground hover:bg-secondary transition-colors mb-5 cursor-pointer"
            style={{ fontSize: '14px', fontWeight: 450 }}
            onClick={() => void handleGoogleSignIn()}
            disabled={isSubmitting}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground" style={{ fontSize: '12px' }}>or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-300/40 bg-red-500/10 px-3 py-2">
              <p className="text-red-500" style={{ fontSize: "12px" }}>
                {error}
              </p>
            </div>
          )}

          {notice && (
            <div className="mb-4 rounded-md border border-ora-signal/40 bg-ora-signal-light px-3 py-2">
              <p className="text-ora-signal" style={{ fontSize: "12px" }}>
                {notice}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-foreground mb-1.5" style={{ fontSize: '13px', fontWeight: 450 }}>
                  Full name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Jane Smith"
                  className="w-full bg-input-background border border-border rounded-lg px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground/40"
                  style={{ fontSize: '14px' }}
                />
              </div>
            )}
            <div>
              <label className="block text-foreground mb-1.5" style={{ fontSize: '13px', fontWeight: 450 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-input-background border border-border rounded-lg px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground/40"
                style={{ fontSize: '14px' }}
              />
            </div>
            <div>
              <label className="block text-foreground mb-1.5" style={{ fontSize: '13px', fontWeight: 450 }}>
                Password
              </label>
              <div className="relative">
                <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                  placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
                  className="w-full bg-input-background border border-border rounded-lg px-3.5 py-2.5 pr-10 text-foreground placeholder:text-muted-foreground/40"
                  style={{ fontSize: '14px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
              style={{ fontSize: '14px', fontWeight: 500 }}
            >
              {isSubmitting ? "Please wait..." : isSignUp ? "Create account" : "Sign in"}
              <ArrowRight size={15} />
            </button>
          </form>

          {!isSignUp && (
            <p className="text-center mt-4">
              <a href="/forgot-password" className="text-ora-signal hover:underline" style={{ fontSize: '13px' }}>
                Forgot password?
              </a>
            </p>
          )}
        </div>

        {/* Toggle */}
        <p className="text-center mt-6 text-muted-foreground" style={{ fontSize: '14px' }}>
          {isSignUp ? "Already have an account?" : "Don't have an account?"}
          {" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-ora-signal hover:underline cursor-pointer"
            style={{ fontSize: '14px', fontWeight: 500 }}
          >
            {isSignUp ? "Sign in" : "Start free trial"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
