"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EMAIL_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "@/lib/validation";

interface FieldErrors {
  email?: string;
  username?: string;
  password?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  function validateClient(): FieldErrors {
    const errors: FieldErrors = {};
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) errors.email = "Email is required.";
    else if (emailTrimmed.length > EMAIL_MAX_LENGTH)
      errors.email = `Email must be at most ${EMAIL_MAX_LENGTH} characters.`;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed))
      errors.email = "Invalid email address.";

    const userTrimmed = username.trim();
    if (!userTrimmed) errors.username = "Username is required.";
    else if (userTrimmed.length < USERNAME_MIN_LENGTH)
      errors.username = `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
    else if (userTrimmed.length > USERNAME_MAX_LENGTH)
      errors.username = `Username must be at most ${USERNAME_MAX_LENGTH} characters.`;
    else if (!/^[a-zA-Z0-9_]+$/.test(userTrimmed))
      errors.username = "Username may only contain letters, numbers, and underscores.";

    if (!password) errors.password = "Password is required.";
    else if (password.length < PASSWORD_MIN_LENGTH)
      errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    else if (password.length > PASSWORD_MAX_LENGTH)
      errors.password = `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;

    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    setSuccessMsg("");

    const errors = validateClient();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Registration failed. Please try again.");
      } else {
        setSuccessMsg("Account created! Redirecting to email verification…");
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        }, 1500);
      }
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Create Account</h1>
        <p className="subtitle">Join Deepest Dive and begin your adventure.</p>

        {serverError && <div className="alert alert-error">{serverError}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldErrors.email ? "error" : ""}
              autoComplete="email"
              maxLength={EMAIL_MAX_LENGTH}
            />
            {fieldErrors.email && (
              <p className="field-error">{fieldErrors.email}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={fieldErrors.username ? "error" : ""}
              autoComplete="username"
              maxLength={USERNAME_MAX_LENGTH}
            />
            {fieldErrors.username && (
              <p className="field-error">{fieldErrors.username}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={fieldErrors.password ? "error" : ""}
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
            />
            {fieldErrors.password && (
              <p className="field-error">{fieldErrors.password}</p>
            )}
            <p style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>
              Minimum {PASSWORD_MIN_LENGTH} characters
            </p>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link href="/login">Login</Link>
        </div>
      </div>
    </div>
  );
}
