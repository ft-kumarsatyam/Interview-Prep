import { addDays, diffDays, type DateStr } from "@/core/domain/dates";
import type { Pace } from "@/modules/planner/domain/pace";
import { revisionStart } from "@/modules/planner/domain/planner";
import type { PlanSettings } from "@/modules/planner/domain/plan-config";
import type { MailBacklog } from "@/modules/progress/domain/backlog-items";
import { renderMail, type MailSpec, type MailStat } from "@/modules/notifications/domain/mail-html";
import { backlogSections, joinList, paceLine, plural, type DigestLink } from "@/modules/notifications/domain/reminders";
import type { DayProgress } from "@/modules/progress/domain/streak";

/** What a day leaves undone. Unsolved problems and unfinished subtopics stay at the front of the next plan, so this is what carries over. */
export interface DayGap {
  dsa: number;
  theory: number;
  quiz: boolean;
}

export const NO_GAP: DayGap = { dsa: 0, theory: 0, quiz: false };

export function dayGap(p: DayProgress): DayGap {
  if (p.kind === "rest" || p.kind === "outside") return NO_GAP;
  if (p.kind === "sunday") return { dsa: 0, theory: 0, quiz: !p.quizPassed };
  return { dsa: Math.max(0, p.dsaTarget - p.dsaSolved), theory: Math.max(0, p.theoryTarget - p.theoryDone), quiz: !p.quizPassed };
}

export const gapIsEmpty = (g: DayGap): boolean => g.dsa === 0 && g.theory === 0 && !g.quiz;

export function describeGap(g: DayGap, quizName = "the daily quiz"): string[] {
  const out: string[] = [];
  if (g.dsa > 0) out.push(plural(g.dsa, "DSA problem"));
  if (g.theory > 0) out.push(plural(g.theory, "theory subtopic"));
  if (g.quiz) out.push(quizName);
  return out;
}

/** "Yesterday left X undone" for the morning email; null when nothing carried over. */
export function carryOverLine(gap: DayGap, yesterdayKind: DayProgress["kind"]): string | null {
  if (gapIsEmpty(gap)) return null;
  const items = describeGap(gap, yesterdayKind === "sunday" ? "the weekly quiz" : "the daily quiz");
  const queue = gap.dsa > 0 || gap.theory > 0 ? " The unfinished problems and subtopics are first in today's queue, so nothing is lost." : "";
  return `Yesterday left ${joinList(items)} undone.${queue}`;
}

export const FORECAST_MIN_SOLVES = 5;

export interface Forecast {
  /** Main-track problems per calendar day over the recent window. */
  perDay: number;
  finishDate: DateStr;
  /** Days the finish lands before (positive) or after (negative) the end of the study phase. */
  daysVsPlan: number;
}

/** When the main DSA list finishes if the last `windowDays` of pace continued. Null with too few recent solves or nothing left. */
export function forecastFinish(input: {
  today: DateStr;
  solvedMain: number;
  totalMain: number;
  recentSolved: number;
  windowDays: number;
  settings: PlanSettings;
}): Forecast | null {
  const remaining = input.totalMain - input.solvedMain;
  // A couple of solves in two weeks says nothing about pace; skip rather than promise a 2049 finish.
  if (remaining <= 0 || input.recentSolved < FORECAST_MIN_SOLVES) return null;
  const perDay = input.recentSolved / input.windowDays;
  const finishDate = addDays(input.today, Math.ceil(remaining / perDay));
  const studyEnd = addDays(revisionStart(input.settings), -1);
  return { perDay, finishDate, daysVsPlan: diffDays(studyEnd, finishDate) };
}

export function forecastLine(f: Forecast): string {
  const rate = `${f.perDay.toFixed(1)} problems a day`;
  if (f.daysVsPlan >= 0) return `At ${rate} you finish the DSA list on ${f.finishDate}, ${plural(f.daysVsPlan, "day")} before revision starts.`;
  return `At ${rate} you finish the DSA list on ${f.finishDate}, ${plural(-f.daysVsPlan, "day")} after revision is due to start. Tomorrow's plan leans on the days you have left.`;
}

export type StreakStanding =
  | { type: "kept"; streak: number }
  | { type: "freeze-used"; streak: number }
  | { type: "at-risk"; streak: number; freezeTokens: number }
  | { type: "broken" }
  | { type: "none" };

export function streakStanding(input: { complete: boolean; settled: boolean; freezeUsed: boolean; freezeTokens: number; streak: number }): StreakStanding {
  if (input.complete) return { type: "kept", streak: input.streak };
  if (input.freezeUsed) return { type: "freeze-used", streak: input.streak };
  if (input.settled) return input.streak > 0 ? { type: "kept", streak: input.streak } : { type: "broken" };
  return input.streak > 0 || input.freezeTokens > 0 ? { type: "at-risk", streak: input.streak, freezeTokens: input.freezeTokens } : { type: "none" };
}

export function streakLine(s: StreakStanding): string | null {
  switch (s.type) {
    case "kept":
      return s.streak > 0 ? `Streak: ${plural(s.streak, "day")}, kept.` : null;
    case "freeze-used":
      return "A freeze token covered today, so your streak holds.";
    case "at-risk":
      return s.freezeTokens > 0
        ? `Today isn't complete. A freeze token (${s.freezeTokens} left) will cover it at midnight, but it's best to finish.`
        : `Today isn't complete and you have no freeze tokens: your ${s.streak}-day streak resets at midnight unless you finish.`;
    case "broken":
      return "Today was missed, so the streak has reset. Tomorrow is a fresh start.";
    default:
      return null;
  }
}

export interface TomorrowPreview {
  date: DateStr;
  kind: DayProgress["kind"];
  dsaTarget: number;
  theoryTarget: number;
  problems: DigestLink[];
  reviews: DigestLink[];
  theory: DigestLink[];
  estMinutes?: number;
}

export interface RecapInput {
  date: DateStr;
  day: DayProgress;
  complete: boolean;
  doneProblems: DigestLink[];
  doneTheory: DigestLink[];
  readings: number;
  quiz: { passed: boolean; bestPct: number | null };
  /** Planned items still not done tonight. */
  leftProblems: DigestLink[];
  leftTheory: DigestLink[];
  standing: StreakStanding;
  /** Current streak in days, for the stats row. */
  streak?: number;
  tomorrow: TomorrowPreview | null;
  pace: Pace | null;
  forecast: Forecast | null;
  /** Sunday only: how the week went. */
  week?: { completedDays: number; workDays: number; solved: number };
  /** What is still owed beyond tomorrow's plan, already turned into links. */
  backlog?: MailBacklog | null;
  appUrl?: string;
}

interface Section {
  heading: string;
  items?: DigestLink[];
  lines?: string[];
}

/** How much of a day's list is finished: problems, theory and the quiz (rest days have none). */
export function dayCompletion(day: DayProgress): { done: number; total: number; pct: number } {
  const total = day.dsaTarget + day.theoryTarget + (day.kind === "rest" ? 0 : 1);
  const done = Math.min(day.dsaSolved, day.dsaTarget) + Math.min(day.theoryDone, day.theoryTarget) + (day.kind !== "rest" && day.quizPassed ? 1 : 0);
  return { done, total, pct: total === 0 ? 100 : Math.round((100 * done) / total) };
}

const minutesText = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim() : `${m} min`);

/** The end-of-day email: what got done, what's left, how tomorrow adapts. Null for days outside the plan. */
export function eveningRecap(input: RecapInput): { title: string; summary: string; text: string; html: string; spec: MailSpec } | null {
  const { day } = input;
  if (day.kind === "outside") return null;
  const gap = dayGap(day);
  const { done: doneCount, total } = dayCompletion(day);
  const headline =
    day.kind === "rest"
      ? "Day off"
      : input.complete
        ? "Day complete"
        : doneCount === 0
          ? "Nothing logged today"
          : `${doneCount} of ${total} done`;
  const title = `Day recap · ${input.date} · ${headline}`;

  const sections: Section[] = [];
  let intro: string;
  if (day.kind === "rest") {
    intro = "Rest day. Nothing was due, and your streak is safe.";
  } else if (input.complete) {
    intro = "Everything due today is finished. Nicely done.";
  } else {
    intro = `Still open: ${joinList(describeGap(gap, day.kind === "sunday" ? "the weekly quiz" : "the daily quiz"))}.`;
  }

  if (day.kind !== "rest") {
    const doneLines: string[] = [];
    if (day.kind === "sunday") {
      doneLines.push(input.quiz.passed ? `Weekly quiz passed${input.quiz.bestPct !== null ? ` (${input.quiz.bestPct}%)` : ""}` : "Weekly quiz not passed yet");
    } else {
      doneLines.push(`${day.dsaSolved} of ${day.dsaTarget} DSA problems`, `${day.theoryDone} of ${day.theoryTarget} theory subtopics`);
      doneLines.push(input.quiz.passed ? `Daily quiz passed${input.quiz.bestPct !== null ? ` (${input.quiz.bestPct}%)` : ""}` : "Daily quiz not passed yet");
    }
    if (input.readings > 0) doneLines.push(`${plural(input.readings, "article")} read`);
    sections.push({ heading: "Today's scorecard", lines: doneLines });
  }
  if (input.doneProblems.length) sections.push({ heading: "Solved today", items: input.doneProblems });
  if (input.doneTheory.length) sections.push({ heading: "Theory finished", items: input.doneTheory });
  if (input.leftProblems.length) sections.push({ heading: "Left: DSA", items: input.leftProblems });
  if (input.leftTheory.length) sections.push({ heading: "Left: theory", items: input.leftTheory });
  if (gap.quiz) sections.push({ heading: "Left: quiz", items: [{ title: day.kind === "sunday" ? "Weekly quiz" : "Daily quiz", path: "/quiz" }] });

  const lines: string[] = [];
  const sl = streakLine(input.standing);
  if (sl) lines.push(sl);
  if (input.week) {
    lines.push(`This week: ${input.week.completedDays} of ${input.week.workDays} study days completed, ${plural(input.week.solved, "problem")} solved.`);
  }

  const t = input.tomorrow;
  if (t && t.kind !== "outside") {
    const tomorrowLines: string[] = [];
    if (t.kind === "rest") tomorrowLines.push("Rest day: nothing is due.");
    else if (t.kind === "sunday") tomorrowLines.push("Sunday review: take the weekly quiz.");
    else {
      tomorrowLines.push(
        `${joinList([plural(t.dsaTarget, "DSA problem"), plural(t.theoryTarget, "theory subtopic")])}, then the daily quiz${t.estMinutes ? ` (about ${minutesText(t.estMinutes)})` : ""}.`,
      );
      if (gap.dsa > 0 || gap.theory > 0) {
        tomorrowLines.push(`It already includes the ${joinList(describeGap({ ...gap, quiz: false }))} left open tonight.`);
      }
    }
    if (input.pace && t.kind !== "rest") tomorrowLines.push(paceLine(input.pace));
    if (input.forecast) tomorrowLines.push(forecastLine(input.forecast));
    sections.push({ heading: `Tomorrow (${t.date})`, lines: tomorrowLines, items: [...t.problems, ...t.reviews, ...t.theory] });
    lines.push("Tomorrow's plan is a preview. It is rebuilt at 8:00 from whatever you finish before then.");
  }

  const owed = input.backlog && input.backlog.total > 0 ? input.backlog : null;
  if (owed && day.kind !== "rest") sections.push(...backlogSections(owed));

  const stats: MailStat[] = [];
  if (day.kind !== "rest") {
    stats.push({ label: "Done today", value: `${doneCount}/${total}`, tone: input.complete ? "good" : doneCount === 0 ? "bad" : "warn" });
    if ((input.streak ?? 0) > 0) stats.push({ label: "Streak", value: `${input.streak}d`, tone: "good" });
    if (owed) stats.push({ label: "Backlog", value: String(owed.total), tone: owed.total >= 15 ? "bad" : "warn" });
  }

  const { text, html, spec } = renderMail({
    title: `Day recap · ${input.date}`,
    kicker: headline,
    intro,
    ...(stats.length ? { stats } : {}),
    sections: sections.map((s) => ({ ...s, ...(s.heading.startsWith("Left") ? { tone: "warn" as const } : {}) })),
    footer: lines,
    ...(input.appUrl ? { appUrl: input.appUrl } : {}),
  });

  const summary = input.complete || day.kind === "rest" ? intro : `${headline}. ${intro}`;
  return { title, summary, text, html, spec };
}

/** The local calendar date a recap covers. A run that lands after midnight (cron windows are an hour wide) still reports the day that just ended. */
export function recapDate(today: DateStr, localHour: number): DateStr {
  return localHour < 6 ? addDays(today, -1) : today;
}
