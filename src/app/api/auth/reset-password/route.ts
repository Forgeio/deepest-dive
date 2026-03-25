import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { validatePassword } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";

const RATE_LIMIT = { maxRequests: 10, windowMs: 15 * 60 * 1000 };

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed, retryAfterMs } = checkRateLimit(`reset-password:${ip}`, RATE_LIMIT);
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

  const { token, password } = body as Record<string, unknown>;

  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
  }

  const passwordResult = validatePassword(password);
  if (!passwordResult.valid) {
    return NextResponse.json({ error: passwordResult.error }, { status: 400 });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const reset = await prisma.passwordReset.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  const invalidError = NextResponse.json(
    { error: "This reset link is invalid or has expired." },
    { status: 400 }
  );

  if (!reset) return invalidError;
  if (reset.usedAt) return invalidError;
  if (reset.expiresAt < new Date()) {
    await prisma.passwordReset.delete({ where: { id: reset.id } }).catch(() => {});
    return invalidError;
  }

  const passwordHash = await argon2.hash(password as string, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });

  // Update password, mark token used, and invalidate all sessions atomically
  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
    // Sign out all existing sessions for security
    prisma.session.deleteMany({ where: { userId: reset.userId } }),
  ]);

  return NextResponse.json(
    { message: "Password reset successfully. You can now log in." },
    { status: 200 }
  );
}
