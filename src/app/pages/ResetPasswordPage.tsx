import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { PulseIcon } from "../components/PulseMotif";
import { useAuth } from "../lib/auth";

function isStrongPassword(value: string) {
  return value.length >= 8 && /[A-Z]/.test(value) && /\d/.test(value);
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { enabled, updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canSubmit = useMemo(() => Boolean(password && confirmPassword), [password, confirmPassword]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setNotice("");

    if (!enabled) {
      setError("Authentication is not configured.");
      return;
    }
    if (!isStrongPassword(password)) {
      setError("Password must be at least 8 characters, with 1 uppercase letter and 1 number.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await updatePassword(password);
      if (!result.ok) {
        setError(result.error || "Unable to update password.");
        return;
      }
      setNotice("Password updated. Redirecting to login...");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 900);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[400px]">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <PulseIcon size={32} />
          <span className="text-foreground" style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.02em" }}>
            ORA Studio
          </span>
        </div>

        <div className="bg-card border border-border rounded-xl p-7">
          <h1 className="text-foreground text-center mb-2" style={{ fontSize: "22px", fontWeight: 500, letterSpacing: "-0.02em" }}>
            Set a new password
          </h1>
          <p className="text-muted-foreground text-center mb-7" style={{ fontSize: "14px" }}>
            Choose a strong password to secure your account.
          </p>

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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-foreground mb-1.5" style={{ fontSize: "13px", fontWeight: 450 }}>
                New password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full bg-input-background border border-border rounded-lg px-3.5 py-2.5 pr-10 text-foreground placeholder:text-muted-foreground/40"
                  style={{ fontSize: "14px" }}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-foreground mb-1.5" style={{ fontSize: "13px", fontWeight: 450 }}>
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full bg-input-background border border-border rounded-lg px-3.5 py-2.5 pr-10 text-foreground placeholder:text-muted-foreground/40"
                  style={{ fontSize: "14px" }}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowConfirm((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-70"
              style={{ fontSize: "14px", fontWeight: 500 }}
            >
              {submitting ? "Updating..." : "Update password"}
              <ArrowRight size={15} />
            </button>
          </form>

          <p className="text-center mt-6 text-muted-foreground" style={{ fontSize: "14px" }}>
            <Link to="/login" className="text-ora-signal hover:underline" style={{ fontWeight: 500 }}>
              Back to login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

