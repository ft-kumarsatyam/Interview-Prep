import { problemBySlug, problems, subtopics } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { addDays, eachDay, toLocalDate, type DateStr } from "@/lib/domain/dates";
import { buildDailyPlan, dayKind, type DailyPlanDraft, type ProblemState, type ReviewState, type SubtopicState } from "@/lib/domain/planner";
import { bestStreak, currentStreak, settleDays, type DayRecord, type StreakEvent } from "@/lib/domain/streak";
import { estimateCosts, type Costs, type HoursOverride } from "@/lib/domain/time-budget";
import { DailyPlan, DayLog } from "@/lib/models/day";
import { ProblemProgress, SubtopicProgress } from "@/lib/models/progress";
import { Notification, Settings, SETTINGS_ID } from "@/lib/models/system";
import { carryOverChange, replanChange } from "@/lib/domain/plan-changes";
import { recomputeDay, type DayState } from "./day";
import { loadPersonalisation, type Personalisation } from "./intake-weights";
import { gapsOfDays, logPlanChange } from "./plan-log";
import { getSettings, type AppSettings } from "./settings";

export interface TodayState {
  today: DateStr;
  settings: AppSettings;
  plan: DailyPlanDraft;
  day: DayState;
  streak: number;
  best: number;
  freezeTokens: number;
}

export function todayIn(settings: Pick<AppSettings, "timezone">, now = new Date()): DateStr {
  return toLocalDate(now, settings.timezone);
}

async function loadRecords(): Promise<Map<DateStr, DayRecord>> {
  const logs = await DayLog.find({}, { date: 1, complete: 1, freezeUsed: 1 }).lean();
  return new Map(logs.map((l) => [l.date, { date: l.date, complete: !!l.complete, freezeUsed: !!l.freezeUsed }]));
}

const EVENT_COPY: Record<StreakEvent["type"], (e: StreakEvent) => { title: string; body: string }> = {
  "freeze-used": (e) => ({ title: "Streak saved with a freeze ❄", body: `A freeze token covered ${e.date}.` }),
  "freeze-earned": (e) => ({
    title: "Freeze token earned ❄",
    body: e.type === "freeze-earned" ? `${e.streak} days in a row. Nice work.` : "",
  }),
  "streak-broken": (e) => ({ title: "Streak reset", body: `${e.date} was missed. Today is a fresh start.` }),
};

/**
 * Close out every unsettled past day. Guarded by a compare-and-set on
 * `settledThrough`, so concurrent callers can't spend a freeze twice.
 */
async function settlePastDays(s: AppSettings, today: DateStr): Promise<number> {
  const from = s.settledThrough ? addDays(s.settledThrough, 1) : s.startDate;
  const yesterday = addDays(today, -1);
  const to = yesterday < s.endDate ? yesterday : s.endDate;
  if (from > to) return s.freezeTokens;

  // Rest days count as complete even if the app was never opened that day.
  for (const date of eachDay(from, to)) {
    if (dayKind(date, s) === "rest") await recomputeDay(date);
  }

  const result = settleDays({ records: await loadRecords(), from, to, freezeTokens: s.freezeTokens });
  const claimed = await Settings.updateOne(
    { _id: SETTINGS_ID, settledThrough: s.settledThrough },
    { $set: { settledThrough: to, freezeTokens: result.freezeTokens } },
  );
  if (claimed.modifiedCount === 0) return (await getSettings()).freezeTokens;

  if (result.changed.length > 0) {
    await DayLog.bulkWrite(
      result.changed.map((r) => ({
        updateOne: { filter: { date: r.date }, update: { $set: { freezeUsed: r.freezeUsed } }, upsert: true },
      })),
    );
  }
  // Record the unfinished work of each closed day: it rolls into the next plan.
  for (const [date, open] of await gapsOfDays(from, to)) {
    const change = carryOverChange(date, open.gap);
    if (change) await logPlanChange(change, today);
  }
  if (result.events.length > 0) {
    await Notification.insertMany(
      result.events.map((e) => ({ kind: e.type === "freeze-earned" ? "milestone" : "streak", ...EVENT_COPY[e.type](e) })),
    );
  }
  return result.freezeTokens;
}

/** Per-difficulty minutes, adjusted by how long your own first solves took. */
export async function loadCosts(): Promise<Costs> {
  const rows = await ProblemProgress.find(
    { status: "solved", timeTakenMin: { $gt: 0 }, reviewCount: 0 },
    { slug: 1, timeTakenMin: 1 },
  )
    .sort({ updatedAt: -1 })
    .limit(120)
    .lean();
  const history = rows.flatMap((r) => {
    const p = problemBySlug.get(r.slug);
    return p && p.track === "main" && r.timeTakenMin ? [{ difficulty: p.difficulty, minutes: r.timeTakenMin }] : [];
  });
  return estimateCosts(history);
}

/** Current progress in the shape the planner takes. */
export async function loadPlanInputs(): Promise<{ problems: ProblemState[]; reviews: ReviewState[]; subtopics: SubtopicState[]; costs: Costs; overrides: HoursOverride[]; personal: Personalisation }> {
  const [progressRows, doneSubtopics, costs, personal] = await Promise.all([
    ProblemProgress.find({}, { slug: 1, status: 1, nextReviewAt: 1 }).lean(),
    SubtopicProgress.find({}, { subtopicId: 1 }).lean(),
    loadCosts(),
    loadPersonalisation(),
  ]);
  const solved = new Set(progressRows.filter((p) => p.status === "solved").map((p) => p.slug));
  const done = new Set(doneSubtopics.map((d) => d.subtopicId));
  return {
    problems: problems.map((p) => ({ slug: p.slug, track: p.track, order: p.order, solved: solved.has(p.slug), difficulty: p.difficulty })),
    reviews: progressRows.filter((p) => p.nextReviewAt).map((p) => ({ slug: p.slug, nextReviewAt: p.nextReviewAt! })),
    subtopics: subtopics.map((t) => {
      const weight = personal.weights.get(t.topicId)?.weight;
      return { id: t.id, week: t.week, position: t.position, done: done.has(t.id), ...(weight !== undefined ? { weight } : {}) };
    }),
    costs,
    overrides: personal.overrides,
    personal,
  };
}

async function draftFor(s: AppSettings, date: DateStr, extra: { hoursOverride?: number } = {}): Promise<DailyPlanDraft> {
  return buildDailyPlan({ date, settings: s, ...(await loadPlanInputs()), ...extra });
}

/** Drop undefined keys so optional time fields don't reach Mongo as null. */
function defined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

async function createPlanIfMissing(s: AppSettings, date: DateStr): Promise<DailyPlanDraft> {
  const existing = await DailyPlan.findOne({ date }).lean();
  if (existing) return toDraft(existing);

  const draft = await draftFor(s, date);
  // Upsert-on-insert keeps the plan frozen even if two requests race here.
  await DailyPlan.updateOne({ date }, { $setOnInsert: defined(draft) }, { upsert: true });
  return toDraft((await DailyPlan.findOne({ date }).lean())!);
}

function toDraft(doc: {
  date: string;
  weekNumber: number;
  kind: string;
  dsaTarget: number;
  dsaNew?: string[];
  dsaReview?: string[];
  jsProblem?: string | null;
  sqlProblem?: string | null;
  theoryTarget: number;
  theory?: string[];
  hours?: number | null;
  estMinutes?: number | null;
  bonusDsa?: string[] | null;
  bonusTheory?: string[] | null;
}): DailyPlanDraft {
  return {
    date: doc.date,
    weekNumber: doc.weekNumber,
    kind: doc.kind as DailyPlanDraft["kind"],
    dsaTarget: doc.dsaTarget,
    dsaNew: doc.dsaNew ?? [],
    dsaReview: doc.dsaReview ?? [],
    jsProblem: doc.jsProblem ?? null,
    sqlProblem: doc.sqlProblem ?? null,
    theoryTarget: doc.theoryTarget,
    theory: doc.theory ?? [],
    ...(doc.hours != null ? { hours: doc.hours } : {}),
    ...(doc.estMinutes != null ? { estMinutes: doc.estMinutes } : {}),
    ...(doc.bonusDsa ? { bonusDsa: doc.bonusDsa } : {}),
    ...(doc.bonusTheory ? { bonusTheory: doc.bonusTheory } : {}),
  };
}

export const REPLAN_MIN_HOURS = 1;
export const REPLAN_MAX_HOURS = 12;

/**
 * "I only have N hours today": re-plan today from that budget. Anything already
 * done today stays on the list, the day's targets are recomputed for the new
 * hours, and a finished day can't be re-planned (that would rewrite the streak).
 */
export async function replanToday(hours: number, now = new Date()): Promise<DailyPlanDraft> {
  if (!Number.isFinite(hours) || hours < REPLAN_MIN_HOURS || hours > REPLAN_MAX_HOURS) {
    throw new Error(`Pick between ${REPLAN_MIN_HOURS} and ${REPLAN_MAX_HOURS} hours`);
  }
  await connectDb();
  const settings = await getSettings();
  const today = todayIn(settings, now);
  const existing = await DailyPlan.findOne({ date: today }).lean();
  if (!existing) throw new Error("Today's plan hasn't been created yet");
  if (existing.kind === "rest" || existing.kind === "outside") throw new Error("There is nothing to plan today");
  const { day } = await recomputeDay(today);
  if (day.complete) throw new Error("Today is already complete");

  const [fresh, solvedToday, doneToday] = await Promise.all([
    draftFor(settings, today, { hoursOverride: hours }),
    ProblemProgress.find({ solveDates: today }, { slug: 1 }).lean(),
    SubtopicProgress.find({ doneOn: today }, { subtopicId: 1 }).lean(),
  ]);
  const solved = new Set(solvedToday.map((r) => r.slug));
  const doneSubs = new Set(doneToday.map((r) => r.subtopicId));
  const keep = <T,>(old: readonly T[] | undefined, isDone: (x: T) => boolean) => (old ?? []).filter(isDone);
  const merge = <T,>(kept: readonly T[], next: readonly T[], target: number) =>
    [...kept, ...next.filter((x) => !kept.includes(x))].slice(0, Math.max(target, kept.length));

  const dsaNew = merge(keep(existing.dsaNew, (x) => solved.has(x)), fresh.dsaNew, fresh.dsaTarget);
  const theory = merge(keep(existing.theory, (x) => doneSubs.has(x)), fresh.theory, fresh.theoryTarget);
  const dsaReview = merge(keep(existing.dsaReview, (x) => solved.has(x)), fresh.dsaReview, fresh.dsaReview.length);

  const update = {
    dsaTarget: fresh.dsaTarget,
    dsaNew,
    dsaReview,
    jsProblem: existing.jsProblem && solved.has(existing.jsProblem) ? existing.jsProblem : fresh.jsProblem,
    sqlProblem: existing.sqlProblem && solved.has(existing.sqlProblem) ? existing.sqlProblem : fresh.sqlProblem,
    theoryTarget: fresh.theoryTarget,
    theory,
    hours,
    ...(fresh.estMinutes !== undefined ? { estMinutes: fresh.estMinutes } : {}),
    ...(fresh.bonusDsa ? { bonusDsa: fresh.bonusDsa } : {}),
    ...(fresh.bonusTheory ? { bonusTheory: fresh.bonusTheory } : {}),
  };
  await DailyPlan.updateOne({ date: today }, { $set: update });
  await recomputeDay(today);
  await logPlanChange(
    replanChange(today, hours, { dsa: existing.dsaTarget, theory: existing.theoryTarget }, { dsa: fresh.dsaTarget, theory: fresh.theoryTarget }),
    today,
  );
  return toDraft((await DailyPlan.findOne({ date: today }).lean())!);
}

/**
 * Idempotent daily bootstrap, called on dashboard load and by the morning
 * cron: settle past days, freeze today's plan, recount today.
 */
export async function ensureToday(now = new Date()): Promise<TodayState & { planCreated: boolean }> {
  await connectDb();
  const settings = await getSettings();
  const today = todayIn(settings, now);
  const freezeTokens = await settlePastDays(settings, today);
  const hadPlan = !!(await DailyPlan.exists({ date: today }));
  const plan = await createPlanIfMissing(settings, today);
  const { day } = await recomputeDay(today);
  const records = await loadRecords();
  return {
    today,
    settings: { ...settings, freezeTokens },
    plan,
    day,
    streak: currentStreak(records, today),
    best: bestStreak(records.values()),
    freezeTokens,
    planCreated: !hadPlan,
  };
}

export async function getPlan(date: DateStr): Promise<DailyPlanDraft | null> {
  await connectDb();
  const doc = await DailyPlan.findOne({ date }).lean();
  return doc ? toDraft(doc) : null;
}
