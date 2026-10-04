import type { Extractor } from "@/modules/news/lib/extract";
import type { FeedFetcher } from "@/modules/news/lib/fetch";
import type { NotifyChannel } from "@/core/notify";
import { sendBriefing } from "@/modules/progress/services/briefing";
import { syncLeetCode } from "@/modules/dsa/services/leetcode-sync";
import { buildEveningMail, buildMorningMail, buildNudgeMail, buildWeeklyMail } from "@/modules/notifications/services/mail-content";
import { prefetchArticleContent, refreshNews } from "@/modules/news/services/news";
import { notify } from "@/modules/notifications/services/notifications";
import { ensureToday } from "@/modules/planner/services/plan";
import { proposeRebalance } from "@/modules/planner/services/rebalance";
import { markRun } from "@/modules/settings/services/settings";
import { getBroker } from "@/core/broker";
import { relayOutbox } from "@/core/events/relay";
import { ensureEventHandlers } from "@/core/services/event-handlers";

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
 * news (and prefetch article text) while pulling LeetCode solves in parallel. Each step is isolated.
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
    const res = await notify({ kind: "plan", ...mail.inApp, dedupeKey: `plan:${state.today}` }, { push: state.settings.mail.morning, channels, pushContent: mail.push });
    return { kind: state.plan.kind, notified: res.created, pushed: res.pushed };
  });
  const rebalance = await step(async () => ((await proposeRebalance(now)) ? "proposed" : "none"));
  // News (then the prefetch that depends on it) and the LeetCode sync don't touch each other, so they overlap.
  const [newsChain, leetcode] = await Promise.all([
    (async () => {
      const news = await step(() => refreshNews({ force: true, now, fetcher }));
      const articles = await step(() => prefetchArticleContent({ extractor }));
      return { news, articles };
    })(),
    step(() => syncLeetCode({ force: true, now })),
  ]);
  const { news, articles } = newsChain;
  // Deliver events queued by the steps above (article indexing) and any retries that are due.
  const events = await step(async () => {
    ensureEventHandlers();
    return relayOutbox({ broker: getBroker(), limit: 50 });
  });
  // The briefing needs fresh news, so it follows the refresh. The briefing job sends it too if this run slips.
  const briefing = await step(async () => sendBriefing(await ensureToday(now), now, channels));
  await markRun("lastMorningRunAt", now);
  return { today, news, articles, plan, briefing, rebalance, leetcode, events };
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
  // On the Sunday that just ended the weekly report follows the recap. It is its own step so a failure can't lose the recap.
  const weekly = await step(async () => {
    const report = await buildWeeklyMail(now, state);
    if (!report) return { sent: false };
    const res = await notify({ kind: "recap", ...report.inApp, dedupeKey: `weekly:${report.date}` }, { push: state.settings.mail.weekly, channels, pushContent: report.push });
    return { sent: res.created, pushed: res.pushed, date: report.date };
  });
  if (!mail) return { today: state.today, recapped: false, leetcode, weekly };
  const res = await notify({ kind: "recap", ...mail.inApp, dedupeKey: `recap:${mail.date}` }, { push: state.settings.mail.night, channels, pushContent: mail.push });
  return { today: state.today, date: mail.date, recapped: res.created, pushed: res.pushed, leetcode, weekly };
}

/**
 * The evening nudge (for a free external scheduler such as cron-job.org or the repo's GitHub Actions
 * workflow; Vercel Hobby only has two daily slots): if today is still unfinished, say exactly what is
 * left through the in-app bell plus every configured channel. Once per day; silent on finished days.
 */
export async function runReminder(now = new Date(), channels?: readonly NotifyChannel[]) {
  const state = await ensureToday(now);
  const mail = await buildNudgeMail(state, now);
  if (!mail) return { today: state.today, reminded: false };
  const res = await notify({ kind: "reminder", ...mail.inApp, dedupeKey: `reminder:${state.today}` }, { push: state.settings.mail.nudge, channels, pushContent: mail.push });
  return { today: state.today, reminded: res.created, pushed: res.pushed };
}
