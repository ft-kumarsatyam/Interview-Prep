import { subtopicById } from "@/lib/content";
import { eveningReminder, morningPlanMessage } from "@/lib/domain/reminders";
import type { Extractor } from "@/lib/news/extract";
import type { FeedFetcher } from "@/lib/news/fetch";
import type { NotifyChannel } from "@/lib/notify";
import { syncLeetCode } from "./leetcode-sync";
import { prefetchArticleContent, refreshNews } from "./news";
import { notify } from "./notifications";
import { ensureToday } from "./plan";
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
 * 05:30 IST: refresh news, settle yesterday and freeze today's plan, pull
 * LeetCode solves, then post the plan. Each step is independent.
 */
export async function runMorning(
  now = new Date(),
  deps: { channels?: readonly NotifyChannel[]; fetcher?: FeedFetcher; extractor?: Extractor } = {},
) {
  const { channels, fetcher, extractor } = deps;
  const news = await step(() => refreshNews({ force: true, now, fetcher }));
  const articles = await step(() => prefetchArticleContent({ extractor }));
  let today: string | null = null;
  const plan = await step(async () => {
    const state = await ensureToday(now);
    today = state.today;
    const msg = morningPlanMessage(
      state.day,
      state.plan.theory.flatMap((id) => subtopicById.get(id)?.title ?? []),
    );
    if (!msg) return { kind: state.plan.kind, notified: false };
    const res = await notify({ kind: "plan", ...msg, dedupeKey: `plan:${state.today}` }, { push: true, channels });
    return { kind: state.plan.kind, notified: res.created, pushed: res.pushed };
  });
  const leetcode = await step(() => syncLeetCode({ force: true, now }));
  await markRun("lastMorningRunAt", now);
  return { today, news, articles, plan, leetcode };
}

/** 20:00 IST: if today's still incomplete, remind (in-app plus Telegram/email). */
export async function runEvening(now = new Date(), channels?: readonly NotifyChannel[]) {
  const leetcode = await step(() => syncLeetCode({ now }));
  const state = await ensureToday(now);
  await markRun("lastEveningRunAt", now);
  const msg = eveningReminder(state.day, state.streak);
  if (!msg) return { today: state.today, reminded: false, leetcode };
  const res = await notify({ kind: "reminder", ...msg, dedupeKey: `reminder:${state.today}` }, { push: true, channels });
  return { today: state.today, reminded: res.created, pushed: res.pushed, leetcode };
}
