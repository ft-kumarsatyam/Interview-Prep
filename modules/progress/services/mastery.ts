import { connectDb } from "@/core/db";
import { Mastery } from "@/core/models/learning";

export interface MasterySummary {
  score: number;
  bestPct: number;
  attempts: number;
  masteredOn: string | null;
}

export async function getMasteryMap(): Promise<Record<string, MasterySummary>> {
  await connectDb();
  const rows = await Mastery.find({}, { ref: 1, score: 1, bestPct: 1, attempts: 1, masteredOn: 1 }).lean();
  return Object.fromEntries(
    rows.map((r) => [r.ref, { score: r.score ?? 0, bestPct: r.bestPct ?? 0, attempts: r.attempts ?? 0, masteredOn: r.masteredOn ?? null }]),
  );
}
