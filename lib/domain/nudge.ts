/**
 * The evening nudge: sent in the evening only when today isn't finished. It says exactly what is left,
 * how long is left to do it, and what the streak stands to lose. Pure.
 */
import type { MailLink } from "./mail-html";
import { renderMail, type MailSpec, type MailStat } from "./mail-html";
import { dayCompletion } from "./recap";
import { isDayComplete, type DayProgress } from "./streak";
import { joinList, plural } from "./reminders";

export interface NudgeInput {
  date: string;
  day: DayProgress;
  streak: number;
  freezeTokens: number;
  leftProblems: MailLink[];
  leftTheory: MailLink[];
  /** Whole hours left before midnight (0 when under an hour). */
  hoursLeft: number;
  backlogTotal: number;
  appUrl?: string;
}

export interface Nudge {
  /** Short text for the in-app bell. */
  inApp: { title: string; body: string };
  title: string;
  text: string;
  html: string;
  spec: MailSpec;
  /** Number of items still open, for the roast and the subject. */
  left: number;
}

/** Null when there is nothing to nudge about: a finished day, a rest day, or outside the plan. */
export function eveningNudge(input: NudgeInput): Nudge | null {
  const { day } = input;
  if (day.kind === "rest" || day.kind === "outside" || isDayComplete(day)) return null;

  const { done, total, pct } = dayCompletion(day);
  const left = Math.max(0, total - done);
  const quizLeft = !day.quizPassed;
  const open: string[] = [];
  const dsaLeft = Math.max(0, day.dsaTarget - day.dsaSolved);
  const theoryLeft = Math.max(0, day.theoryTarget - day.theoryDone);
  if (day.kind === "sunday") open.push("the weekly review quiz");
  else {
    if (dsaLeft > 0) open.push(plural(dsaLeft, "DSA problem"));
    if (theoryLeft > 0) open.push(plural(theoryLeft, "theory subtopic"));
    if (quizLeft) open.push("the daily quiz");
  }

  const time = input.hoursLeft >= 1 ? `about ${plural(input.hoursLeft, "hour")} left` : "under an hour left";
  const title = `Evening check-in · ${left} left · ${time}`;
  const intro = `Still open today: ${joinList(open)}. ${time[0]!.toUpperCase()}${time.slice(1)} before midnight.`;

  const callouts: Array<{ tone: "warn" | "bad" | "info"; text: string }> = [];
  if (input.streak > 0) {
    callouts.push({
      tone: input.hoursLeft < 2 ? "bad" : "warn",
      text:
        input.freezeTokens > 0
          ? `Your ${input.streak}-day streak is on the line. A freeze would cover tonight, but you'd rather keep it.`
          : `Your ${input.streak}-day streak ends tonight if the day isn't finished.`,
    });
  }

  const sections = [];
  if (input.leftProblems.length) sections.push({ heading: "Left: DSA", tone: "warn" as const, items: input.leftProblems });
  if (input.leftTheory.length) sections.push({ heading: "Left: theory", tone: "warn" as const, items: input.leftTheory });
  if (quizLeft) sections.push({ heading: "Left: quiz", tone: "warn" as const, items: [{ title: day.kind === "sunday" ? "Weekly quiz" : "Daily quiz", path: "/quiz" }] });

  const stats: MailStat[] = [
    { label: "Done", value: `${done}/${total}`, tone: pct >= 60 ? "good" : "warn" },
    { label: "Left", value: String(left), tone: "warn" },
  ];
  if (input.streak > 0) stats.push({ label: "Streak", value: `${input.streak}d`, tone: "good" });
  if (input.backlogTotal > 0) stats.push({ label: "Backlog", value: String(input.backlogTotal), tone: input.backlogTotal >= 15 ? "bad" : "warn" });

  const footer = [left === 1 && quizLeft && dsaLeft === 0 && theoryLeft === 0 ? "Just the quiz: about ten minutes." : "Do the smallest one first. Momentum does the rest."];

  const { text, html, spec } = renderMail({
    title,
    kicker: "Evening nudge",
    intro,
    callouts,
    stats,
    sections,
    footer,
    cta: { label: "Finish today", path: "/dashboard" },
    ...(input.appUrl ? { appUrl: input.appUrl } : {}),
  });

  return { inApp: { title: "Today isn't finished", body: `${joinList(open)} still open, ${time}.` }, title, text, html, spec, left };
}
