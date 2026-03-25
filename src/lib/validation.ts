// Validation rules for auth inputs

export const EMAIL_MAX_LENGTH = 254;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const PASSWORD_MIN_LENGTH = 12;
// Cap at 128 chars to prevent hashing DoS attacks (Argon2 can be slow on very long inputs)
export const PASSWORD_MAX_LENGTH = 128;

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "root",
  "sys",
  "mod",
  "api",
  "www",
  "mail",
  "support",
  "help",
  "info",
  "null",
  "undefined",
  "test",
  "god",
  "gm",
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateEmail(email: unknown): ValidationResult {
  if (typeof email !== "string") return { valid: false, error: "Email must be a string." };
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { valid: false, error: "Email is required." };
  if (trimmed.length > EMAIL_MAX_LENGTH)
    return { valid: false, error: `Email must be at most ${EMAIL_MAX_LENGTH} characters.` };
  // Basic RFC-5322-inspired check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return { valid: false, error: "Invalid email address." };
  return { valid: true };
}

export function validateUsername(username: unknown): ValidationResult {
  if (typeof username !== "string") return { valid: false, error: "Username must be a string." };
  const trimmed = username.trim();
  if (!trimmed) return { valid: false, error: "Username is required." };
  if (trimmed.length < USERNAME_MIN_LENGTH)
    return { valid: false, error: `Username must be at least ${USERNAME_MIN_LENGTH} characters.` };
  if (trimmed.length > USERNAME_MAX_LENGTH)
    return { valid: false, error: `Username must be at most ${USERNAME_MAX_LENGTH} characters.` };
  if (!USERNAME_REGEX.test(trimmed))
    return { valid: false, error: "Username may only contain letters, numbers, and underscores." };
  if (RESERVED_USERNAMES.has(trimmed.toLowerCase()))
    return { valid: false, error: "That username is reserved. Please choose another." };
  return { valid: true };
}

export function validatePassword(password: unknown): ValidationResult {
  if (typeof password !== "string") return { valid: false, error: "Password must be a string." };
  if (!password) return { valid: false, error: "Password is required." };
  if (password.length < PASSWORD_MIN_LENGTH)
    return {
      valid: false,
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  if (password.length > PASSWORD_MAX_LENGTH)
    return {
      valid: false,
      error: `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
    };
  return { valid: true };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim();
}
