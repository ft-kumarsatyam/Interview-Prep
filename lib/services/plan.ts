import { problems, subtopics } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { addDays, eachDay, toLocalDate, type DateStr } from "@/lib/domain/dates";
import { buildDailyPlan, dayKind, type DailyPlanDraft } from "@/lib/domain/planner";
import { bestStreak, currentStreak, settleDays, type DayRecord, type StreakEvent } from "@/lib/domain/streak";
import { DailyPlan, DayLog } from "@/lib/models/day";
import { ProblemProgress, SubtopicProgress } from "@/lib/models/progress";
import { Notification, Settings, SETTINGS_ID } from "@/lib/models/system";
import { recomputeDay, type DayState } from "./day";
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
  if (result.events.length > 0) {
    await Notification.insertMany(
      result.events.map((e) => ({ kind: e.type === "freeze-earned" ? "milestone" : "streak", ...EVENT_COPY[e.type](e) })),
    );
  }
  return result.freezeTokens;
}

async function createPlanIfMissing(s: AppSettings, date: DateStr): Promise<DailyPlanDraft> {
  const existing = await DailyPlan.findOne({ date }).lean();
  if (existing) return toDraft(existing);

  const [progressRows, doneSubtopics] = await Promise.all([
    ProblemProgress.find({}, { slug: 1, status: 1, nextReviewAt: 1 }).lean(),
    SubtopicProgress.find({}, { subtopicId: 1 }).lean(),
  ]);
  const solved = new Set(progressRows.filter((p) => p.status === "solved").map((p) => p.slug));
  const done = new Set(doneSubtopics.map((d) => d.subtopicId));
  const draft = buildDailyPlan({
    date,
    settings: s,
    problems: problems.map((p) => ({ slug: p.slug, track: p.track, order: p.order, solved: solved.has(p.slug) })),
    reviews: progressRows.filter((p) => p.nextReviewAt).map((p) => ({ slug: p.slug, nextReviewAt: p.nextReviewAt! })),
    subtopics: subtopics.map((t) => ({ id: t.id, week: t.week, position: t.position, done: done.has(t.id) })),
  });
  // Upsert-on-insert keeps the plan frozen even if two requests race here.
  await DailyPlan.updateOne({ date }, { $setOnInsert: draft }, { upsert: true });
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
  };
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
