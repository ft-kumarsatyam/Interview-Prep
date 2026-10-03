import { connectDb } from "@/lib/db";

export type DbHealth = { ok: true; ms: number } | { ok: false; error: string };

/** A real round trip to MongoDB (not a document count), with its own deadline so a dead host can't hang the page. */
export async function pingDb(timeoutMs = 3000): Promise<DbHealth> {
  const started = Date.now();
  try {
    const work = connectDb().then(async (m) => {
      const db = m.connection.db;
      if (!db) throw new Error("No database handle");
      await db.admin().ping();
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("timed out")), timeoutMs);
    });
    await Promise.race([work, deadline]).finally(() => clearTimeout(timer));
    return { ok: true, ms: Date.now() - started };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
