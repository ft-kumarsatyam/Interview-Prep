import { eveningReminder } from "@/lib/domain/reminders";
import type { Extractor } from "@/lib/news/extract";
import type { FeedFetcher } from "@/lib/news/fetch";
import type { NotifyChannel } from "@/lib/notify";
import { syncLeetCode } from "./leetcode-sync";
import { buildEveningMail, buildMorningMail, roastReminder } from "./mail-content";
import { prefetchArticleContent, refreshNews } from "./news";
import { notify } from "./notifications";
import { ensureToday } from "./plan";
import { proposeRebalance } from "./rebalance";
import { markRun } from "./settings";

type StepResult = { ok: true; detail: unknown } | { ok: false; error: string };

async function step(fn: () => Promise<unknown>): Promise<StepResult> {
  try {
    return { ok: true, detail: await fn() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * 08:00 IST: settle yesterday, freeze today's plan and post it first (the full
 * digest goes to email/Telegram, so the slow steps can't delay it), then refresh
 * news and pull LeetCode solves. Each step is independent.
 */
export async function runMorning(
  now = new Date(),
  deps: { channels?: readonly NotifyChannel[]; fetcher?: FeedFetcher; extractor?: Extractor } = {},
) {
  const { channels, fetcher, extractor } = deps;
  let today: string | null = null;
  const plan = await step(async () => {
    const state = await ensureToday(now);
    today = state.today;
    const mail = await buildMorningMail(state);
    if (!mail) return { kind: state.plan.kind, notified: false };
    const res = await notify({ kind: "plan", ...mail.inApp, dedupeKey: `plan:${state.today}` }, { push: true, channels, pushContent: mail.push });
    return { kind: state.plan.kind, notified: res.created, pushed: res.pushed };
  });
  const rebalance = await step(async () => ((await proposeRebalance(now)) ? "proposed" : "none"));
  const news = await step(() => refreshNews({ force: true, now, fetcher }));
  const articles = await step(() => prefetchArticleContent({ extractor }));
  const leetcode = await step(() => syncLeetCode({ force: true, now }));
  await markRun("lastMorningRunAt", now);
  return { today, news, articles, plan, rebalance, leetcode };
}

/**
 * 23:59 (the job may land up to half an hour either side): email the day's
 * recap. What was done, what is left, the streak standing and tomorrow's
 * adjusted plan. Once per day; a retry or a second scheduler is silent.
 */
export async function runEvening(now = new Date(), channels?: readonly NotifyChannel[]) {
  const leetcode = await step(() => syncLeetCode({ now }));
  const state = await ensureToday(now);
  await markRun("lastEveningRunAt", now);
  const mail = await buildEveningMail(now, state);
  if (!mail) return { today: state.today, recapped: false, leetcode };
  const res = await notify({ kind: "recap", ...mail.inApp, dedupeKey: `recap:${mail.date}` }, { push: true, channels, pushContent: mail.push });
  return { today: state.today, date: mail.date, recapped: res.created, pushed: res.pushed, leetcode };
}

/**
 * Optional mid-evening nudge (for a free external scheduler such as
 * cron-job.org; Vercel Hobby only has two daily slots): if today's still
 * incomplete, remind via the in-app bell plus Telegram/email.
 */
export async function runReminder(now = new Date(), channels?: readonly NotifyChannel[]) {
  const state = await ensureToday(now);
  const msg = eveningReminder(state.day, state.streak);
  if (!msg) return { today: state.today, reminded: false };
  const res = await notify({ kind: "reminder", ...msg, dedupeKey: `reminder:${state.today}` }, { push: true, channels, pushContent: roastReminder(msg, state) });
  return { today: state.today, reminded: res.created, pushed: res.pushed };
}
