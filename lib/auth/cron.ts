import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * For /api/cron/*: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 * Compared in constant time; fails closed when the secret is unset.
 */
export function isCronAuthorized(req: Request): boolean {
  const secret = env().CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
