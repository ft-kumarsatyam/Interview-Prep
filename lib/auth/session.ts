import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "prepos_session";
const SESSION_DAYS = 30;
const SUBJECT = "owner";

function key(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET is missing or shorter than 32 chars");
  return new TextEncoder().encode(secret);
}

export async function signSession(): Promise<{ token: string; expires: Date }> {
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(SUBJECT)
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(key());
  return { token, expires };
}

/** True when the token is a valid, unexpired session for the owner. */
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.sub === SUBJECT;
  } catch {
    return false;
  }
}

export async function createSession(): Promise<void> {
  const { token, expires } = await signSession();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
