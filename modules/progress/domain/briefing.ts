/**
 * The daily briefing and top-news alerts: what to read and what to practise, ranked from the articles
 * you already have (recency, how much a category matters for interviews, your own interests). Pure.
 */
import { diversify } from "@/modules/news/domain/article";
import { relatedArticles } from "@/modules/design/domain/design";
import { plural } from "@/modules/notifications/domain/reminders";
import { renderMail, type MailSection, type MailSpec, type MailStat } from "@/modules/notifications/domain/mail-html";

export interface BriefArticle {
  id: string;
  title: string;
  sourceId: string;
  sourceName: string;
  category: string;
  publishedAt: string | null;
  readingMinutes: number | null;
  tags: readonly string[];
  read: boolean;
  bookmarked: boolean;
}

/** Categories that count as "news" (what happened) rather than reading to study. */
export const NEWS_CATEGORIES = ["ai-labs", "ai-news", "tech-news", "engineering"] as const;
/** Categories that feed the system design reading list. */
export const DESIGN_CATEGORIES = ["system-design", "engineering", "databases"] as const;

const CATEGORY_WEIGHT: Record<string, number> = {
  "ai-labs": 3,
  "system-design": 3,
  "ai-news": 2,
  "tech-news": 2,
  engineering: 2,
  databases: 1.5,
  "interview-prep": 1.5,
  javascript: 1,
  career: 0.5,
};

const HOUR_MS = 3_600_000;
export const NEWS_MAX_AGE_H = 72;
/** A story must score at least this, and be this fresh, to interrupt you. */
export const ALERT_MIN_SCORE = 6;
export const ALERT_MAX_AGE_H = 10;
export const ALERT_DAILY_CAP = 3;

export function ageHours(a: Pick<BriefArticle, "publishedAt">, now: Date): number | null {
  return a.publishedAt ? Math.max(0, (now.getTime() - new Date(a.publishedAt).getTime()) / HOUR_MS) : null;
}

/** Higher is more worth your time now: category weight + a decay with age + your interests. */
export function scoreArticle(a: BriefArticle, now: Date, interests: readonly string[] = []): number {
  const age = ageHours(a, now);
  const recency = age === null ? 0.5 : 4 * Math.exp(-age / 36);
  const interest = Math.min(3, a.tags.filter((t) => interests.includes(t)).length * 1.5);
  const longRead = a.category === "system-design" && (a.readingMinutes ?? 0) >= 5 ? 1 : 0;
  return +(((CATEGORY_WEIGHT[a.category] ?? 1) + recency + interest + longRead + (a.bookmarked ? 1 : 0))).toFixed(2);
}

const isNews = (a: BriefArticle) => (NEWS_CATEGORIES as readonly string[]).includes(a.category);

/** The top stories: unread news from the last few days, best first, one per source. */
export function pickTopNews(articles: readonly BriefArticle[], now: Date, opts: { interests?: readonly string[]; limit?: number } = {}): BriefArticle[] {
  const ranked = articles
    .filter((a) => !a.read && isNews(a) && (ageHours(a, now) ?? 0) <= NEWS_MAX_AGE_H)
    .map((a) => ({ a, s: scoreArticle(a, now, opts.interests) }))
    .toSorted((x, y) => y.s - x.s || x.a.id.localeCompare(y.a.id))
    .map((x) => x.a);
  return diversify(ranked, 1, opts.limit ?? 5);
}

/** Stories strong and fresh enough to push on their own, best first. */
export function pickAlerts(articles: readonly BriefArticle[], now: Date, interests: readonly string[] = []): BriefArticle[] {
  return articles
    .filter((a) => !a.read && isNews(a) && (ageHours(a, now) ?? Infinity) <= ALERT_MAX_AGE_H)
    .map((a) => ({ a, s: scoreArticle(a, now, interests) }))
    .filter((x) => x.s >= ALERT_MIN_SCORE)
    .toSorted((x, y) => y.s - x.s || x.a.id.localeCompare(y.a.id))
    .map((x) => x.a);
}

/**
 * Articles to read for system design: first those that match the case you should study next, then the
 * best-scoring unread system design posts. Never repeats a story already in the news list.
 */
export function pickDesignReads(
  articles: readonly BriefArticle[],
  now: Date,
  opts: { caseKeywords?: readonly string[]; caseTags?: readonly string[]; exclude?: ReadonlySet<string>; limit?: number } = {},
): BriefArticle[] {
  const limit = opts.limit ?? 3;
  const pool = articles.filter((a) => !a.read && (DESIGN_CATEGORIES as readonly string[]).includes(a.category) && !opts.exclude?.has(a.id));
  const matched = opts.caseKeywords ? relatedArticles(pool, opts.caseKeywords, opts.caseTags ?? [], limit) : [];
  const taken = new Set(matched.map((a) => a.id));
  const rest = pool
    .filter((a) => !taken.has(a.id) && a.category === "system-design")
    .toSorted((x, y) => scoreArticle(y, now) - scoreArticle(x, now) || x.id.localeCompare(y.id));
  return [...matched, ...rest].slice(0, limit);
}

export interface BriefLink {
  title: string;
  path: string;
  note?: string;
}

export interface BriefingInput {
  date: string;
  news: BriefLink[];
  designReads: BriefLink[];
  /** The design case(s) to study next, with why. */
  designCases: BriefLink[];
  questions: BriefLink[];
  /** New postings that match your preferences. */
  newJobs?: BriefLink[];
  /** Tracked jobs whose follow-up date has arrived. */
  followUps?: BriefLink[];
  /** Targets' companies behind the questions, for the intro. */
  companies?: readonly string[];
  streak: number;
  appUrl?: string;
}

export const articleLink = (a: BriefArticle): BriefLink => ({
  title: a.title,
  path: `/news/${a.id}`,
  note: a.readingMinutes ? `${a.sourceName} · ${a.readingMinutes} min` : a.sourceName,
});

/** The daily briefing mail. Null when there is nothing to say. */
export function briefingDigest(input: BriefingInput): { title: string; text: string; html: string; spec: MailSpec; summary: string } | null {
  const sections: MailSection[] = [];
  if (input.news.length) sections.push({ heading: "Top news", tone: "info", items: input.news });
  if (input.designCases.length || input.designReads.length) {
    sections.push({ heading: "System design: study this", tone: "good", items: [...input.designCases, ...input.designReads] });
  }
  if (input.questions.length) sections.push({ heading: "Questions to practise", items: input.questions });
  if (input.newJobs?.length) sections.push({ heading: "New jobs for you", tone: "info", items: input.newJobs, more: { count: 0, path: "/jobs", label: "all jobs" } });
  if (input.followUps?.length) sections.push({ heading: "Applications to follow up", tone: "warn", lines: ["A short, polite message to the recruiter or a note on the portal is enough."], items: input.followUps });
  if (sections.length === 0) return null;

  const stats: MailStat[] = [
    { label: "News", value: String(input.news.length) },
    { label: "To read", value: String(input.designReads.length) },
    { label: "Questions", value: String(input.questions.length) },
    ...(input.newJobs?.length ? [{ label: "New jobs", value: String(input.newJobs.length), tone: "good" as const }] : []),
    ...(input.followUps?.length ? [{ label: "Follow up", value: String(input.followUps.length), tone: "warn" as const }] : []),
  ];
  const who = input.companies?.length ? ` Questions are picked for ${input.companies.slice(0, 3).join(", ")}.` : "";
  const summary = [
    input.news.length ? plural(input.news.length, "top story") : null,
    input.designReads.length + input.designCases.length ? `${plural(input.designReads.length + input.designCases.length, "design item")} to study` : null,
    input.questions.length ? plural(input.questions.length, "question") : null,
    input.newJobs?.length ? `${plural(input.newJobs.length, "new job")} for you` : null,
    input.followUps?.length ? `${plural(input.followUps.length, "application")} to follow up` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const title = `Daily briefing · ${input.date}`;
  const { text, html, spec } = renderMail({
    title,
    kicker: "Daily briefing",
    intro: `Your reading and practice for today: ${summary}.${who} None of this affects your streak.`,
    stats,
    sections,
    cta: { label: "Open the news", path: "/news" },
    ...(input.appUrl ? { appUrl: input.appUrl } : {}),
  });
  return { title, text, html, spec, summary };
}

/** One standout story, pushed on its own. */
export function alertMail(a: BriefArticle, appUrl?: string): { title: string; body: string; text: string; html: string; spec: MailSpec } {
  const link = articleLink(a);
  const title = `Top story: ${a.title}`;
  const { text, html, spec } = renderMail({
    title,
    kicker: "Top-news alert",
    intro: `${a.sourceName} just published something worth your time${a.readingMinutes ? ` (${a.readingMinutes} min read)` : ""}.`,
    sections: [{ heading: "Read it", items: [link] }],
    cta: { label: "Open in PrepOS", path: link.path },
    ...(appUrl ? { appUrl } : {}),
  });
  return { title, body: `${a.sourceName}: ${a.title}`, text, html, spec };
}

/** Article tags that matter more for the kinds of company you target (always includes the core interview ones). */
export function interestTags(tiers: readonly string[]): string[] {
  const out = new Set(["system-design", "distributed", "llm"]);
  const extra: Record<string, string[]> = {
    "big-tech": ["dsa", "databases", "reliability"],
    "large-product": ["dsa", "databases", "caching"],
    "mid-tier": ["javascript", "databases", "caching"],
    startup: ["javascript", "infra", "coding"],
    "service-mnc": ["coding", "databases"],
    "quant-fintech": ["dsa", "reliability", "queues"],
    "open-source": ["infra", "databases", "coding"],
    "ai-data": ["queues", "databases", "infra"],
  };
  for (const t of tiers) for (const tag of extra[t] ?? []) out.add(tag);
  return [...out];
}

/** Local hour (0-23) in a time zone. */
export function localHour(now: Date, timeZone: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone }).format(now));
}
