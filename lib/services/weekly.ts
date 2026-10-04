import { mainProblemCount, problemBySlug, subtopicById, subtopics, topicById, topics, tracks } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { addDays, dayOfWeek, eachDay, weekNumber } from "@/lib/domain/dates";
import type { MailLink } from "@/lib/domain/mail-html";
import { pace } from "@/lib/domain/pace";
import { recapDate } from "@/lib/domain/recap";
import { dayKind } from "@/lib/domain/planner";
import { weeklyReport, type WeeklyReport } from "@/lib/domain/weekly";
import { env } from "@/lib/env";
import { DayLog, Quiz } from "@/lib/models/day";
import { ProblemProgress, SubtopicProgress } from "@/lib/models/progress";
import { getBacklogMail } from "./backlog";
import { countSolvedMain } from "./dashboard";
import { getPlan, type TodayState } from "./plan";
import { getForecast, localHourOf } from "./recap";
import { minutesByDate } from "./study";

const LIST_LIMIT = 8;
const THEORY_LIMIT = 6;
const NEXT_WEEK_LIMIT = 6;

/** The Sunday a weekly report would cover now (a run just after midnight still reports the Sunday that ended). */
export function weeklyDate(now: Date, state: Pick<TodayState, "today" | "settings">): string {
  return recapDate(state.today, localHourOf(now, state.settings.timezone));
}

export const isWeeklyDay = (date: string): boolean => dayOfWeek(date) === 0;

export type WeeklyMail = WeeklyReport & { date: string; roast: { weekPct: number; streak: number; solved: number; backlog: number } };

/**
 * The week ending on `date` (Monday to Sunday): study days completed, what was solved and ticked,
 * progress per track, quizzes, study time, the backlog and next week's topics. Read-only.
 */
export async function buildWeekly(date: string, state: TodayState): Promise<WeeklyMail> {
  await connectDb();
  const { settings } = state;
  const days = eachDay(addDays(date, -6), date);
  const [logs, solvedRows, tickedRows, allDone, quizRows, minutes, solvedMain, plan] = await Promise.all([
    DayLog.find({ date: { $in: days } }, { date: 1, complete: 1 }).lean(),
    ProblemProgress.find({ solveDates: { $in: days } }, { slug: 1 }).lean(),
    SubtopicProgress.find({ doneOn: { $in: days } }, { subtopicId: 1, topicId: 1 }).lean(),
    SubtopicProgress.find({}, { subtopicId: 1 }).lean(),
    Quiz.find({ date: { $in: days } }, { passed: 1, bestPct: 1 }).lean(),
    minutesByDate(days[0]!, date),
    countSolvedMain(),
    getPlan(date),
  ]);

  const work = days.filter((d) => ["study", "revision", "sunday"].includes(dayKind(d, settings)));
  const completedDays = logs.filter((l) => l.complete && work.includes(l.date)).length;

  const solved = { total: 0, main: 0, js: 0, sql: 0, easy: 0, medium: 0, hard: 0 };
  const topSolved: MailLink[] = [];
  for (const row of solvedRows) {
    const p = problemBySlug.get(row.slug);
    if (!p) continue;
    solved.total++;
    solved[p.track]++;
    solved[p.difficulty === "Easy" ? "easy" : p.difficulty === "Medium" ? "medium" : "hard"]++;
    if (topSolved.length < LIST_LIMIT) topSolved.push({ title: p.title, path: `/dsa/${p.slug}`, note: p.difficulty });
  }

  const doneIds = new Set(allDone.map((r) => r.subtopicId));
  const weekByTrack = new Map<string, number>();
  const theoryTitles: MailLink[] = [];
  for (const row of tickedRows) {
    const track = topicById.get(row.topicId)?.track;
    if (track) weekByTrack.set(track, (weekByTrack.get(track) ?? 0) + 1);
    const s = subtopicById.get(row.subtopicId);
    if (s && theoryTitles.length < THEORY_LIMIT) theoryTitles.push({ title: s.title, path: `/learn/${s.topicId}`, note: s.topicTitle });
  }
  const trackRows = tracks
    .map((t) => {
      const inTrack = subtopics.filter((s) => s.track === t.id);
      return { id: t.id, name: t.name, done: inTrack.filter((s) => doneIds.has(s.id)).length, total: inTrack.length, thisWeek: weekByTrack.get(t.id) ?? 0 };
    })
    .filter((t) => t.total > 0);

  const nextWeekNo = weekNumber(addDays(date, 1), settings.startDate);
  const nextTopics = topics.filter((t) => t.week === nextWeekNo).slice(0, NEXT_WEEK_LIMIT).map((t) => ({ title: t.title, path: `/learn/${t.id}` }));

  const backlog = await getBacklogMail({ today: date, plan: plan ?? state.plan, settings });
  const taken = quizRows.length;
  const report = weeklyReport({
    from: days[0]!,
    to: date,
    workDays: work.length,
    completedDays,
    solved,
    topSolved,
    theoryTicked: tickedRows.length,
    theoryTitles,
    tracks: trackRows,
    quizzes: {
      passed: quizRows.filter((q) => q.passed).length,
      taken,
      avgPct: taken > 0 ? Math.round(quizRows.reduce((n, q) => n + (q.bestPct ?? 0), 0) / taken) : null,
    },
    studyMinutes: [...minutes.values()].reduce((a, b) => a + b, 0),
    streak: state.streak,
    best: state.best,
    pace: pace(date, solvedMain, mainProblemCount, settings),
    forecast: await getForecast(date, settings, solvedMain),
    backlog,
    nextWeek: nextTopics.length > 0 ? { week: nextWeekNo, topics: nextTopics } : null,
    appUrl: env().APP_URL,
  });
  return { ...report, date, roast: { weekPct: report.weekPct, streak: state.streak, solved: solved.total, backlog: backlog.total } };
}
