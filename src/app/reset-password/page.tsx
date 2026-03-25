"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "@/lib/validation";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Invalid Link</h1>
          <p className="subtitle">This password reset link is missing a token.</p>
          <div className="auth-footer">
            <Link href="/forgot-password">Request a new link</Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    if (!password) {
      setServerError("Password is required.");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setServerError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      setServerError(`Password must be at most ${PASSWORD_MAX_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setServerError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Reset failed. Please try again.");
        setLoading(false);
      } else {
        router.push("/login");
      }
    } catch {
      setServerError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Reset Password</h1>
        <p className="subtitle">Enter a new password for your account.</p>

        {serverError && <div className="alert alert-error">{serverError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              autoFocus
            />
            <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
              Minimum {PASSWORD_MIN_LENGTH} characters
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Resetting…" : "Reset Password"}
          </button>
        </form>

        <div className="auth-footer">
          <Link href="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-container"><p>Loading…</p></div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
