import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE, verifySession } from "@/core/auth/session";
import { pushSubscriptionSchema, replacePushSubscription } from "@/modules/notifications/services/push-subscriptions";

const bodySchema = z.object({ old: z.url().startsWith("https://").max(2048), subscription: pushSubscriptionSchema });

/** The service worker calls this when the browser rotates a push subscription: swap the old endpoint for the new one. */
export async function POST(req: Request) {
  if (!(await verifySession((await cookies()).get(SESSION_COOKIE)?.value))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  await replacePushSubscription(parsed.data.old, parsed.data.subscription);
  return NextResponse.json({ ok: true });
}
