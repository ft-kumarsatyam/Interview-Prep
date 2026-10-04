import { problemBySlug, subtopicById } from "@/core/content";
import { connectDb } from "@/core/db";
import type { MailLink } from "@/modules/notifications/domain/mail-html";
import { eveningNudge, type Nudge } from "@/modules/progress/domain/nudge";
import { env } from "@/core/env";
import { ProblemProgress, SubtopicProgress } from "@/core/models/progress";
import { getBacklog } from "@/modules/progress/services/backlog";
import type { TodayState } from "@/modules/planner/services/plan";
import { localHourOf } from "@/modules/progress/services/recap";

const problemLink = (slug: string): MailLink[] => {
  const p = problemBySlug.get(slug);
  return p ? [{ title: p.title, path: `/dsa/${p.slug}`, note: p.difficulty }] : [];
};
const theoryLink = (id: string): MailLink[] => {
  const s = subtopicById.get(id);
  return s ? [{ title: s.title, path: `/learn/${s.topicId}`, note: s.topicTitle }] : [];
};

/** The evening nudge for today, from what is really still open. Null when the day is finished, a rest day or outside the plan. */
export async function buildNudge(state: TodayState, now: Date): Promise<(Nudge & { backlogTotal: number }) | null> {
  await connectDb();
  const { today, plan, day, settings } = state;
  const [solvedRows, theoryRows, backlog] = await Promise.all([
    ProblemProgress.find({ solveDates: today }, { slug: 1 }).lean(),
    SubtopicProgress.find({ doneOn: today }, { subtopicId: 1 }).lean(),
    getBacklog({ today, plan, settings }),
  ]);
  const solved = new Set(solvedRows.map((r) => r.slug));
  const doneTheory = new Set(theoryRows.map((r) => r.subtopicId));
  const planned = [...plan.dsaNew, plan.jsProblem, plan.sqlProblem].filter((s): s is string => !!s);
  const nudge = eveningNudge({
    date: today,
    day,
    streak: state.streak,
    freezeTokens: state.freezeTokens,
    leftProblems: planned.filter((s) => !solved.has(s)).flatMap(problemLink),
    leftTheory: plan.theory.filter((id) => !doneTheory.has(id)).flatMap(theoryLink),
    hoursLeft: Math.max(0, 23 - localHourOf(now, settings.timezone)),
    backlogTotal: backlog.open.length,
    appUrl: env().APP_URL,
  });
  return nudge ? { ...nudge, backlogTotal: backlog.open.length } : null;
}
