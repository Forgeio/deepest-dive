import { NextRequest, NextResponse } from "next/server";
import argon2 from "argon2";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import {
  validateEmail,
  validateUsername,
  validatePassword,
  normalizeEmail,
  normalizeUsername,
} from "@/lib/validation";
import { checkRateLimit } from "@/lib/rateLimit";
import { sendVerificationEmail } from "@/lib/email";

// Max body size: 4KB for auth endpoints
export const config = { api: { bodyParser: { sizeLimit: "4kb" } } };

const RATE_LIMIT = { maxRequests: 5, windowMs: 15 * 60 * 1000 }; // 5 per 15 min

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed, retryAfterMs } = checkRateLimit(`register:${ip}`, RATE_LIMIT);
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

  const { email, username, password } = body as Record<string, unknown>;

  const emailResult = validateEmail(email);
  if (!emailResult.valid) return NextResponse.json({ error: emailResult.error }, { status: 400 });

  const usernameResult = validateUsername(username);
  if (!usernameResult.valid)
    return NextResponse.json({ error: usernameResult.error }, { status: 400 });

  const passwordResult = validatePassword(password);
  if (!passwordResult.valid)
    return NextResponse.json({ error: passwordResult.error }, { status: 400 });

  const normalizedEmail = normalizeEmail(email as string);
  const normalizedUsername = normalizeUsername(username as string);

  // Check for existing email/username – use generic error to avoid enumeration
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { username: normalizedUsername }],
    },
  });
  if (existing) {
    // Generic message to prevent account enumeration
    return NextResponse.json(
      { error: "An account with that email or username already exists." },
      { status: 409 }
    );
  }

  // Hash password with Argon2id
  const passwordHash = await argon2.hash(password as string, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
    parallelism: 1,
  });

  // Generate 6-digit verification code
  const code = String(crypto.randomInt(100000, 999999));
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Create user and verification in a transaction
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        username: normalizedUsername,
        passwordHash,
      },
    });

    await tx.emailVerification.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt,
        attempts: 0,
        lastSentAt: new Date(),
      },
    });
  });

  // Send verification email (non-blocking; don't expose failure to client)
  sendVerificationEmail(normalizedEmail, code).catch((err) => {
    console.error("Failed to send verification email:", err);
  });

  return NextResponse.json(
    { message: "Account created. Please check your email for a verification code." },
    { status: 201 }
  );
}
