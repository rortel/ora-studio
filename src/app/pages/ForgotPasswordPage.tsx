import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { PulseIcon } from "../components/PulseMotif";
import { useAuth } from "../lib/auth";

export function ForgotPasswordPage() {
  const { enabled, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setNotice("");
    if (!enabled) {
      setError("Authentication is not configured.");
      return;
    }
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await requestPasswordReset(email.trim());
      if (!result.ok) {
        setError(result.error || "Unable to send reset email.");
        return;
      }
      setNotice("Password reset email sent. Check your inbox.");
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
            Reset your password
          </h1>
          <p className="text-muted-foreground text-center mb-7" style={{ fontSize: "14px" }}>
            Enter your email and we&apos;ll send you a reset link.
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
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="w-full bg-input-background border border-border rounded-lg px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground/40"
                style={{ fontSize: "14px" }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-70"
              style={{ fontSize: "14px", fontWeight: 500 }}
            >
              {submitting ? "Sending..." : "Send reset link"}
              <ArrowRight size={15} />
            </button>
          </form>

          <p className="text-center mt-6 text-muted-foreground" style={{ fontSize: "14px" }}>
            Remembered your password?{" "}
            <Link to="/login" className="text-ora-signal hover:underline" style={{ fontWeight: 500 }}>
              Back to login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

