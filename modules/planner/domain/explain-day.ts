import { addDays, dayOfWeek, diffDays, eachDay, saturdayOfWeek, weekNumber, type DateStr } from "@/core/domain/dates";
import { DSA_RAMP, REVIEWS_ON_SUNDAY, REVIEWS_PER_DAY, REVISION_DSA_PER_DAY, SQL_TRACK_START_WEEK, scaledWeek, totalWeeks, type PlanSettings } from "@/modules/planner/domain/plan-config";
import type { DayGap } from "@/modules/progress/domain/recap";
import {
  computeDsaTarget,
  computeTheory,
  dayKind,
  dayWeight,
  dueSubtopics,
  revisionStart,
  type DailyPlanDraft,
  type ProblemState,
  type ReviewState,
  type SubtopicState,
} from "@/modules/planner/domain/planner";
import { baselineMinutes, hoursFor, isBaseline, type HoursOverride } from "@/modules/planner/domain/time-budget";

export interface DayReason {
  title: string;
  detail: string;
}

export interface ExplainDayInput {
  date: DateStr;
  today: DateStr;
  settings: PlanSettings;
  /** The stored (frozen) plan, or the projection for a future day. Null when none exists. */
  plan: DailyPlanDraft | null;
  /** Progress as it stood when the day was planned (the service reopens what the plan itself lists). */
  problems: readonly ProblemState[];
  reviews: readonly ReviewState[];
  subtopics: readonly SubtopicState[];
  overrides?: readonly HoursOverride[];
  /** What the previous day left undone, when it was planned. */
  carried?: DayGap | null;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const hoursText = (h: number) => `${Math.round(h * 10) / 10} h`;

function kindReason(i: ExplainDayInput): DayReason {
  const { date, settings: s } = i;
  const kind = dayKind(date, s);
  switch (kind) {
    case "outside":
      return date < s.startDate
        ? { title: "Outside your plan window", detail: `The plan starts on ${s.startDate}, so nothing is planned before it.` }
        : { title: "Outside your plan window", detail: `The plan ends on your interview date, ${s.endDate}, so nothing is planned after it.` };
    case "rest":
      return { title: "Rest day you set", detail: "This date is in your rest days. It carries no targets and counts as complete, so it never breaks the streak." };
    case "sunday":
      return {
        title: "Sunday is the review day",
        detail: `Sundays carry no new DSA or theory target. The day is complete once the weekly quiz is passed; due reviews (up to ${REVIEWS_ON_SUNDAY}) and any spare hours become optional extras.`,
      };
    case "revision": {
      const start = revisionStart(s);
      return {
        title: "Revision phase",
        detail: `The last ${plural(s.revisionWeeks, "week")} before ${s.endDate} are for revision, starting ${start}. New-problem pressure is replaced by a fixed ${REVISION_DSA_PER_DAY} problems per day (double on Saturday) and the theory you have not covered yet.`,
      };
    }
    case "study": {
      const sat = dayOfWeek(date) === 6;
      return {
        title: "Study day",
        detail: sat
          ? "A normal study day before the revision phase. Saturday counts as a double day, so its DSA target is twice a weekday's (capped)."
          : "A normal study day before the revision phase: new DSA, theory, any due reviews, and the daily quiz.",
      };
    }
  }
}

/** The count-based DSA target and the reason behind it, mirroring `computeDsaTarget`. */
function dsaReasons(i: ExplainDayInput, remainingMain: number): DayReason[] {
  const { date, settings: s, plan } = i;
  const kind = dayKind(date, s);
  const weight = dayWeight(date, s);
  if (kind === "outside" || kind === "rest") return [];
  if (kind === "sunday") return [{ title: "DSA target: 0", detail: "Sundays are review days, so no new problems are required." }];

  const out: DayReason[] = [];
  const base = computeDsaTarget(date, remainingMain, s);
  const week = weekNumber(date, s.startDate);
  const satNote = weight === 2 ? " Saturday counts double." : "";

  if (kind === "revision") {
    out.push({ title: `DSA target: ${base}`, detail: `Revision days use a fixed ${REVISION_DSA_PER_DAY} problems per day.${satNote}` });
  } else if (remainingMain === 0) {
    out.push({ title: "DSA target: 0", detail: "Every main-track problem is already solved, so there is nothing new to schedule." });
  } else {
    const ramp = DSA_RAMP.find((r) => week <= scaledWeek(r.untilWeek, s));
    if (ramp) {
      const capped = base < ramp.perDay * weight;
      out.push({
        title: `DSA target: ${base}`,
        detail: `Week ${week} is in the learning ramp (${ramp.perDay} per day until week ${scaledWeek(ramp.untilWeek, s)}), so the target is fixed rather than adaptive.${satNote}${capped ? ` Capped at the ${plural(remainingMain, "problem")} left.` : ""}`,
      });
    } else {
      const studyDays = eachDay(date, addDays(revisionStart(s), -1));
      const weighted = studyDays.reduce((sum, d) => sum + dayWeight(d, s), 0);
      const raw = Math.ceil(remainingMain / Math.max(weighted, 1));
      const perUnit = Math.min(Math.max(raw, s.minDailyDsa), s.maxDailyDsa);
      const clampNote = raw < s.minDailyDsa ? ` raised to your minimum of ${s.minDailyDsa}` : raw > s.maxDailyDsa ? ` lowered to your maximum of ${s.maxDailyDsa}` : "";
      const satCap = weight === 2 && perUnit * 2 > s.maxSaturdayDsa ? ` Saturday is capped at ${s.maxSaturdayDsa}.` : "";
      out.push({
        title: `DSA target: ${base}`,
        detail: `${plural(remainingMain, "problem")} left spread over ${weighted} weighted study ${weighted === 1 ? "day" : "days"} until revision (Saturday counts 2, Sunday and rest days 0) is ${raw} per day${clampNote}.${satNote}${satCap}${base < (weight === 2 ? Math.min(perUnit * 2, s.maxSaturdayDsa) : perUnit) ? ` Limited to the ${plural(remainingMain, "problem")} left.` : ""}`,
      });
    }
  }

  const hours = plan?.hours;
  if (plan && hours !== undefined && !isBaseline(hours * 60, date)) {
    const ratio = (hours * 60) / baselineMinutes(date);
    out.push({
      title: `Hours budget: ${hoursText(hours)}`,
      detail: `The counts assume ${hoursText(baselineMinutes(date) / 60)}. At ${hoursText(hours)} they are scaled by ${Math.round(ratio * 100)}%, then trimmed or topped up to fit the time budget. The plan lists ${plan.dsaTarget} new ${plan.dsaTarget === 1 ? "problem" : "problems"}${plan.dsaTarget === base ? "" : ` (the count-based target was ${base})`}.`,
    });
  } else if (plan && plan.dsaTarget !== base) {
    out.push({
      title: `Plan lists ${plan.dsaTarget}`,
      detail: `The count-based target is ${base} with today's progress, but this plan was set when ${plural(plan.dsaTarget, "problem")} fit the pool at that time.`,
    });
  }
  return out;
}

function theoryReasons(i: ExplainDayInput): DayReason[] {
  const { date, settings: s, plan } = i;
  const kind = dayKind(date, s);
  if (kind === "outside" || kind === "rest" || kind === "sunday") return [];
  const week = weekNumber(date, s.startDate);
  const due = dueSubtopics(i.subtopics as SubtopicState[], week, s).length;
  const t = computeTheory(date, i.subtopics as SubtopicState[], s);
  if (due === 0) return [{ title: "Theory target: 0", detail: "No unfinished subtopic is due by this week, so there is no new theory to schedule." }];
  const daysLeft = eachDay(date, saturdayOfWeek(date)).filter((d) => dayWeight(d, s) > 0).length;
  const compressed = totalWeeks(s) < 24 ? " Your window is under 24 weeks, so the syllabus is compressed to come due earlier." : "";
  const out: DayReason[] = [
    {
      title: `Theory target: ${t.target}`,
      detail: `${plural(due, "subtopic")} due by week ${week} and not done, spread over the ${plural(daysLeft, "study day")} left this week (at least 1, at most your cap of ${s.maxDailyTheory}).${compressed} Topics you rated weaker or wanted come first.`,
    },
  ];
  if (plan && plan.theoryTarget !== t.target) {
    out.push({ title: `Plan lists ${plan.theoryTarget}`, detail: `The plan was set with a different amount due${plan.hours !== undefined ? " or scaled to the hours budget" : ""}.` });
  }
  return out;
}

function reviewReasons(i: ExplainDayInput): DayReason[] {
  const { date, settings: s, plan } = i;
  const kind = dayKind(date, s);
  if (kind === "outside" || kind === "rest") return [];
  const limit = kind === "sunday" ? REVIEWS_ON_SUNDAY : REVIEWS_PER_DAY;
  const due = i.reviews.filter((r) => r.nextReviewAt <= date).length;
  const listed = plan?.dsaReview.length ?? Math.min(due, limit);
  if (due === 0) return [{ title: "Reviews: none due", detail: "No solved problem has a spaced review due by this date." }];
  return [
    {
      title: `Reviews: ${listed}`,
      detail: `${plural(due, "problem")} due for a spaced review, oldest first, capped at ${limit} on ${kind === "sunday" ? "a Sunday" : "other days"}${plan?.hours !== undefined && listed < Math.min(due, limit) ? " and trimmed to fit the hours" : ""}.`,
    },
  ];
}

function extrasReason(i: ExplainDayInput): DayReason | null {
  const { date, settings: s, plan } = i;
  const kind = dayKind(date, s);
  if (kind !== "study" && kind !== "revision") return null;
  const week = weekNumber(date, s.startDate);
  const sqlFrom = scaledWeek(SQL_TRACK_START_WEEK, s);
  const parts = [
    plan?.jsProblem ? "one JavaScript problem" : null,
    plan?.sqlProblem ? "one SQL problem" : week < sqlFrom ? `SQL problems start in week ${sqlFrom}` : null,
  ].filter(Boolean);
  if (parts.length === 0) return null;
  return { title: "JS and SQL", detail: `${parts.join("; ")}. Under a tight hours budget these are dropped first.` };
}

function quizReason(i: ExplainDayInput): DayReason | null {
  const kind = dayKind(i.date, i.settings);
  if (kind === "outside") return null;
  if (kind === "rest") return { title: "Quiz: not needed", detail: "Rest days count as complete without a quiz." };
  if (kind === "sunday") return { title: "Weekly quiz is required", detail: `The day is complete when you pass the weekly quiz (${i.settings.quizPassPct}% or more).` };
  return { title: "The daily quiz is required", detail: `The day only completes, and the streak only counts, when you pass the daily quiz (${i.settings.quizPassPct}% or more) as well as the DSA and theory targets. It unlocks after your first problem and first subtopic.` };
}

function hoursReason(i: ExplainDayInput): DayReason | null {
  const { date, settings: s, plan } = i;
  const kind = dayKind(date, s);
  if (kind === "outside" || kind === "rest") return null;
  const planned = plan?.hours;
  if (!plan || planned === undefined) {
    return { title: "Planned by counts", detail: "No study hours are set for this day, so the targets come straight from the counts above." };
  }
  const override = (i.overrides ?? []).find((r) => date >= r.from && date <= r.to);
  const weekday = hoursFor(date, s);
  let why: string;
  if (override) why = `a date-range override (${override.from} to ${override.to}) sets ${hoursText(override.hours)}`;
  else if (weekday !== undefined && Math.abs(weekday - planned) < 0.01) why = "that is your weekday setting";
  else why = `your weekday setting is now ${weekday === undefined ? "unset" : hoursText(weekday)}, so this came from an "hours today" re-plan or an earlier setting`;
  const est = plan.estMinutes !== undefined ? ` The items add up to about ${hoursText(plan.estMinutes / 60)}.` : "";
  return { title: `Time budget: ${hoursText(planned)}`, detail: `Planned for ${hoursText(planned)}; ${why}.${est}` };
}

function carryReason(i: ExplainDayInput): DayReason | null {
  const c = i.carried;
  if (!c || (c.dsa === 0 && c.theory === 0)) return null;
  const items = [c.dsa > 0 ? plural(c.dsa, "DSA problem") : "", c.theory > 0 ? plural(c.theory, "theory subtopic") : ""].filter(Boolean).join(" and ");
  return {
    title: "Carried over from yesterday",
    detail: `The day before left ${items} undone. Unsolved problems and unfinished subtopics stay at the front of the queue, so they are the first things in this plan rather than being skipped.`,
  };
}

function behindReason(i: ExplainDayInput, remainingMain: number): DayReason | null {
  const { settings: s, date } = i;
  const kind = dayKind(date, s);
  if (kind !== "study" || remainingMain === 0) return null;
  const week = weekNumber(date, s.startDate);
  if (DSA_RAMP.some((r) => week <= scaledWeek(r.untilWeek, s))) return null;
  const raw = Math.ceil(remainingMain / Math.max(eachDay(date, addDays(revisionStart(s), -1)).reduce((n, d) => n + dayWeight(d, s), 0), 1));
  if (raw <= s.maxDailyDsa) return null;
  return {
    title: "Behind the pace",
    detail: `Spreading the ${plural(remainingMain, "problem")} left evenly needs ${raw} per day, above your maximum of ${s.maxDailyDsa}, so the target is held at the maximum and the plan will not finish before revision unless you add hours or move the date.`,
  };
}

/** Why a day looks the way it does, in plain English and in the order a reader needs it. Only uses what the planner itself uses. */
export function explainDay(input: ExplainDayInput): DayReason[] {
  const remainingMain = input.problems.filter((p) => p.track === "main" && !p.solved).length;
  const past = input.date < input.today;
  const kind = dayKind(input.date, input.settings);
  const out: Array<DayReason | null> = [kindReason(input)];
  if (kind === "outside" || kind === "rest") {
    out.push(quizReason(input));
    return out.filter((r): r is DayReason => r !== null);
  }
  out.push(hoursReason(input), ...dsaReasons(input, remainingMain), behindReason(input, remainingMain), ...theoryReasons(input), ...reviewReasons(input), extrasReason(input), quizReason(input), carryReason(input));
  if (past) {
    out.push({ title: "About the numbers", detail: "This day is over, so the reasons use your progress as it stands now. They can differ slightly from what the day was frozen with." });
  } else if (input.date > input.today) {
    out.push({ title: "This is a projection", detail: `It assumes every day before it (${diffDays(input.date, input.today) - 1} in between) is finished as planned, and it will change as you progress.` });
  }
  return out.filter((r): r is DayReason => r !== null);
}

/**
 * Progress as it stood when `plan` was made for a day on or before today: whatever the plan lists is
 * put back in the pool, since it may have been solved since.
 */
export function reopenPlanned(
  plan: Pick<DailyPlanDraft, "dsaNew" | "jsProblem" | "sqlProblem" | "theory" | "dsaReview">,
  problems: readonly ProblemState[],
  subtopics: readonly SubtopicState[],
): { problems: ProblemState[]; subtopics: SubtopicState[] } {
  const slugs = new Set([...plan.dsaNew, plan.jsProblem, plan.sqlProblem].filter((x): x is string => !!x));
  const ids = new Set(plan.theory);
  return {
    problems: problems.map((p) => (slugs.has(p.slug) ? { ...p, solved: false } : { ...p })),
    subtopics: subtopics.map((t) => (ids.has(t.id) ? { ...t, done: false } : { ...t })),
  };
}
