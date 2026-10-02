import { connectDb } from "@/lib/db";
import type { DateStr } from "@/lib/domain/dates";
import { dayKind } from "@/lib/domain/planner";
import { isDayComplete, isQuizUnlocked } from "@/lib/domain/streak";
import { DailyPlan, DayLog, Quiz } from "@/lib/models/day";
import { ProblemProgress, SubtopicProgress } from "@/lib/models/progress";
import { Article } from "@/lib/models/system";
import { getSettings } from "./settings";

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

  return {
    day: {
      date,
      ...progress,
      readings,
      quizUnlocked: isQuizUnlocked(progress),
      complete,
      freezeUsed: existing?.freezeUsed ?? false,
    },
    justCompleted: complete && !existing?.complete,
  };
}
