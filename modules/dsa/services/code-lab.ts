import { isValidObjectId } from "mongoose";
import { connectDb } from "@/core/db";
import type { DateStr } from "@/core/domain/dates";
import { DbLabProgress, DbLabQuery, RunLog } from "@/core/models/code-lab";
import { RUN_LOG_KEEP, type RunInput, type RunSummary, type SavedQueryInput } from "@/modules/dsa/domain/code-lab";

type Mode = "sql" | "postgres" | "mongo";

/** Records the outcome of one run (counts and time only) and keeps the newest runs per problem. */
export async function recordRun(input: RunInput, today: DateStr): Promise<void> {
  await connectDb();
  await RunLog.create({ ...input, on: today });
  const old = await RunLog.find({ kind: input.kind, ref: input.ref }, { _id: 1 }).sort({ createdAt: -1, _id: -1 }).skip(RUN_LOG_KEEP).lean();
  if (old.length) await RunLog.deleteMany({ _id: { $in: old.map((r) => r._id) } });
}

export async function listRuns(kind: RunInput["kind"], ref: string, limit = 10): Promise<RunSummary[]> {
  await connectDb();
  const rows = await RunLog.find({ kind, ref }).sort({ createdAt: -1, _id: -1 }).limit(limit).lean();
  return rows.map((r) => ({ id: String(r._id), action: r.action, language: r.language, ok: r.ok, passed: r.passed, total: r.total, ms: r.ms, on: r.on }));
}

export interface SavedQuery {
  id: string;
  title: string;
  sql: string;
  mode: Mode;
  dataset: string;
  updatedAt: string;
}

export async function listSavedQueries(): Promise<SavedQuery[]> {
  await connectDb();
  const rows = await DbLabQuery.find().sort({ updatedAt: -1 }).limit(200).lean();
  return rows.map((r) => ({ id: String(r._id), title: r.title, sql: r.sql, mode: r.mode, dataset: r.dataset ?? "", updatedAt: (r.updatedAt as Date | undefined)?.toISOString() ?? "" }));
}

export async function saveQuery(input: SavedQueryInput): Promise<string> {
  await connectDb();
  const { id, ...fields } = input;
  if (id) {
    if (!isValidObjectId(id)) throw new Error("Unknown query");
    const res = await DbLabQuery.updateOne({ _id: id }, { $set: fields });
    if (!res.matchedCount) throw new Error("Unknown query");
    return id;
  }
  const doc = await DbLabQuery.create(fields);
  return String(doc._id);
}

export async function deleteQuery(id: string): Promise<void> {
  if (!isValidObjectId(id)) return;
  await connectDb();
  await DbLabQuery.deleteOne({ _id: id });
}

export interface SolvedChallenge {
  challengeId: string;
  mode: Mode;
  solvedOn: string;
  attempts: number;
}

export async function listSolved(): Promise<SolvedChallenge[]> {
  await connectDb();
  const rows = await DbLabProgress.find().lean();
  return rows.map((r) => ({ challengeId: r.challengeId, mode: r.mode, solvedOn: r.solvedOn, attempts: r.attempts ?? 1 }));
}

/** Marks a challenge solved; a repeat only counts another attempt and keeps the first solve date. */
export async function markSolved(challengeId: string, mode: Mode, today: DateStr): Promise<void> {
  await connectDb();
  await DbLabProgress.updateOne({ challengeId }, { $setOnInsert: { mode, solvedOn: today }, $inc: { attempts: 1 } }, { upsert: true });
}

/** Merges solved ids a browser kept locally before progress was synced; existing rows are left alone. */
export async function importSolved(items: { challengeId: string; mode: Mode }[], today: DateStr): Promise<number> {
  await connectDb();
  let added = 0;
  for (const it of items) {
    const res = await DbLabProgress.updateOne({ challengeId: it.challengeId }, { $setOnInsert: { mode: it.mode, solvedOn: today, attempts: 1 } }, { upsert: true });
    if (res.upsertedCount) added++;
  }
  return added;
}
