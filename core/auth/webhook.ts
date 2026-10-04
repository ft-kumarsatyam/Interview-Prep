import { timingSafeEqual } from "node:crypto";

/**
 * Checks `Authorization: Bearer <secret>` in constant time. Fails closed when the secret is unset or short, so a
 * missing environment variable can never leave a webhook open.
 */
export function bearerMatches(req: Request, secret: string | undefined): boolean {
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
