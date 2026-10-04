import { subtopicById } from "@/core/content";
import { addDays, dayOfWeek, diffDays } from "@/core/domain/dates";
import { dayCompletion } from "@/modules/progress/domain/recap";
import { eveningReminder, morningPlanMessage } from "@/modules/notifications/domain/reminders";
import { roastFor, withRoast, type PushContent, type RoastContext, type RoastMailSlot } from "@/modules/resume/domain/roast";
import { env } from "@/core/env";
import { buildMorningDigest } from "@/modules/notifications/services/digest";
import { buildNudge } from "@/modules/progress/services/nudge";
import type { TodayState } from "@/modules/planner/services/plan";
import { buildEveningRecap } from "@/modules/progress/services/recap";
import { buildWeekly, isWeeklyDay, weeklyDate } from "@/modules/progress/services/weekly";

export interface DailyMail {
  /** What the in-app bell shows. */
  inApp: { title: string; body: string };
  /** What goes to email / Telegram / WhatsApp. */
  push: PushContent;
}

/** Leads the mail with a roast at the level chosen in Settings, using the numbers it was given. */
function roasted(push: PushContent, state: Pick<TodayState, "settings">, slot: RoastMailSlot, seed: string, ctx: RoastContext): PushContent {
  const line = roastFor(state.settings.roastLevel, slot, ctx, seed, env().ADMIN_NAME);
  return line ? withRoast(push, line) : push;
}

/** The 08:00 message: today's plan and backlog, as a full digest when there is one. Null outside the plan window. */
export async function buildMorningMail(state: TodayState, seed: string = state.today): Promise<DailyMail | null> {
  const rest = state.plan.kind === "rest";
  const inApp = rest
    ? { title: "Day off", body: "Nothing is due today. The plan has been spread over the coming days." }
    : morningPlanMessage(state.day, state.plan.theory.flatMap((id) => subtopicById.get(id)?.title ?? []));
  if (!inApp) return null;
  const digest = await buildMorningDigest(state);
  const push = digest ? { title: digest.title, body: digest.text, html: digest.html, spec: digest.spec } : inApp;
  const ctx: RoastContext = {
    streak: state.streak,
    ...(digest ? { backlog: digest.backlogTotal } : {}),
    daysLeft: Math.max(0, diffDays(state.settings.endDate, state.today)),
  };
  return { inApp, push: roasted(push, state, rest ? "rest" : "morning", seed, ctx) };
}

/** The evening nudge: what is still open today and how long is left. Null when the day is finished or has no work. */
export async function buildNudgeMail(state: TodayState, now: Date, seed: string = `nudge:${state.today}`): Promise<DailyMail | null> {
  const nudge = await buildNudge(state, now);
  if (!nudge) return null;
  const { pct } = dayCompletion(state.day);
  const ctx: RoastContext = {
    streak: state.streak,
    backlog: nudge.backlogTotal,
    left: nudge.left,
    pct,
    quizOnly: nudge.left === 1 && !state.day.quizPassed,
  };
  // The bell keeps the short "Left: ..." line; the email carries the full nudge.
  return { inApp: eveningReminder(state.day, state.streak) ?? nudge.inApp, push: roasted({ title: nudge.title, body: nudge.text, html: nudge.html, spec: nudge.spec }, state, "evening", seed, ctx) };
}

/** The 23:59 recap. Done days get praise, unfinished days get a push. */
export async function buildEveningMail(now: Date, state: TodayState, seed?: string): Promise<(DailyMail & { date: string }) | null> {
  const recap = await buildEveningRecap(now, state);
  if (!recap) return null;
  return {
    date: recap.date,
    inApp: { title: recap.title, body: recap.summary },
    push: roasted({ title: recap.title, body: recap.text, html: recap.html, spec: recap.spec }, state, recap.rest ? "rest" : "night", seed ?? recap.date, recap.roast),
  };
}

/**
 * The weekly report. Normally only on the Sunday that just ended; `force` builds it for the most recent
 * Sunday on or before today (for the "send a test" button).
 */
export async function buildWeeklyMail(now: Date, state: TodayState, opts: { force?: boolean; seed?: string } = {}): Promise<(DailyMail & { date: string }) | null> {
  let date = weeklyDate(now, state);
  if (!isWeeklyDay(date)) {
    if (!opts.force) return null;
    date = addDays(date, -dayOfWeek(date));
  }
  const weekly = await buildWeekly(date, state);
  return {
    date,
    inApp: { title: weekly.title, body: weekly.summary },
    push: roasted({ title: weekly.title, body: weekly.text, html: weekly.html, spec: weekly.spec }, state, "weekly", opts.seed ?? `weekly:${date}`, weekly.roast),
  };
}

/** Kept for callers that already have a plain reminder message: the nudge replaces it in the daily jobs. */
export function roastReminder(msg: { title: string; body: string }, state: TodayState): PushContent {
  return roasted(msg, state, "evening", `reminder:${state.today}`, { streak: state.streak });
}
