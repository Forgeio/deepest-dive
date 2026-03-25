import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { validateEmail, normalizeEmail } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendVerificationEmail } from "@/lib/email";

const RATE_LIMIT = { maxRequests: 3, windowMs: 15 * 60 * 1000 }; // 3 per 15 min
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed, retryAfterMs } = checkRateLimit(`resend:${ip}`, RATE_LIMIT);
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

  const { email } = body as Record<string, unknown>;

  const emailResult = validateEmail(email);
  if (!emailResult.valid) return NextResponse.json({ error: emailResult.error }, { status: 400 });

  const normalizedEmail = normalizeEmail(email as string);

  // Generic success to prevent enumeration
  const genericSuccess = {
    message: "If an unverified account with that email exists, a new code has been sent.",
  };

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { emailVerification: true },
  });

  if (!user || user.emailVerifiedAt) {
    return NextResponse.json(genericSuccess, { status: 200 });
  }

  const verification = user.emailVerification;

  // Check resend cooldown
  if (verification) {
    const timeSinceLastSent = Date.now() - new Date(verification.lastSentAt).getTime();
    if (timeSinceLastSent < RESEND_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSent) / 1000);
      return NextResponse.json(
        { error: `Please wait ${retryAfter} seconds before requesting another code.` },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
  }

  // Generate new code
  const code = String(crypto.randomInt(100000, 999999));
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  if (verification) {
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { codeHash, expiresAt, attempts: 0, lastSentAt: new Date() },
    });
  } else {
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt,
        attempts: 0,
        lastSentAt: new Date(),
      },
    });
  }

  sendVerificationEmail(normalizedEmail, code).catch((err) => {
    console.error("Failed to send verification email:", err);
  });

  return NextResponse.json(genericSuccess, { status: 200 });
}
