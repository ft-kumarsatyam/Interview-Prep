import { addDays, type DateStr } from "@/core/domain/dates";
import { explainDay, reopenPlanned, type DayReason } from "@/modules/planner/domain/explain-day";
import type { DailyPlanDraft, ProblemState, ReviewState, SubtopicState } from "@/modules/planner/domain/planner";
import { projectThrough } from "@/modules/planner/services/calendar";
import { ensureToday, getPlan, loadPlanInputs } from "@/modules/planner/services/plan";
import { gapOfDay } from "@/modules/planner/services/plan-log";

/** Progress as it will stand once the earlier planned days are done, the way `projectDays` assumes it. */
function afterPlans(plans: readonly DailyPlanDraft[], problems: ProblemState[], reviews: ReviewState[], subtopics: SubtopicState[]) {
  const solved = new Set(plans.flatMap((p) => [...p.dsaNew, p.jsProblem, p.sqlProblem]).filter((x): x is string => !!x));
  const reviewed = new Set(plans.flatMap((p) => p.dsaReview));
  const done = new Set(plans.flatMap((p) => p.theory));
  return {
    problems: problems.map((p) => (solved.has(p.slug) ? { ...p, solved: true } : p)),
    reviews: reviews.filter((r) => !reviewed.has(r.slug)),
    subtopics: subtopics.map((t) => (done.has(t.id) ? { ...t, done: true } : t)),
  };
}

/** The reasons behind one day's plan, from the stored plan (or the projection for a future day) and the current progress. */
export async function getDayExplanation(date: DateStr): Promise<DayReason[]> {
  const state = await ensureToday();
  const s = state.settings;
  const inputs = await loadPlanInputs();

  if (date > state.today) {
    const projected = await projectThrough(s, state.today, state.plan, date);
    const plan = projected.get(date) ?? null;
    const earlier = [state.plan, ...[...projected.values()].filter((p) => p.date < date)];
    const pool = afterPlans(earlier, inputs.problems, inputs.reviews, inputs.subtopics);
    return explainDay({ date, today: state.today, settings: s, plan, overrides: inputs.overrides, ...pool });
  }

  const plan = date === state.today ? state.plan : await getPlan(date);
  const reopened = plan ? reopenPlanned(plan, inputs.problems, inputs.subtopics) : { problems: inputs.problems, subtopics: inputs.subtopics };
  const carried = (await gapOfDay(addDays(date, -1)))?.gap ?? null;
  return explainDay({
    date,
    today: state.today,
    settings: s,
    plan,
    problems: reopened.problems,
    reviews: inputs.reviews,
    subtopics: reopened.subtopics,
    overrides: inputs.overrides,
    carried,
  });
}
