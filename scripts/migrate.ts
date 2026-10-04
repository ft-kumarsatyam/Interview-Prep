/**
 * Runs pending database migrations (core/db/migrations). Idempotent; takes a lock so two runs cannot overlap.
 * Usage: npm run migrate   (reads MONGODB_URI from .env.local)
 */
import mongoose from "mongoose";
import { runMigrations } from "@/core/db/migrations/runner";

runMigrations()
  .then((r) => {
    if (r.skipped) console.log("another migration run holds the lock; nothing done");
    else console.log(r.applied.length ? `applied: ${r.applied.join(", ")}` : "up to date");
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
