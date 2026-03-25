import { cookies } from "next/headers";

const CSRF_COOKIE = "csrf_token";

export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CSRF_COOKIE)?.value;
  if (existing) return existing;

  // Generate a new token
  const token = generateToken();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: false, // Must be readable by JS to put in header
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return token;
}

export async function validateCsrfToken(requestToken: string | null): Promise<boolean> {
  if (!requestToken) return false;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  if (!cookieToken) return false;
  // Constant-time comparison
  return timingSafeEqual(requestToken, cookieToken);
}

function generateToken(): string {
  const arr = new Uint8Array(32);
  // Use crypto.getRandomValues in edge/browser or crypto.randomBytes in Node
  if (typeof globalThis.crypto !== "undefined" && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(arr);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomBytes } = require("crypto");
    const buf = randomBytes(32) as Buffer;
    buf.copy(Buffer.from(arr.buffer));
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
