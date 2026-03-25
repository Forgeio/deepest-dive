import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { validateEmail, normalizeEmail } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";

const RATE_LIMIT = { maxRequests: 10, windowMs: 15 * 60 * 1000 }; // 10 per 15 min
const MAX_ATTEMPTS = 10;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed, retryAfterMs } = checkRateLimit(`verify:${ip}`, RATE_LIMIT);
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

  const { email, code } = body as Record<string, unknown>;

  const emailResult = validateEmail(email);
  if (!emailResult.valid) return NextResponse.json({ error: emailResult.error }, { status: 400 });

  if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Invalid verification code format." }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(email as string);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { emailVerification: true },
  });

  // Generic error to prevent enumeration
  const genericError = "Invalid or expired verification code.";

  if (!user) return NextResponse.json({ error: genericError }, { status: 400 });
  if (user.emailVerifiedAt)
    return NextResponse.json({ message: "Email already verified." }, { status: 200 });

  const verification = user.emailVerification;
  if (!verification) return NextResponse.json({ error: genericError }, { status: 400 });

  if (verification.expiresAt < new Date()) {
    return NextResponse.json({ error: "Verification code has expired. Please request a new one." }, { status: 400 });
  }

  if (verification.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many failed attempts. Please request a new verification code." },
      { status: 400 }
    );
  }

  // Increment attempt counter first
  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: { attempts: { increment: 1 } },
  });

  const codeHash = crypto.createHash("sha256").update(code).digest("hex");

  // Constant-time comparison
  const expectedHash = Buffer.from(verification.codeHash, "hex");
  const actualHash = Buffer.from(codeHash, "hex");
  const match =
    expectedHash.length === actualHash.length &&
    crypto.timingSafeEqual(expectedHash, actualHash);

  if (!match) {
    return NextResponse.json({ error: genericError }, { status: 400 });
  }

  // Mark user as verified and delete verification record
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerification.delete({ where: { id: verification.id } }),
  ]);

  return NextResponse.json({ message: "Email verified successfully." }, { status: 200 });
}
