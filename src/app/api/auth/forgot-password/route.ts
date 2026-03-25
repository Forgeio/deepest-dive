import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { validateEmail, normalizeEmail } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendPasswordResetEmail } from "@/lib/email";

const RATE_LIMIT = { maxRequests: 3, windowMs: 15 * 60 * 1000 }; // 3 per 15 min
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

// Generic response to prevent account enumeration
const genericSuccess = {
  message: "If an account with that email exists, a password reset link has been sent.",
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed, retryAfterMs } = checkRateLimit(`forgot-password:${ip}`, RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
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

  const { email } = body as Record<string, unknown>;

  const emailResult = validateEmail(email);
  if (!emailResult.valid) return NextResponse.json({ error: emailResult.error }, { status: 400 });

  const normalizedEmail = normalizeEmail(email as string);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { passwordResets: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  // Always return generic success to prevent enumeration
  if (!user || !user.emailVerifiedAt) {
    return NextResponse.json(genericSuccess, { status: 200 });
  }

  // Enforce resend cooldown using most recent reset record
  const latest = user.passwordResets[0];
  if (latest && !latest.usedAt) {
    const age = Date.now() - new Date(latest.createdAt).getTime();
    if (age < RESEND_COOLDOWN_MS) {
      // Still return generic success, don't leak timing info
      return NextResponse.json(genericSuccess, { status: 200 });
    }
  }

  // Invalidate any existing unused tokens for this user
  await prisma.passwordReset.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  // Generate a secure random token
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  await prisma.passwordReset.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const appUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  sendPasswordResetEmail(normalizedEmail, resetUrl).catch((err) => {
    console.error("Failed to send password reset email:", err);
  });

  return NextResponse.json(genericSuccess, { status: 200 });
}
