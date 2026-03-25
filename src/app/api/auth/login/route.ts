import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import { prisma } from "@/lib/db";
import { validateEmail, normalizeEmail } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  createSession,
  setSessionCookie,
  SESSION_COOKIE,
} from "@/lib/session";
import { cookies } from "next/headers";

const RATE_LIMIT = { maxRequests: 10, windowMs: 15 * 60 * 1000 }; // 10 per 15 min

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed, retryAfterMs } = checkRateLimit(`login:${ip}`, RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, password, rememberMe } = body as Record<string, unknown>;

  const emailResult = validateEmail(email);
  if (!emailResult.valid) return NextResponse.json({ error: emailResult.error }, { status: 400 });

  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email as string);

  // Generic error to prevent account enumeration
  const authError = NextResponse.json(
    { error: "Invalid email or password." },
    { status: 401 }
  );

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    // Perform dummy hash to prevent timing attacks
    await argon2.hash("dummy_password_to_prevent_timing", { type: argon2.argon2id });
    return authError;
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) return authError;

  if (!user.emailVerifiedAt) {
    return NextResponse.json(
      { error: "Please verify your email address before logging in." },
      { status: 403 }
    );
  }

  // Rotate session: delete existing session(s) for this user first
  const cookieStore = await cookies();
  const existingSessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (existingSessionId) {
    await prisma.session.delete({ where: { id: existingSessionId } }).catch(() => {});
  }

  const remember = rememberMe === true;
  const sessionId = await createSession(user.id, remember);
  await setSessionCookie(sessionId, remember);

  return NextResponse.json(
    { message: "Login successful.", username: user.username },
    { status: 200 }
  );
}
