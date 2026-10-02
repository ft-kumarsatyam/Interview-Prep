import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { sessionTtlMs, type SessionInfo } from "@/lib/domain/session-policy";

export const SESSION_COOKIE = "prepos_session";
const SUBJECT = "owner";

function key(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET is missing or shorter than 32 chars");
  return new TextEncoder().encode(secret);
}

export async function signSession(remember: boolean, now = new Date()): Promise<{ token: string; expires: Date }> {
  const expires = new Date(now.getTime() + sessionTtlMs(remember));
  const token = await new SignJWT({ rem: remember })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(SUBJECT)
    .setIssuedAt(Math.floor(now.getTime() / 1000))
    .setExpirationTime(expires)
    .sign(key());
  return { token, expires };
}

/** The session behind a valid, unexpired owner token, or null. */
export async function verifySession(token: string | undefined): Promise<SessionInfo | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (payload.sub !== SUBJECT) return null;
    // Tokens issued before "Remember me" existed were always 30-day sessions.
    return { remember: payload.rem !== false, issuedAt: payload.iat ?? 0 };
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  return (await verifySession(token)) !== null;
}

function cookieOptions(remember: boolean, expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    // No `expires` makes it a browser-session cookie.
    ...(remember ? { expires } : {}),
  };
}

export async function createSession({ remember }: { remember: boolean }): Promise<void> {
  const { token, expires } = await signSession(remember);
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(remember, expires));
}

/** Re-issue a remembered session on a proxy response (sliding expiry). */
export async function renewSessionOn(response: NextResponse): Promise<void> {
  const { token, expires } = await signSession(true);
  response.cookies.set(SESSION_COOKIE, token, cookieOptions(true, expires));
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
