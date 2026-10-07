import { cache } from "react";
import { mainProblemCount, problemBySlug, subtopicById, type ContentProblem, type SubtopicInfo } from "@/core/content";
import { connectDb } from "@/core/db";
import { heatmapCells, type HeatCell } from "@/modules/progress/domain/heatmap";
import { pace, type Pace } from "@/modules/planner/domain/pace";
import { DayLog } from "@/core/models/day";
import { ProblemProgress, SubtopicProgress } from "@/core/models/progress";
import { Notification } from "@/core/models/system";
import { ensureToday, type TodayState } from "@/modules/planner/services/plan";

export interface PlanProblem extends ContentProblem {
  role: "new" | "review" | "js" | "sql";
  solvedToday: boolean;
  confidence: string | null;
}

export interface PlanSubtopic extends SubtopicInfo {
  done: boolean;
}

export interface DashboardData extends TodayState {
  problems: PlanProblem[];
  theory: PlanSubtopic[];
  /** Sunday's optional extra work from spare hours. Empty on other days. */
  bonus: { problems: ContentProblem[]; theory: SubtopicInfo[] };
  heatmap: HeatCell[];
  pace: Pace;
  solvedMain: number;
  needsDetails: Array<{ slug: string; title: string; lastSolvedOn: string }>;
  unreadNotifications: Array<{ id: string; title: string; body: string }>;
}

export const getDashboard = cache(async function getDashboard(): Promise<DashboardData> {
  const state = await ensureToday();
  await connectDb();
  const { plan, today, settings } = state;

  const roles: Array<[string | null, PlanProblem["role"]]> = [
    ...plan.dsaNew.map((s) => [s, "new"] as [string, PlanProblem["role"]]),
    ...plan.dsaReview.map((s) => [s, "review"] as [string, PlanProblem["role"]]),
    [plan.jsProblem, "js"],
    [plan.sqlProblem, "sql"],
  ];
  const slugs = roles.flatMap(([s]) => (s ? [s] : []));

  const [progressRows, theoryRows, logs, solvedMain, pendingDetails, notes] = await Promise.all([
    ProblemProgress.find({ slug: { $in: slugs } }, { slug: 1, solveDates: 1, confidence: 1 }).lean(),
    SubtopicProgress.find({ subtopicId: { $in: plan.theory } }, { subtopicId: 1 }).lean(),
    DayLog.find({ date: { $gte: settings.startDate, $lte: settings.endDate } }).lean(),
    countSolvedMain(),
    ProblemProgress.find({ needsDetails: true }, { slug: 1, lastSolvedOn: 1 }).sort({ lastSolvedOn: -1 }).limit(10).lean(),
    Notification.find({ read: false }).sort({ createdAt: -1 }).limit(3).lean(),
  ]);
  const bySlug = new Map(progressRows.map((p) => [p.slug, p]));
  const doneTheory = new Set(theoryRows.map((t) => t.subtopicId));

  const planProblems = roles.flatMap(([slug, role]) => {
    const p = slug ? problemBySlug.get(slug) : undefined;
    if (!p) return [];
    const prog = bySlug.get(p.slug);
    return [{ ...p, role, solvedToday: !!prog?.solveDates?.includes(today), confidence: prog?.confidence ?? null }];
  });

  return {
    ...state,
    problems: planProblems,
    theory: plan.theory.flatMap((id) => {
      const info = subtopicById.get(id);
      return info ? [{ ...info, done: doneTheory.has(id) }] : [];
    }),
    bonus: {
      problems: (plan.bonusDsa ?? []).flatMap((slug) => problemBySlug.get(slug) ?? []),
      theory: (plan.bonusTheory ?? []).flatMap((id) => subtopicById.get(id) ?? []),
    },
    heatmap: heatmapCells(
      settings.startDate,
      settings.endDate,
      today,
      logs.map((l) => ({
        date: l.date,
        dsaSolved: l.dsaSolved ?? 0,
        theoryDone: l.theoryDone ?? 0,
        quizPassed: !!l.quizPassed,
        complete: !!l.complete,
        freezeUsed: !!l.freezeUsed,
      })),
    ),
    pace: pace(today, solvedMain, mainProblemCount, settings),
    solvedMain,
    needsDetails: pendingDetails.map((p) => ({
      slug: p.slug,
      title: problemBySlug.get(p.slug)?.title ?? p.slug,
      lastSolvedOn: p.lastSolvedOn ?? today,
    })),
    unreadNotifications: notes.map((n) => ({ id: String(n._id), title: n.title, body: n.body ?? "" })),
  };
});

export async function countSolvedMain(): Promise<number> {
  await connectDb();
  return ProblemProgress.countDocuments({ status: "solved", slug: { $in: mainSlugs() } });
}

let mainSlugCache: string[] | undefined;
function mainSlugs(): string[] {
  mainSlugCache ??= [...problemBySlug.values()].filter((p) => p.track === "main").map((p) => p.slug);
  return mainSlugCache;
}
