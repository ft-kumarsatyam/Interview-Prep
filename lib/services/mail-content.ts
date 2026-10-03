import { subtopicById } from "@/lib/content";
import { morningPlanMessage } from "@/lib/domain/reminders";
import { pickRoast, withRoast, type PushContent, type RoastSlot } from "@/lib/domain/roast";
import { env } from "@/lib/env";
import { buildMorningDigest } from "./digest";
import type { TodayState } from "./plan";
import { buildEveningRecap } from "./recap";

export interface DailyMail {
  /** What the in-app bell shows. */
  inApp: { title: string; body: string };
  /** What goes to email / Telegram. */
  push: PushContent;
}

function roasted(push: PushContent, state: Pick<TodayState, "settings">, slot: RoastSlot, seed: string): PushContent {
  return state.settings.roastMode ? withRoast(push, pickRoast(slot, seed, env().ADMIN_NAME)) : push;
}

/** The 08:00 message: today's plan, as a full digest when there is one. Null outside the plan window. */
export async function buildMorningMail(state: TodayState, seed: string = state.today): Promise<DailyMail | null> {
  const rest = state.plan.kind === "rest";
  const inApp = rest
    ? { title: "Day off", body: "Nothing is due today. The plan has been spread over the coming days." }
    : morningPlanMessage(state.day, state.plan.theory.flatMap((id) => subtopicById.get(id)?.title ?? []));
  if (!inApp) return null;
  const digest = await buildMorningDigest(state);
  const push = digest ? { title: digest.title, body: digest.text, html: digest.html } : inApp;
  return { inApp, push: roasted(push, state, rest ? "rest" : "morning", seed) };
}

/** The 23:59 recap. Done days get praise, unfinished days get roasted. */
export async function buildEveningMail(now: Date, state: TodayState, seed?: string): Promise<(DailyMail & { date: string }) | null> {
  const recap = await buildEveningRecap(now, state);
  if (!recap) return null;
  const slot: RoastSlot = recap.rest ? "rest" : recap.complete ? "done" : "evening";
  return {
    date: recap.date,
    inApp: { title: recap.title, body: recap.summary },
    push: roasted({ title: recap.title, body: recap.text, html: recap.html }, state, slot, seed ?? recap.date),
  };
}

export function roastReminder(msg: { title: string; body: string }, state: TodayState): PushContent {
  return roasted(msg, state, "evening", `reminder:${state.today}`);
}
