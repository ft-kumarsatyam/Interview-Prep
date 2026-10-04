import { toLocalDate } from "@/core/domain/dates";
import { env } from "@/core/env";
import type { NotifyChannel } from "@/core/notify";
import { calendarHeadsUp, designTopicMail, resumeCheck, type HeadsUp } from "@/modules/notifications/domain/heads-up";
import { notify } from "@/modules/notifications/services/notifications";
import type { TodayState } from "@/modules/planner/services/plan";
import { todaysDesignCase } from "@/modules/progress/services/briefing";
import { getBaseResume } from "@/modules/resume/services/resume";

type State = Pick<TodayState, "today" | "settings">;
export type HeadsUpResult = { sent: boolean; pushed?: string[]; reason?: string };

/** Saves and pushes one message; the dedupe key makes a retry or a second scheduler silent. */
async function send(
  kind: "calendar" | "resume" | "design",
  mail: HeadsUp,
  dedupeKey: string,
  push: boolean,
  channels?: readonly NotifyChannel[],
): Promise<HeadsUpResult> {
  const res = await notify({ kind, title: mail.title, body: mail.body, dedupeKey }, { push, channels, pushContent: { title: mail.title, body: mail.text, html: mail.html, spec: mail.spec } });
  return { sent: res.created, pushed: res.pushed };
}

/** The evening before: tomorrow's mock or day off, and the countdown as the plan end nears. */
export async function sendCalendarHeadsUp(state: State, channels?: readonly NotifyChannel[]): Promise<HeadsUpResult> {
  const { settings, today } = state;
  const mail = calendarHeadsUp({ today, settings, mockSchedule: settings.mockSchedule, appUrl: env().APP_URL });
  if (!mail) return { sent: false, reason: "nothing different tomorrow" };
  return send("calendar", mail, `calendar:${today}`, settings.mail.calendar, channels);
}

/** At most once a month: no resume saved, or one that has not been touched in 30 days. */
export async function sendResumeCheck(state: State, channels?: readonly NotifyChannel[]): Promise<HeadsUpResult> {
  const { settings, today } = state;
  const base = await getBaseResume();
  const updatedOn = base ? toLocalDate(new Date(base.updatedAt), settings.timezone) : null;
  const mail = resumeCheck({ today, updatedOn, appUrl: env().APP_URL });
  if (!mail) return { sent: false, reason: "resume is fresh" };
  return send("resume", mail, `resume:${mail.reason}:${today.slice(0, 7)}`, settings.mail.resume, channels);
}

/** Today's system design case on its own, so it is not buried in the long briefing. */
export async function sendDesignTopic(state: State, channels?: readonly NotifyChannel[]): Promise<HeadsUpResult> {
  const { settings, today } = state;
  const topic = await todaysDesignCase();
  if (!topic) return { sent: false, reason: "every case studied" };
  return send("design", designTopicMail({ ...topic, appUrl: env().APP_URL }), `design:${today}`, settings.mail.design, channels);
}
