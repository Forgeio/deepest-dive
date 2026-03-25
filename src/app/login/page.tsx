"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    if (!email.trim() || !password) {
      setServerError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await res.json();
      if (res.status === 403) {
        router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        return;
      }
      if (!res.ok) {
        setServerError(data.error ?? "Login failed. Please try again.");
        setLoading(false);
      } else {
        router.refresh();
        router.push("/account");
      }
    } catch {
      setServerError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Login</h1>
        <p className="subtitle">Welcome back, adventurer.</p>

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
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="form-group-inline">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="rememberMe">Remember me for 30 days</label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>

        <div className="auth-footer">
          <Link href="/forgot-password">Forgot password?</Link>
          {" · "}
          Don&apos;t have an account? <Link href="/register">Register</Link>
        </div>
      </div>
    </div>
  );
}
