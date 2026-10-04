/**
 * Problem of the day: the next main-track problem beyond today's plan, i.e. the one the calendar projection
 * would hand you on a later day. Solving it early takes it out of the future plan. Pure.
 */
import { diffDays, type DateStr } from "@/core/domain/dates";
import type { DailyPlanDraft, ProblemState } from "@/modules/planner/domain/planner";

/**
 * The first `count` main problems, by order, that were unsolved when today began and are not already required
 * by today's plan. Problems first solved today still count as picks, so the choice stays stable all day. Sunday
 * bonus problems are optional, so they stay eligible.
 */
export function pickAhead(input: {
  problems: readonly ProblemState[];
  solvedToday: ReadonlySet<string>;
  todayPlan: Pick<DailyPlanDraft, "dsaNew">;
  count?: number;
}): string[] {
  const planned = new Set(input.todayPlan.dsaNew);
  return input.problems
    .filter((p) => p.track === "main" && (!p.solved || input.solvedToday.has(p.slug)) && !planned.has(p.slug))
    .toSorted((a, b) => a.order - b.order)
    .slice(0, input.count ?? 3)
    .map((p) => p.slug);
}

/** The last projected day that still introduces a new main problem: when the DSA track is done. */
export function trackFinish(plans: readonly Pick<DailyPlanDraft, "date" | "dsaNew">[]): DateStr | null {
  for (let i = plans.length - 1; i >= 0; i--) if (plans[i]!.dsaNew.length > 0) return plans[i]!.date;
  return null;
}

/** The projected day a problem was going to land on, as a new or Sunday bonus problem. */
export function scheduledOn(slug: string, plans: readonly Pick<DailyPlanDraft, "date" | "dsaNew" | "bonusDsa">[]): DateStr | null {
  return plans.find((p) => p.dsaNew.includes(slug) || p.bonusDsa?.includes(slug))?.date ?? null;
}

export interface FinishImpact {
  /** Where the problem sits in the projection when it is left unsolved. */
  scheduledOn: DateStr | null;
  finishWithout: DateStr | null;
  finishWith: DateStr | null;
  /** Calendar days the DSA track finishes earlier by solving it now (0 when it only lightens a day). */
  daysSaved: number;
}

/** Compare the projection with the problem left for later against the one with it already solved. */
export function finishImpact(slug: string, without: readonly DailyPlanDraft[], withSolved: readonly DailyPlanDraft[]): FinishImpact {
  const finishWithout = trackFinish(without);
  const finishWith = trackFinish(withSolved);
  const daysSaved = finishWithout && finishWith ? Math.max(0, diffDays(finishWithout, finishWith)) : 0;
  return { scheduledOn: scheduledOn(slug, without), finishWithout, finishWith, daysSaved };
}
