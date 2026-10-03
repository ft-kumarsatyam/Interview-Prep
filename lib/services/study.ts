import { connectDb } from "@/lib/db";
import { addDays, type DateStr } from "@/lib/domain/dates";
import type { StudyKind } from "@/lib/domain/study";
import { StudySession } from "@/lib/models/planner";
import { todayIn } from "./plan";
import { getSettings } from "./settings";

export interface StudySessionItem {
  id: string;
  date: DateStr;
  minutes: number;
  kind: StudyKind;
  note: string;
  source: "timer" | "manual";
}

export async function logStudySession(
  input: { minutes: number; kind: StudyKind; note?: string; source: "timer" | "manual" },
  now = new Date(),
): Promise<StudySessionItem> {
  const settings = await getSettings();
  const date = todayIn(settings, now);
  await connectDb();
  const doc = await StudySession.create({ date, minutes: Math.round(input.minutes), kind: input.kind, note: input.note?.trim() ?? "", source: input.source });
  return { id: String(doc._id), date, minutes: doc.minutes, kind: doc.kind, note: doc.note ?? "", source: doc.source ?? "manual" };
}

export async function deleteStudySession(id: string): Promise<void> {
  await connectDb();
  await StudySession.deleteOne({ _id: id });
}

export async function listStudySessions(from: DateStr, to: DateStr): Promise<StudySessionItem[]> {
  await connectDb();
  const rows = await StudySession.find({ date: { $gte: from, $lte: to } }).sort({ createdAt: -1 }).lean();
  return rows.map((r) => ({ id: String(r._id), date: r.date, minutes: r.minutes, kind: r.kind, note: r.note ?? "", source: r.source ?? "manual" }));
}

/** Minutes logged per local date in the inclusive range. */
export async function minutesByDate(from: DateStr, to: DateStr): Promise<Map<DateStr, number>> {
  await connectDb();
  const rows = await StudySession.aggregate<{ _id: string; minutes: number }>([
    { $match: { date: { $gte: from, $lte: to } } },
    { $group: { _id: "$date", minutes: { $sum: "$minutes" } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.minutes]));
}

export const lastNDays = (today: DateStr, n: number): { from: DateStr; to: DateStr } => ({ from: addDays(today, -(n - 1)), to: today });
