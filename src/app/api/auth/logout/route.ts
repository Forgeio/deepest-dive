import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, deleteSession, clearSessionCookie } from "@/lib/session";

export async function POST(_req: NextRequest) {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await deleteSession(sessionId);
  }

  await clearSessionCookie();

  return NextResponse.redirect(new URL("/login", _req.url), { status: 303 });
}
