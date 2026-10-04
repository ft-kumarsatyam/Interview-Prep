/**
 * The weekly report (Sunday night): the week's numbers, progress by track, what was solved, what is
 * still owed, and next week's focus. Pure: the service gathers the data, this shapes the email.
 */
import type { MailBacklog } from "@/modules/progress/domain/backlog-items";
import { asciiBar, renderMail, type MailLink, type MailSpec, type MailSection, type MailStat } from "@/modules/notifications/domain/mail-html";
import type { Pace } from "@/modules/planner/domain/pace";
import { forecastLine, type Forecast } from "@/modules/progress/domain/recap";
import { backlogSections, paceLine, plural } from "@/modules/notifications/domain/reminders";

export interface WeeklyTrackRow {
  id: string;
  name: string;
  /** Subtopics ticked overall and in total. */
  done: number;
  total: number;
  /** Subtopics ticked this week. */
  thisWeek: number;
}

export interface WeeklyInput {
  from: string;
  to: string;
  workDays: number;
  completedDays: number;
  solved: { total: number; main: number; js: number; sql: number; easy: number; medium: number; hard: number };
  topSolved: MailLink[];
  theoryTicked: number;
  theoryTitles: MailLink[];
  tracks: WeeklyTrackRow[];
  quizzes: { passed: number; taken: number; avgPct: number | null };
  studyMinutes: number;
  streak: number;
  best: number;
  pace: Pace | null;
  forecast: Forecast | null;
  backlog?: MailBacklog | null;
  nextWeek: { week: number; topics: MailLink[] } | null;
  appUrl?: string;
}

export interface WeeklyReport {
  title: string;
  summary: string;
  text: string;
  html: string;
  spec: MailSpec;
  /** Share of the week's study days completed, 0-100. */
  weekPct: number;
}

/** A text progress bar such as "██████░░░░" (the email draws a real bar in HTML). */
export const bar = asciiBar;

export const percent = (done: number, total: number): number => (total <= 0 ? 0 : Math.round((100 * done) / total));

export function formatMinutes(m: number): string {
  if (m <= 0) return "0 min";
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h === 0 ? `${r} min` : r === 0 ? `${h} h` : `${h} h ${r} min`;
}

export function weekVerdict(weekPct: number, completed: number, work: number): string {
  if (work === 0) return "No study days were planned this week.";
  if (weekPct >= 90) return `A strong week: ${completed} of ${work} study days completed.`;
  if (weekPct >= 60) return `A decent week: ${completed} of ${work} study days completed. One more session a day would close the gap.`;
  if (completed > 0) return `A light week: ${completed} of ${work} study days completed. Protect two fixed study blocks next week.`;
  return `No study day was completed this week (0 of ${work}). Next week starts with one small session on Monday.`;
}

export function weeklyReport(input: WeeklyInput): WeeklyReport {
  const weekPct = percent(input.completedDays, input.workDays);
  const title = `Week in review · ${input.from} to ${input.to} · ${input.completedDays}/${input.workDays} days`;
  const intro = weekVerdict(weekPct, input.completedDays, input.workDays);

  const stats: MailStat[] = [
    { label: "Days complete", value: `${input.completedDays}/${input.workDays}`, tone: weekPct >= 90 ? "good" : weekPct >= 60 ? "warn" : "bad" },
    { label: "Problems", value: String(input.solved.total), tone: input.solved.total > 0 ? "good" : "bad" },
    { label: "Theory ticked", value: String(input.theoryTicked) },
    { label: "Quizzes passed", value: `${input.quizzes.passed}/${input.quizzes.taken}` },
    { label: "Study time", value: formatMinutes(input.studyMinutes) },
    { label: "Streak", value: `${input.streak}d`, tone: input.streak > 0 ? "good" : "neutral" },
  ];

  const sections: MailSection[] = [];

  // Track list: one line per track with a bar, so the whole syllabus is visible at a glance.
  const trackBars = input.tracks.map((t) => ({
    label: t.name,
    pct: percent(t.done, t.total),
    detail: `(${t.done}/${t.total})${t.thisWeek > 0 ? `, +${t.thisWeek} this week` : ""}`,
  }));
  if (trackBars.length) sections.push({ heading: "Progress by track", bars: trackBars });

  const solvedLines: string[] = [];
  if (input.solved.total > 0) {
    solvedLines.push(
      `${plural(input.solved.total, "problem")}: ${input.solved.main} DSA, ${input.solved.js} JS, ${input.solved.sql} SQL`,
      `By difficulty: ${input.solved.easy} easy, ${input.solved.medium} medium, ${input.solved.hard} hard`,
    );
  } else solvedLines.push("No problems solved this week.");
  sections.push({
    heading: "Solved this week",
    lines: solvedLines,
    items: input.topSolved,
    ...(input.solved.total > input.topSolved.length ? { more: { count: input.solved.total - input.topSolved.length, path: "/dsa", label: "problems" } } : {}),
  });

  if (input.theoryTicked > 0) {
    sections.push({
      heading: "Theory finished",
      items: input.theoryTitles,
      ...(input.theoryTicked > input.theoryTitles.length ? { more: { count: input.theoryTicked - input.theoryTitles.length, path: "/learn", label: "subtopics" } } : {}),
    });
  }

  const quizLines: string[] = [];
  if (input.quizzes.taken > 0) {
    quizLines.push(`${input.quizzes.passed} of ${input.quizzes.taken} passed${input.quizzes.avgPct !== null ? `, average best score ${input.quizzes.avgPct}%` : ""}`);
  }

  const owed = input.backlog && input.backlog.total > 0 ? input.backlog : null;
  if (owed) sections.push(...backlogSections(owed));

  if (input.nextWeek && input.nextWeek.topics.length > 0) {
    sections.push({ heading: `Next week (week ${input.nextWeek.week}) focus`, tone: "info", items: input.nextWeek.topics });
  }
  if (quizLines.length) sections.push({ heading: "Quizzes", lines: quizLines });

  const footer: string[] = [];
  if (input.pace) footer.push(paceLine(input.pace));
  if (input.forecast) footer.push(forecastLine(input.forecast));
  if (input.best > 0) footer.push(`Best streak so far: ${plural(input.best, "day")}.`);

  const { text, html, spec } = renderMail({
    title,
    kicker: "Weekly report",
    intro,
    stats,
    sections,
    footer,
    cta: { label: "Open the planner", path: "/plan" },
    ...(input.appUrl ? { appUrl: input.appUrl } : {}),
  });
  return { title, summary: intro, text, html, spec, weekPct };
}
