import { orderedTopics, subtopics, topics as allTopics, trackById } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { addDays, eachDay, weekNumber, type DateStr } from "@/lib/domain/dates";
import { buildIndicators, type Indicator } from "@/lib/domain/indicators";
import { diffPlannerChanges } from "@/lib/domain/plan-changes";
import { phaseForWeek, type Phase } from "@/lib/domain/plan-config";
import { dayKind, type DailyPlanDraft } from "@/lib/domain/planner";
import { validatePlannerWindow, type PlannerInput } from "@/lib/domain/planner-profile";
import { dayItems, sprintRange, summarizeSprint, type SprintDay, type SprintSummary } from "@/lib/domain/sprint";
import { DailyPlan, DayLog, Quiz } from "@/lib/models/day";
import { Mastery } from "@/lib/models/learning";
import { ProblemProgress, SubtopicProgress } from "@/lib/models/progress";
import { Settings, SETTINGS_ID } from "@/lib/models/system";
import { projectThrough } from "./calendar";
import { ensureToday, type TodayState } from "./plan";
import { logPlanChange } from "./plan-log";
import { getSettings, type AppSettings } from "./settings";
import { minutesByDate } from "./study";

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/** Saves the goals and availability form. Logs every difference with its effect; today's frozen plan is untouched. */
export async function savePlanner(input: PlannerInput, now = new Date()): Promise<{ settings: AppSettings; changes: number }> {
  const before = await getSettings();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: before.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const problem = validatePlannerWindow(input, before, today);
  if (problem) throw new Error(problem);
  await connectDb();
  await Settings.updateOne(
    { _id: SETTINGS_ID },
    {
      $set: {
        targetRole: input.targetRole,
        targetCompany: input.targetCompany,
        preferredLanguage: input.preferredLanguage,
        priorities: input.priorities,
        endDate: input.endDate,
        hoursByDow: input.hoursByDow,
        ...(before.plannerSetupAt ? {} : { plannerSetupAt: now }),
      },
    },
    { upsert: true },
  );
  const after = await getSettings();
  const state = (s: AppSettings) => ({ profile: s.profile, startDate: s.startDate, endDate: s.endDate, hoursByDow: s.hoursByDow ?? [], restDays: s.restDays });
  const changes = diffPlannerChanges(state(before), state(after));
  for (const c of changes) await logPlanChange(c, today);
  return { settings: after, changes: changes.length };
}

export interface SprintTopic {
  id: string;
  title: string;
  track: string;
  trackName: string;
  subtopics: number;
  done: number;
}

export interface SprintView {
  today: DateStr;
  week: number;
  totalWeeks: number;
  currentWeek: number;
  from: DateStr;
  to: DateStr;
  phase: Phase | null;
  days: SprintDay[];
  topics: SprintTopic[];
  summary: SprintSummary;
}

/** One Mon–Sun plan week (pass `prior`, the result of `ensureToday`, to avoid running it again): the objectives (that week's syllabus topics), each day's real or projected targets, and progress. */
export async function getSprintView(requestedWeek?: number, now = new Date(), prior?: TodayState): Promise<SprintView> {
  const state = prior ?? (await ensureToday(now));
  const s = state.settings;
  const totalWeeks = Math.max(1, weekNumber(s.endDate, s.startDate));
  const currentWeek = clamp(weekNumber(state.today, s.startDate), 1, totalWeeks);
  const week = clamp(requestedWeek ?? currentWeek, 1, totalWeeks);
  const { from, to } = sprintRange(week, s.startDate);
  const dates = eachDay(from, to);
  await connectDb();
  const [frozen, logs, minutes, projected] = await Promise.all([
    DailyPlan.find({ date: { $gte: from, $lte: to } }).lean(),
    DayLog.find({ date: { $gte: from, $lte: to } }).lean(),
    minutesByDate(from, to),
    to > state.today ? projectThrough(s, state.today, state.plan, to) : Promise.resolve(new Map<DateStr, DailyPlanDraft>()),
  ]);
  const frozenBy = new Map(frozen.map((p) => [p.date, p]));
  const logBy = new Map(logs.map((l) => [l.date, l]));

  const days = dates.map((date): SprintDay => {
    const plan: { dsaTarget: number; theoryTarget: number; dsaReview?: string[]; estMinutes?: number | null } | undefined = frozenBy.get(date) ?? projected.get(date);
    const log = logBy.get(date);
    return {
      date,
      kind: dayKind(date, s),
      source: frozenBy.has(date) ? "frozen" : projected.has(date) ? "projected" : "none",
      dsaTarget: plan?.dsaTarget ?? 0,
      dsaSolved: log?.dsaSolved ?? 0,
      theoryTarget: plan?.theoryTarget ?? 0,
      theoryDone: log?.theoryDone ?? 0,
      reviews: plan?.dsaReview?.length ?? 0,
      quizPassed: !!log?.quizPassed,
      complete: !!log?.complete || dayKind(date, s) === "rest",
      minutes: minutes.get(date) ?? 0,
      ...(plan?.estMinutes != null ? { estMinutes: plan.estMinutes } : {}),
    };
  });

  const weekTopics = orderedTopics().filter((t) => t.week === week);
  const done = await SubtopicProgress.find({ topicId: { $in: weekTopics.map((t) => t.id) } }, { topicId: 1 }).lean();
  const doneBy = new Map<string, number>();
  for (const d of done) doneBy.set(d.topicId, (doneBy.get(d.topicId) ?? 0) + 1);

  return {
    today: state.today,
    week,
    totalWeeks,
    currentWeek,
    from,
    to,
    phase: phaseForWeek(week, totalWeeks),
    days,
    topics: weekTopics.map((t) => ({ id: t.id, title: t.title, track: t.track, trackName: trackById.get(t.track)?.name ?? t.track, subtopics: t.subtopics.length, done: doneBy.get(t.id) ?? 0 })),
    summary: summarizeSprint(days, state.today),
  };
}

const WINDOW_DAYS = 14;

export async function getIndicators(now = new Date(), prior?: TodayState): Promise<Indicator[]> {
  const state = prior ?? (await ensureToday(now));
  const s = state.settings;
  const today = state.today;
  const from14 = addDays(today, -WINDOW_DAYS);
  const yesterday = addDays(today, -1);
  const from7 = addDays(today, -6);
  await connectDb();
  const [plans, logs, minutes14, subtopicsDone, mastered, quizzes, reviewsDue] = await Promise.all([
    DailyPlan.find({ date: { $gte: from14, $lte: yesterday } }, { date: 1, kind: 1, dsaTarget: 1, theoryTarget: 1 }).lean(),
    DayLog.find({ date: { $gte: from14, $lte: today } }, { date: 1, dsaSolved: 1, theoryDone: 1, quizPassed: 1 }).lean(),
    minutesByDate(from14, today),
    SubtopicProgress.estimatedDocumentCount(),
    Mastery.countDocuments({ scope: "topic", masteredOn: { $ne: null } }),
    Quiz.find({ "attempts.0": { $exists: true } }, { bestPct: 1 }).sort({ date: -1 }).limit(7).lean(),
    ProblemProgress.countDocuments({ nextReviewAt: { $ne: null, $lte: today } }),
  ]);
  const logBy = new Map(logs.map((l) => [l.date, l]));
  let taskPlanned = 0;
  let taskDone = 0;
  for (const p of plans) {
    const l = logBy.get(p.date);
    const it = dayItems({ kind: p.kind, dsaTarget: p.dsaTarget, theoryTarget: p.theoryTarget, dsaSolved: l?.dsaSolved ?? 0, theoryDone: l?.theoryDone ?? 0, quizPassed: !!l?.quizPassed });
    taskPlanned += it.planned;
    taskDone += it.done;
  }
  const active = new Set<string>([...logs.filter((l) => (l.dsaSolved ?? 0) > 0 || (l.theoryDone ?? 0) > 0).map((l) => l.date), ...minutes14.keys()]);
  const last14Active = [...active].filter((d) => d > from14).length;
  let minutesLogged7 = 0;
  for (const [d, m] of minutes14) if (d >= from7) minutesLogged7 += m;
  const hours = s.hoursByDow ?? [];
  const minutesTarget7 = eachDay(from7, today).reduce((n, d) => n + (dayKind(d, s) === "outside" || dayKind(d, s) === "rest" ? 0 : (hours[new Date(`${d}T00:00:00Z`).getUTCDay()] ?? 0) * 60), 0);

  return buildIndicators({
    taskPlanned,
    taskDone,
    subtopicsDone,
    subtopicsTotal: subtopics.length,
    topicsMastered: mastered,
    topicsTotal: allTopics.length,
    quizAvgPct: quizzes.length ? quizzes.reduce((n, q) => n + (q.bestPct ?? 0), 0) / quizzes.length : null,
    quizCount: quizzes.length,
    minutesLogged7,
    minutesTarget7,
    activeDays14: last14Active,
    reviewsDue,
  });
}
