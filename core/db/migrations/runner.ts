import mongoose from "mongoose";
import { connectDb } from "@/core/db";
import { MIGRATIONS } from "@/core/db/migrations";
import type { Migration } from "@/core/db/migrations/types";
import { pendingMigrations } from "@/core/domain/migrations";
import { getKv } from "@/core/kv";
import "@/core/models/all";
import { MigrationDoc } from "@/core/models/migration";

const LOCK_KEY = "lock:migrate";
const LOCK_TTL_SEC = 300;

export interface MigrateResult {
  applied: string[];
  skipped: "locked" | null;
}

/** Runs pending migrations in order under a KV lock, recording each one. Safe to call from CI, seed and a deploy hook. */
export async function runMigrations(migrations: Migration[] = MIGRATIONS): Promise<MigrateResult> {
  await connectDb();
  const kv = getKv();
  const token = `${process.pid}:${Date.now()}`;
  if (!(await kv.setNx(LOCK_KEY, token, LOCK_TTL_SEC))) return { applied: [], skipped: "locked" };
  try {
    const rows = await MigrationDoc.find({}, { _id: 1 }).lean();
    const todo = pendingMigrations(migrations, rows.map((r) => r._id));
    const models = Object.values(mongoose.models) as unknown as never[];
    const applied: string[] = [];
    for (const m of todo) {
      const started = Date.now();
      await m.up({ models });
      await MigrationDoc.create({ _id: m.id, ms: Date.now() - started });
      applied.push(m.id);
    }
    return { applied, skipped: null };
  } finally {
    await kv.releaseIfOwner(LOCK_KEY, token);
  }
}
