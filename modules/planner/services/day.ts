import { connectDb } from "@/core/db";
import type { DateStr } from "@/core/domain/dates";
import { dayKind } from "@/modules/planner/domain/planner";
import { isDayComplete, isQuizUnlocked } from "@/modules/progress/domain/streak";
import { DailyPlan, DayLog, Quiz } from "@/core/models/day";
import { ProblemProgress, SubtopicProgress } from "@/core/models/progress";
import { Article } from "@/core/models/system";
import { getSettings } from "@/modules/settings/services/settings";
import { recordStreakCelebration } from "@/modules/progress/services/streak-insights";

export interface DayState {
  date: DateStr;
  kind: ReturnType<typeof dayKind>;
  dsaTarget: number;
  dsaSolved: number;
  theoryTarget: number;
  theoryDone: number;
  readings: number;
  quizPassed: boolean;
  quizUnlocked: boolean;
  complete: boolean;
  freezeUsed: boolean;
}

/**
 * Recount a day from the raw progress rows and re-evaluate completion. The
 * single place DayLog is written (apart from freeze bookkeeping in settle).
 */
export async function recomputeDay(date: DateStr): Promise<{ day: DayState; justCompleted: boolean }> {
  await connectDb();
  const s = await getSettings();
  const [plan, existing, dsaSolved, theoryDone, readings] = await Promise.all([
    DailyPlan.findOne({ date }).lean(),
    DayLog.findOne({ date }).lean(),
    ProblemProgress.countDocuments({ solveDates: date }),
    SubtopicProgress.countDocuments({ doneOn: date }),
    Article.countDocuments({ readOn: date }),
  ]);
  const kind = plan?.kind ?? dayKind(date, s);
  const quizKind = kind === "sunday" ? "weekly" : "daily";
  const quizPassed = !!(await Quiz.exists({ date, kind: quizKind, passed: true }));
  const dsaTarget = plan?.dsaTarget ?? 0;
  const theoryTarget = plan?.theoryTarget ?? 0;
  const progress = { kind, dsaTarget, dsaSolved, theoryTarget, theoryDone, quizPassed };
  const complete = plan ? isDayComplete(progress) : kind === "rest";

  const completedAt = complete ? (existing?.completedAt ?? new Date()) : null;
  await DayLog.updateOne(
    { date },
    { $set: { dsaSolved, theoryDone, readings, quizPassed, complete, completedAt } },
    { upsert: true },
  );

  const justCompleted = complete && !existing?.complete;
  // A milestone or a new personal best leaves one notification. It only reads the records, so the streak is untouched.
  if (justCompleted) await recordStreakCelebration(date).catch((err) => console.warn("[streak] celebration failed:", err instanceof Error ? err.message : err));

  return {
    day: {
      date,
      ...progress,
      readings,
      quizUnlocked: isQuizUnlocked(progress),
      complete,
      freezeUsed: existing?.freezeUsed ?? false,
    },
    justCompleted,
  };
}
