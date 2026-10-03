import { pickRoast, withRoast, type PushContent, type RoastSlot } from "@/lib/domain/roast";
import { env } from "@/lib/env";
import { configuredChannels, pushToChannels } from "@/lib/notify";
import { buildEveningMail, buildMorningMail } from "./mail-content";
import { ensureToday } from "./plan";

export type TestMailKind = "ping" | "morning" | "evening";

const SAMPLE: Record<Exclude<TestMailKind, "ping">, PushContent> = {
  morning: {
    title: "Today's targets (sample)",
    body: "Your plan hasn't started yet, so this is a sample. From the start date, this email carries the day's DSA problems, theory, reading and pace at 08:00.",
  },
  evening: {
    title: "Evening recap (sample)",
    body: "Your plan hasn't started yet, so this is a sample. From the start date, this email lists what you finished, what's left, your streak and tomorrow's plan at 23:59.",
  },
};

/**
 * Sends a one-off copy of a real email right now: no in-app notification, no
 * dedupe, so it can be repeated. Falls back to a sample before the plan starts.
 */
export async function sendTestMail(kind: TestMailKind, now = new Date()) {
  const channels = configuredChannels();
  if (channels.length === 0) return null;
  const state = await ensureToday(now);
  const seed = String(now.getTime());
  const roast = (slot: RoastSlot, push: PushContent) =>
    state.settings.roastMode ? withRoast(push, pickRoast(slot, seed, env().ADMIN_NAME)) : push;

  let push: PushContent;
  let sample = false;
  if (kind === "ping") {
    push = roast("morning", { title: "PrepOS test", body: "Notifications are working. Morning plan at 08:00, recap at 23:59." });
  } else {
    const mail = kind === "morning" ? await buildMorningMail(state, seed) : await buildEveningMail(now, state, seed);
    sample = !mail;
    push = mail?.push ?? roast(kind === "morning" ? "morning" : "evening", SAMPLE[kind]);
  }

  const res = await pushToChannels(`[Test] ${push.title}`, push.body, channels, push.html);
  return { ...res, subject: `[Test] ${push.title}`, sample, to: env().NOTIFY_EMAIL ?? null };
}
