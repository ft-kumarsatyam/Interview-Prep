import { connectDb } from "@/core/db";
import { addDays, type DateStr } from "@/core/domain/dates";
import { DailyPlan, DayLog } from "@/core/models/day";
import { PracticeAttempt } from "@/core/models/learning";
import { subtopicById } from "@/core/content";
import { allocateCatchUp, surplusOf, type CatchUp, type DayDebt, type DaySurplus } from "@/modules/planner/domain/catch-up";
import { gapsOfDays } from "@/modules/planner/services/plan-log";
import { todayIn } from "@/modules/planner/services/plan";
import type { AppSettings } from "@/modules/settings/services/settings";

export interface CatchUpState {
  /** Every closed day that left work undone, oldest first, with what is still owed. */
  list: CatchUp[];
  byDate: Map<DateStr, CatchUp>;
  /** Closed days that left work undone and have been fully caught up since. */
  caughtUp: Set<DateStr>;
  /** Closed days that still owe something. */
  open: CatchUp[];
}

/**
 * Reads the plan window and works out which closed days are caught up. Read-only: nothing here writes, and
 * `DayLog.complete`, the streak and freeze tokens are never touched.
 */
export async function loadCatchUp(s: Pick<AppSettings, "startDate" | "endDate" | "timezone" | "quizPassPct">, today: DateStr): Promise<CatchUpState> {
  await connectDb();
  const yesterday = addDays(today, -1);
  const from = s.startDate;
  const empty: CatchUpState = { list: [], byDate: new Map(), caughtUp: new Set(), open: [] };
  if (from > yesterday) return empty;

  const range = { date: { $gte: from, $lte: today } };
  const [gaps, plans, logs] = await Promise.all([
    gapsOfDays(from, yesterday),
    DailyPlan.find(range, { date: 1, kind: 1, dsaTarget: 1, theoryTarget: 1, theory: 1 }).lean(),
    DayLog.find(range, { date: 1, dsaSolved: 1, theoryDone: 1 }).lean(),
  ]);
  if (gaps.size === 0) return empty;

  const logBy = new Map(logs.map((l) => [l.date, l]));
  const debts: DayDebt[] = [...gaps].map(([date, g]) => ({ date, gap: g.gap }));
  const surpluses: DaySurplus[] = plans.flatMap((p) => {
    const l = logBy.get(p.date);
    const { dsa, theory } = surplusOf({ dsaTarget: p.dsaTarget, dsaSolved: l?.dsaSolved ?? 0, theoryTarget: p.theoryTarget, theoryDone: l?.theoryDone ?? 0 });
    return dsa > 0 || theory > 0 ? [{ date: p.date, dsa, theory }] : [];
  });

  const quizMadeUp = await madeUpQuizzes(s, debts, plans);
  const list = allocateCatchUp(debts, surpluses, quizMadeUp);
  return { list, byDate: new Map(list.map((c) => [c.date, c])), caughtUp: new Set(list.filter((c) => c.caughtUp).map((c) => c.date)), open: list.filter((c) => !c.caughtUp) };
}

/**
 * A missed daily quiz can't be taken late (only today's quiz counts, ARCHITECTURE §7), so it is made up by a
 * passed practice quiz on a later day: on one of that day's planned subtopics, or on anything when it
 * planned no theory.
 */
async function madeUpQuizzes(
  s: Pick<AppSettings, "timezone" | "quizPassPct">,
  debts: readonly DayDebt[],
  plans: ReadonlyArray<{ date: string; theory?: string[] | null }>,
): Promise<Set<DateStr>> {
  const quizDebts = debts.filter((d) => d.gap.quiz);
  if (quizDebts.length === 0) return new Set();
  const attempts = await PracticeAttempt.find({ submittedAt: { $ne: null }, pct: { $gte: s.quizPassPct }, scope: { $in: ["subtopic", "topic"] } }, { ref: 1, submittedAt: 1 }).lean();
  const planBy = new Map(plans.map((p) => [p.date, p]));
  const made = new Set<DateStr>();
  for (const d of quizDebts) {
    const planned = planBy.get(d.date)?.theory ?? [];
    const refs = new Set(planned.flatMap((id) => [id, subtopicById.get(id)?.topicId ?? id]));
    const ok = attempts.some((a) => a.submittedAt && todayIn(s, new Date(a.submittedAt)) > d.date && (refs.size === 0 || refs.has(a.ref)));
    if (ok) made.add(d.date);
  }
  return made;
}
