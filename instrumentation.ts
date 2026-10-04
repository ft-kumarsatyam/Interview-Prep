/**
 * Runs once when a server instance starts. Pending database migrations are applied here so a deploy never serves
 * reads that the owner-scope filter would hide (rows written before `ownerId` existed). Failure is logged, not fatal:
 * the app still boots, and `npm run migrate` or `npm run seed` can be run by hand.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV === "test") return;
  if (!process.env.MONGODB_URI) return;
  try {
    const { runMigrations } = await import("@/core/db/migrations/runner");
    const r = await runMigrations();
    if (r.applied.length) console.log(`[migrate] applied ${r.applied.join(", ")}`);
  } catch (err) {
    console.error("[migrate] failed:", err instanceof Error ? err.message : err);
  }
}
