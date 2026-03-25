"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const emailParam = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    if (!email.trim()) {
      setServerError("Email is required.");
      return;
    }
    if (!code.trim()) {
      setServerError("Verification code is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Verification failed.");
        setLoading(false);
      } else {
        router.refresh();
        router.push("/login");
      }
    } catch {
      setServerError("Network error. Please try again.");
      setLoading(false);
    }
  }

  async function handleResend() {
    setServerError("");

    if (!email.trim()) {
      setServerError("Please enter your email.");
      return;
    }

    setResendLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Failed to resend code.");
      } else {
        setResendCooldown(60);
      }
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Verify Your Email</h1>
        <p className="subtitle">
          Enter the 6-digit code sent to your email address.
        </p>

        {serverError && <div className="alert alert-error">{serverError}</div>}

        <form onSubmit={handleVerify} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="code">Verification Code</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              style={{ letterSpacing: "4px", textAlign: "center", fontSize: "24px" }}
              autoComplete="one-time-code"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Verifying…" : "Verify Email"}
          </button>
        </form>

        <div className="divider" />

        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
            Didn&apos;t receive a code?
          </p>
          <button
            className="btn btn-secondary"
            onClick={handleResend}
            disabled={resendLoading || resendCooldown > 0}
            style={{ width: "100%" }}
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : resendLoading
              ? "Sending…"
              : "Resend Code"}
          </button>
        </div>

        <div className="auth-footer">
          <Link href="/register">Back to Register</Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="auth-container"><p>Loading…</p></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
