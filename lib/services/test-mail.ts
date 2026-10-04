import { roastFor, withRoast, type PushContent, type RoastMailSlot } from "@/lib/domain/roast";
import { env } from "@/lib/env";
import { configuredChannels, pushToChannels, type NotifyChannel } from "@/lib/notify";
import { buildBriefing, buildTopStoryAlert } from "./briefing";
import { buildEveningMail, buildMorningMail, buildNudgeMail, buildWeeklyMail } from "./mail-content";
import { saveSentMessage, pushTag, type NotificationKind } from "./notifications";
import { ensureToday } from "./plan";

export type TestMailKind = "ping" | "morning" | "briefing" | "alerts" | "nudge" | "night" | "weekly";

const SAMPLE: Record<Exclude<TestMailKind, "ping">, PushContent & { slot: RoastMailSlot }> = {
  morning: {
    slot: "morning",
    title: "Today's targets (sample)",
    body: "Your plan hasn't started yet, so this is a sample. From the start date, this email carries the day's DSA problems, theory, the backlog you still owe, reading and pace at 08:00.",
  },
  briefing: {
    slot: "morning",
    title: "Daily briefing (sample)",
    body: "There is nothing to brief yet (no unread news or open targets), so this is a sample. Once the news has refreshed, this message lists the top stories, the system design reading and case to study, and the questions to practise.",
  },
  alerts: {
    slot: "morning",
    title: "Top story (sample)",
    body: "No standout fresh story right now, so this is a sample. When a strong story lands from your sources, it is pushed on its own like this, at most three a day.",
  },
  nudge: {
    slot: "evening",
    title: "Evening check-in (sample)",
    body: "Nothing is left to nudge about right now (today is finished, a rest day, or the plan hasn't started), so this is a sample. On an unfinished day this email lists what is left and how long you have.",
  },
  night: {
    slot: "night",
    title: "Night recap (sample)",
    body: "Your plan hasn't started yet, so this is a sample. From the start date, this email lists what you finished, what's left, your backlog, your streak and tomorrow's plan at 23:59.",
  },
  weekly: {
    slot: "weekly",
    title: "Weekly report (sample)",
    body: "Your plan hasn't started yet, so this is a sample. Every Sunday night this email shows the week's numbers, progress by track, what's owed and next week's focus.",
  },
};

/**
 * Sends a one-off copy of a real email right now: no in-app notification, no dedupe, so it can be
 * repeated. Falls back to a sample when there is nothing real to show (before the plan starts, or a
 * nudge on a finished day). The weekly test covers the most recent Sunday.
 */
export async function sendTestMail(kind: TestMailKind, now = new Date(), only?: NotifyChannel["name"]) {
  const channels = configuredChannels().filter((c) => !only || c.name === only);
  if (channels.length === 0) return null;
  const state = await ensureToday(now);
  const seed = String(now.getTime());
  const roast = (slot: RoastMailSlot, push: PushContent): PushContent => {
    const line = roastFor(state.settings.roastLevel, slot, { streak: state.streak }, seed, env().ADMIN_NAME);
    return line ? withRoast(push, line) : push;
  };

  let push: PushContent;
  let sample = false;
  if (kind === "ping") {
    push = roast("morning", { title: "PrepOS test", body: "Notifications are working. Morning plan at 08:00, recap at 23:59, weekly report on Sunday night." });
  } else {
    const mail =
      kind === "morning"
        ? await buildMorningMail(state, seed)
        : kind === "briefing" || kind === "alerts"
          ? await briefingTest(state, now, kind)
          : kind === "nudge"
          ? await buildNudgeMail(state, now, seed)
          : kind === "night"
            ? await buildEveningMail(now, state, seed)
            : await buildWeeklyMail(now, state, { force: true, seed });
    sample = !mail;
    const fallback = SAMPLE[kind];
    push = mail?.push ?? roast(fallback.slot, { title: fallback.title, body: fallback.body });
  }

  const kindOf: Record<TestMailKind, NotificationKind> = { ping: "sync", morning: "plan", briefing: "news", alerts: "news", nudge: "reminder", night: "recap", weekly: "recap" };
  const tested: PushContent = { ...push, title: `[Test] ${push.title}`, ...(push.spec ? { spec: { ...push.spec, kicker: `Test · ${push.spec.kicker ?? kind}` } } : {}) };
  const meta = channels.some((c) => c.name === "push")
    ? { content: tested, url: `/notifications/${await saveSentMessage(kindOf[kind], tested)}`, tag: pushTag(kindOf[kind], `test-${kind}`) }
    : undefined;
  const res = await pushToChannels(tested.title, push.body, channels, push.html, meta);
  return { ...res, subject: `[Test] ${push.title}`, sample, to: env().NOTIFY_EMAIL ?? null };
}

/** The real briefing, or the best unread story as an alert, as a test message. Null when there is no news yet. */
async function briefingTest(state: Awaited<ReturnType<typeof ensureToday>>, now: Date, kind: "briefing" | "alerts") {
  if (kind === "alerts") {
    const a = await buildTopStoryAlert(now);
    return a ? { inApp: { title: a.title, body: a.body }, push: { title: a.title, body: a.text, html: a.html, spec: a.spec } } : null;
  }
  const mail = await buildBriefing(state, now);
  return mail ? { inApp: { title: mail.title, body: mail.summary }, push: { title: mail.title, body: mail.text, html: mail.html, spec: mail.spec } } : null;
}
