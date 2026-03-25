"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [serverError, setServerError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    if (!email.trim()) {
      setServerError("Email is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
      } else {
        setSubmitted(true);
      }
    } catch {
      setServerError("Network error. Please try again.");
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Check your email</h1>
          <p className="subtitle">
            If an account exists for <strong style={{ color: "#e0e0e0" }}>{email}</strong>,
            a password reset link has been sent. Check your inbox and spam folder.
          </p>
          <p style={{ fontSize: "13px", color: "#666", marginTop: "16px" }}>
            The link expires in 1 hour.
          </p>
          <div className="auth-footer">
            <Link href="/login">Back to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Forgot Password</h1>
        <p className="subtitle">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        {serverError && <div className="alert alert-error">{serverError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Sending…" : "Send Reset Link"}
          </button>
        </form>

        <div className="auth-footer">
          <Link href="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}
