import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { SESSION_COOKIE, verifySession } from "./session";

/**
 * The real auth check. Call it next to the data: the (app) layout, every
 * Server Action and every route handler. proxy.ts is only a fast redirect.
 */
export const requireSession = cache(async (): Promise<void> => {
  await currentSession();
});

/** The signed-in session (redirects to /login when there isn't one). */
export const currentSession = cache(async (): Promise<{ remember: boolean }> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) redirect("/login");
  return { remember: session.remember };
});
