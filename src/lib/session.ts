import { cookies } from "next/headers";
import { prisma } from "./db";

export const SESSION_COOKIE = "session_id";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (default)
export const REMEMBER_ME_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: string, rememberMe = false): Promise<string> {
  const { v4: uuidv4 } = await import("uuid");
  const sessionId = uuidv4();
  const duration = rememberMe ? REMEMBER_ME_DURATION_MS : SESSION_DURATION_MS;
  const expiresAt = new Date(Date.now() + duration);

  await prisma.session.create({
    data: { id: sessionId, userId, expiresAt },
  });

  return sessionId;
}

export async function getSessionUser(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }

  return session.user;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

export async function setSessionCookie(sessionId: string, rememberMe = false) {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    // No maxAge when rememberMe is false → cookie expires when browser closes
    ...(rememberMe ? { maxAge: REMEMBER_ME_DURATION_MS / 1000 } : {}),
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return getSessionUser(sessionId);
}
