import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/**
 * The real auth check. proxy.ts only does an optimistic redirect; every page,
 * Server Action and route handler that touches data must call this.
 */
export const requireSession = cache(async (): Promise<void> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) redirect("/login");
});

/** For /api/cron/*: Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}
