import "server-only";
import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "node:crypto";
import { connectDb } from "@/core/db";
import { env } from "@/core/env";
import { LoginAttempt } from "@/core/models/system";

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

const digest = (s: string) => createHash("sha256").update(s.trim().toLowerCase()).digest();

/** Constant-time check of the single owner's email + bcrypt password. */
export async function checkCredentials(email: string, password: string): Promise<boolean> {
  const { ADMIN_EMAIL, ADMIN_PASSWORD_HASH_B64 } = env();
  const emailOk = timingSafeEqual(digest(email), digest(ADMIN_EMAIL));
  const hash = Buffer.from(ADMIN_PASSWORD_HASH_B64, "base64").toString("utf8");
  // Always run bcrypt so a wrong email takes as long as a wrong password.
  const passwordOk = await bcrypt.compare(password, hash);
  return emailOk && passwordOk;
}

/** Minutes until another attempt is allowed, or 0 if not throttled. */
export async function throttleMinutes(ip: string): Promise<number> {
  await connectDb();
  const since = new Date(Date.now() - WINDOW_MS);
  const recent = await LoginAttempt.find({ ip, at: { $gte: since } }).sort({ at: 1 }).limit(MAX_FAILURES).lean();
  if (recent.length < MAX_FAILURES) return 0;
  const oldest = (recent[0] as { at: Date }).at.getTime();
  return Math.max(1, Math.ceil((oldest + WINDOW_MS - Date.now()) / 60_000));
}

export async function recordFailure(ip: string): Promise<void> {
  await connectDb();
  await LoginAttempt.create({ ip });
}
