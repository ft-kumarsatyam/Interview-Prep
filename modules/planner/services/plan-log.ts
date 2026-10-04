import { connectDb } from "@/core/db";
import { addDays, type DateStr } from "@/core/domain/dates";
import type { PlanChangeDraft, PlanChangeType } from "@/modules/planner/domain/plan-changes";
import { dayGap, gapIsEmpty, type DayGap } from "@/modules/progress/domain/recap";
import type { DayProgress } from "@/modules/progress/domain/streak";
import { DailyPlan, DayLog } from "@/core/models/day";
import { PlanChange } from "@/core/models/planner";

export interface PlanChangeItem {
  id: string;
  date: DateStr;
  type: PlanChangeType;
  summary: string;
  at: string;
}

/** Append one entry. A `dedupeKey` makes it idempotent, so settling twice never double-logs. */
export async function logPlanChange(draft: PlanChangeDraft, date: DateStr): Promise<boolean> {
  await connectDb();
  const doc = { date, type: draft.type, summary: draft.summary, before: draft.before, after: draft.after };
  if (draft.dedupeKey) {
    const res = await PlanChange.updateOne({ dedupeKey: draft.dedupeKey }, { $setOnInsert: { ...doc, dedupeKey: draft.dedupeKey } }, { upsert: true });
    return res.upsertedCount > 0;
  }
  await PlanChange.create(doc);
  return true;
}

export async function listPlanChanges(limit = 25): Promise<PlanChangeItem[]> {
  await connectDb();
  const rows = await PlanChange.find().sort({ createdAt: -1 }).limit(limit).lean();
  return rows.map((r) => ({ id: String(r._id), date: r.date, type: r.type, summary: r.summary, at: (r.createdAt as Date | undefined)?.toISOString() ?? "" }));
}

type PlanRow = { kind: DayProgress["kind"]; dsaTarget: number; theoryTarget: number };
type LogRow = { dsaSolved?: number | null; theoryDone?: number | null; quizPassed?: boolean | null };

function gapFrom(plan: PlanRow | undefined, log: LogRow | undefined): { gap: DayGap; kind: DayProgress["kind"] } | null {
  if (!plan || plan.kind === "rest" || plan.kind === "outside") return null;
  const gap = dayGap({
    kind: plan.kind,
    dsaTarget: plan.dsaTarget,
    dsaSolved: log?.dsaSolved ?? 0,
    theoryTarget: plan.theoryTarget,
    theoryDone: log?.theoryDone ?? 0,
    quizPassed: !!log?.quizPassed,
  });
  return gapIsEmpty(gap) ? null : { gap, kind: plan.kind };
}

/** What the plan for `date` left undone, read from its plan and log (no writes). Null when the day wasn't planned or nothing is left. */
export async function gapOfDay(date: DateStr): Promise<{ gap: DayGap; kind: DayProgress["kind"] } | null> {
  const found = await gapsOfDays(date, date);
  return found.get(date) ?? null;
}

/** The same for every day in `from`..`to` in two queries, however long the range. Only days with something left are in the map. */
export async function gapsOfDays(from: DateStr, to: DateStr): Promise<Map<DateStr, { gap: DayGap; kind: DayProgress["kind"] }>> {
  await connectDb();
  const range = { date: { $gte: from, $lte: to } };
  const [plans, logs] = await Promise.all([
    DailyPlan.find(range, { date: 1, kind: 1, dsaTarget: 1, theoryTarget: 1 }).lean(),
    DayLog.find(range, { date: 1, dsaSolved: 1, theoryDone: 1, quizPassed: 1 }).lean(),
  ]);
  const logBy = new Map(logs.map((l) => [l.date, l]));
  const out = new Map<DateStr, { gap: DayGap; kind: DayProgress["kind"] }>();
  for (const p of plans) {
    const g = gapFrom(p, logBy.get(p.date));
    if (g) out.set(p.date, g);
  }
  return out;
}

export const dayAfter = (date: DateStr): DateStr => addDays(date, 1);
