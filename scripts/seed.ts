/**
 * Idempotent seed: upserts problems and topics from data/*.json and creates the
 * settings document if missing. Never touches progress collections.
 * Usage: npm run seed   (reads MONGODB_URI from .env.local)
 */
import mongoose from "mongoose";
import { runMigrations } from "@/core/db/migrations/runner";
import { seedContent } from "@/core/services/seed";

async function main() {
  const m = await runMigrations();
  console.log(m.skipped ? "migrations: locked, skipped" : `migrations: ${m.applied.length ? m.applied.join(", ") : "up to date"}`);
  const r = await seedContent();
  console.log(`problems: ${r.problems.inserted} new, ${r.problems.updated} updated, ${r.problems.removed} removed`);
  console.log(`topics: ${r.topics.inserted} new, ${r.topics.updated} updated, ${r.topics.removed} removed`);
  console.log(r.settingsCreated ? "settings: created with defaults" : "settings: already present (unchanged)");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
