/**
 * The small, single-purpose messages: tomorrow's calendar heads-up, the resume check and the daily system
 * design topic. Each returns a title, a one-line in-app body and a full mail spec (so email, Telegram and
 * the PWA show the same message), or null when there is nothing worth saying. Pure.
 */
import { addDays, dayOfWeek, diffDays, type DateStr } from "@/core/domain/dates";
import { renderMail, type MailSpec } from "@/modules/notifications/domain/mail-html";
import { plural } from "@/modules/notifications/domain/reminders";
import { dayKind, revisionStart } from "@/modules/planner/domain/planner";
import type { PlanSettings } from "@/modules/planner/domain/plan-config";

export interface HeadsUp {
  title: string;
  /** One line for the in-app bell. */
  body: string;
  text: string;
  html: string;
  spec: MailSpec;
}

/** Days before the plan ends at which the countdown is announced. */
const COUNTDOWN_DAYS = [30, 14, 7, 3, 1] as const;

export interface CalendarInput {
  today: DateStr;
  settings: PlanSettings;
  mockSchedule: { dsaWeekday: number; hldWeekday: number };
  appUrl?: string;
}

/** What is different about tomorrow, and the countdown to the plan's end. Empty when it is an ordinary study day. */
export function calendarLines(i: CalendarInput): string[] {
  const tomorrow = addDays(i.today, 1);
  const kind = dayKind(tomorrow, i.settings);
  const lines: string[] = [];
  if (tomorrow === i.settings.startDate) lines.push("Tomorrow your plan begins.");
  if (kind === "rest") lines.push("Tomorrow is a day off. Nothing is due and your streak is safe.");
  if (kind === "sunday") lines.push("Tomorrow is Sunday: the weekly review quiz keeps your streak.");
  if (kind !== "outside" && kind !== "rest") {
    const dow = dayOfWeek(tomorrow);
    if (i.mockSchedule.dsaWeekday === dow) lines.push("Tomorrow is your DSA mock day.");
    if (i.mockSchedule.hldWeekday === dow) lines.push("Tomorrow is your system design mock day.");
  }
  if (tomorrow === revisionStart(i.settings) && kind !== "outside") lines.push(`Tomorrow the final ${plural(i.settings.revisionWeeks, "week")} of revision start: no new topics, only review.`);
  const left = diffDays(i.settings.endDate, i.today);
  if ((COUNTDOWN_DAYS as readonly number[]).includes(left)) lines.push(`${plural(left, "day")} left in your plan.`);
  return lines;
}

export function calendarHeadsUp(i: CalendarInput): HeadsUp | null {
  const lines = calendarLines(i);
  if (lines.length === 0) return null;
  const title = lines.length === 1 ? lines[0]!.replace(/\.$/, "") : `Tomorrow: ${lines.length} things to know`;
  const { text, html, spec } = renderMail({
    title,
    kicker: "Calendar",
    intro: lines[0]!,
    sections: lines.length > 1 ? [{ heading: "Coming up", lines: lines.slice(1), tone: "info" }] : [],
    cta: { label: "Open the calendar", path: "/calendar" },
    ...(i.appUrl ? { appUrl: i.appUrl } : {}),
  });
  return { title, body: lines.join(" "), text, html, spec };
}

/** A resume older than this is worth a look before you apply anywhere. */
export const RESUME_STALE_DAYS = 30;

export interface ResumeInput {
  today: DateStr;
  /** Null when no base resume is saved. */
  updatedOn: DateStr | null;
  appUrl?: string;
}

export type ResumeCheck = HeadsUp & { reason: "missing" | "stale" };

export function resumeCheck(i: ResumeInput): ResumeCheck | null {
  const age = i.updatedOn ? diffDays(i.today, i.updatedOn) : null;
  if (age !== null && age < RESUME_STALE_DAYS) return null;
  const missing = age === null;
  const title = missing ? "Add your resume" : `Your resume is ${age} days old`;
  const intro = missing
    ? "No resume is saved yet. Job matching scores your skills against it and tailoring works from it, so paste it once."
    : "Added a project, a skill or a new result since? Update it so job matches and tailoring use what is true today.";
  const { text, html, spec } = renderMail({
    title,
    kicker: "Resume",
    intro,
    sections: [],
    cta: { label: missing ? "Add your resume" : "Review your resume", path: "/resume" },
    ...(i.appUrl ? { appUrl: i.appUrl } : {}),
  });
  return { title, body: intro, text, html, spec, reason: missing ? "missing" : "stale" };
}

export interface DesignTopicInput {
  title: string;
  slug: string;
  /** Why this one is next, e.g. "in progress" or a target company's gap. */
  why: string;
  appUrl?: string;
}

export function designTopicMail(i: DesignTopicInput): HeadsUp {
  const title = `System design today: ${i.title}`;
  const body = `${i.why[0]?.toUpperCase() ?? ""}${i.why.slice(1)}. Read the case, sketch the design, then check yourself.`;
  const { text, html, spec } = renderMail({
    title,
    kicker: "System design",
    intro: body,
    sections: [{ heading: "Study this", items: [{ title: i.title, path: `/design/${i.slug}`, note: i.why }] }],
    cta: { label: "Open the case", path: `/design/${i.slug}` },
    ...(i.appUrl ? { appUrl: i.appUrl } : {}),
  });
  return { title, body, text, html, spec };
}
