import { designCaseBySlug, problemBySlug } from "@/lib/content";
import { classifyTags } from "@/lib/domain/article";
import {
  alertMail,
  ALERT_DAILY_CAP,
  articleLink,
  briefingDigest,
  DESIGN_CATEGORIES,
  interestTags,
  localHour,
  NEWS_CATEGORIES,
  pickAlerts,
  pickDesignReads,
  pickTopNews,
  type BriefArticle,
  type BriefLink,
} from "@/lib/domain/briefing";
import { env } from "@/lib/env";
import type { FeedFetcher } from "@/lib/news/fetch";
import type { NotifyChannel } from "@/lib/notify";
import { loadBacklogMail } from "./backlog";
import { getDesignOverview } from "./designs";
import { discoverJobs, getJobPrefs } from "./job-discovery";
import { jobsDueForFollowUp } from "./jobs";
import { listArticles, refreshNews, type ArticleItem } from "./news";
import { articleIdsIn, countSince, notify } from "./notifications";
import { ensureToday, type TodayState } from "./plan";
import { listTargets, loadCompanyGaps } from "./targets";

const POOL_LIMIT = 300;
/** The briefing goes out once the local clock passes this hour, whichever scheduler fires first. */
const BRIEFING_FROM_HOUR = 8;

const asBrief = (a: ArticleItem): BriefArticle => ({
  id: a.id,
  title: a.title,
  sourceId: a.sourceId,
  sourceName: a.sourceName,
  category: a.category,
  publishedAt: a.publishedAt,
  readingMinutes: a.readingMinutes,
  tags: a.tags,
  read: a.read,
  bookmarked: a.bookmarked,
});

async function loadPool(): Promise<BriefArticle[]> {
  const rows = await listArticles({ categories: [...new Set([...NEWS_CATEGORIES, ...DESIGN_CATEGORIES])], filter: "unread", limit: POOL_LIMIT });
  return rows.map(asBrief);
}

/** The design case to study next: a target's open case first, else the first case you have not practised. */
async function nextDesignCases(gaps: Awaited<ReturnType<typeof loadCompanyGaps>>): Promise<Array<{ slug: string; why: string }>> {
  const fromGaps = gaps.filter((g) => g.key.startsWith("design:")).slice(0, 2).map((g) => ({ slug: g.key.slice(7), why: g.note }));
  if (fromGaps.length) return fromGaps;
  const overview = await getDesignOverview();
  const open = Object.values(overview).find((d) => d.status === "new" || d.status === "studying");
  return open ? [{ slug: open.slug, why: open.status === "studying" ? "in progress" : "not started" }] : [];
}

export async function buildBriefing(state: Pick<TodayState, "today" | "plan" | "settings" | "streak">, now: Date) {
  const [pool, gaps, targets, backlog, due] = await Promise.all([
    loadPool(),
    loadCompanyGaps(),
    listTargets(),
    loadBacklogMail({ today: state.today, plan: state.plan, settings: state.settings }),
    jobsDueForFollowUp(state.today),
  ]);
  const prefs = await getJobPrefs();
  // Jobs first seen in the last two days that clear your alert threshold. Skipped until you have said what you want.
  const jobs = prefs.roles.length ? await discoverJobs({ days: 2, min: prefs.minScore, limit: 5 }, now).catch(() => null) : null;
  const interests = interestTags(targets.map((t) => t.tier));
  const news = pickTopNews(pool, now, { interests });
  const cases = await nextDesignCases(gaps);
  const first = cases[0] ? designCaseBySlug.get(cases[0].slug) : undefined;
  const reads = pickDesignReads(pool, now, {
    ...(first ? { caseKeywords: first.keywords, caseTags: classifyTags(`${first.title} ${first.keywords.join(" ")}`) } : {}),
    exclude: new Set(news.map((a) => a.id)),
  });

  const designCases: BriefLink[] = cases.flatMap((c) => {
    const dc = designCaseBySlug.get(c.slug);
    return dc ? [{ title: `Case: ${dc.title}`, path: `/design/${dc.slug}`, note: c.why }] : [];
  });
  const gapQuestions: BriefLink[] = gaps
    .filter((g) => g.key.startsWith("dsa:"))
    .slice(0, 4)
    .map((g) => {
      const p = problemBySlug.get(g.key.slice(4));
      return { title: g.title, path: g.path, note: [p?.difficulty, g.note.split(" · ")[0]].filter(Boolean).join(" · ") };
    });
  const questions = gapQuestions.length ? gapQuestions : backlog.queue.slice(0, 4);

  return briefingDigest({
    date: state.today,
    news: news.map(articleLink),
    designReads: reads.map(articleLink),
    designCases,
    questions,
    newJobs: (jobs?.items ?? []).filter((j) => j.isNew).map((j) => ({ title: `${j.title} at ${j.company}`, path: `/jobs/discover/${j.id}`, note: `${j.score}% match${j.location ? ` · ${j.location}` : ""}` })),
    followUps: due.slice(0, 5).map((j) => ({ title: `${j.title} at ${j.company}`, path: `/jobs/${j.id}`, note: j.status })),
    companies: targets.map((t) => t.name),
    streak: state.streak,
    appUrl: env().APP_URL,
  });
}

/** Sends today's briefing once. Silent when it was already sent or there is nothing to say. */
export async function sendBriefing(state: TodayState, now: Date, channels?: readonly NotifyChannel[]) {
  const mail = await buildBriefing(state, now);
  if (!mail) return { sent: false as const, reason: "nothing to say" };
  const res = await notify(
    { kind: "news", title: mail.title, body: mail.summary, dedupeKey: `briefing:${state.today}` },
    { push: state.settings.mail.briefing, channels, pushContent: { title: mail.title, body: mail.text, html: mail.html, spec: mail.spec } },
  );
  return { sent: res.created, pushed: res.pushed };
}

/** Pushes standout fresh stories as they appear, at most `ALERT_DAILY_CAP` a day, never ones the briefing already carried. */
export async function sendAlerts(state: TodayState, now: Date, channels?: readonly NotifyChannel[]) {
  if (!state.settings.mail.alerts) return { alerts: 0, skipped: "off" as const };
  const since = new Date(now.getTime() - 24 * 3_600_000);
  let room = ALERT_DAILY_CAP - (await countSince("alert:", since));
  if (room <= 0) return { alerts: 0, skipped: "daily cap" as const };
  const [pool, targets, inBriefing] = await Promise.all([loadPool(), listTargets(), articleIdsIn(`briefing:${state.today}`)]);
  const candidates = pickAlerts(pool, now, interestTags(targets.map((t) => t.tier)));
  let sent = 0;
  for (const a of candidates) {
    if (room <= 0) break;
    if (inBriefing.has(a.id)) continue;
    const mail = alertMail(a, env().APP_URL);
    const res = await notify(
      { kind: "news", title: mail.title, body: mail.body, dedupeKey: `alert:${a.id}` },
      { push: true, channels, pushContent: { title: mail.title, body: mail.text, html: mail.html, spec: mail.spec } },
    );
    if (res.created) {
      sent++;
      room--;
    }
  }
  return { alerts: sent };
}

/**
 * One tick of the news job (GitHub Actions every few hours, or any scheduler): refresh the feeds if they
 * are stale, send the daily briefing the first tick after 08:00 local, then any standout alerts.
 */
export async function runBriefingTick(now = new Date(), channels?: readonly NotifyChannel[], fetcher?: FeedFetcher) {
  const state = await ensureToday(now);
  const refreshed = await refreshNews({ now, fetcher }).then((r) => r.status, (e: unknown) => `failed: ${e instanceof Error ? e.message : String(e)}`);
  const briefing =
    localHour(now, state.settings.timezone) >= BRIEFING_FROM_HOUR
      ? await sendBriefing(state, now, channels).catch((e: unknown) => ({ sent: false as const, reason: e instanceof Error ? e.message : String(e) }))
      : { sent: false as const, reason: "before briefing hour" };
  const alerts = await sendAlerts(state, now, channels).catch((e: unknown) => ({ alerts: 0, error: e instanceof Error ? e.message : String(e) }));
  return { today: state.today, refreshed, briefing, alerts };
}

/** The best unread story right now as an alert message, for the Settings test button. Null with no unread news. */
export async function buildTopStoryAlert(now: Date) {
  const [pool, targets] = await Promise.all([loadPool(), listTargets()]);
  const top = pickTopNews(pool, now, { interests: interestTags(targets.map((t) => t.tier)), limit: 1 })[0];
  return top ? alertMail(top, env().APP_URL) : null;
}
