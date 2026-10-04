import { createHash } from "node:crypto";
import { news as newsContent } from "@/core/content";
import { connectDb } from "@/core/db";
import {
  classifyTags,
  FULL_TEXT_MIN_WORDS,
  isHeadlineOnly,
  plainText,
  readingMinutes,
  wordCount,
  type ContentStatus,
} from "@/modules/news/domain/article";
import { googleNewsFeeds, mergeFeeds, NEWS_STALE_MS, retryExtractWaitSec, sortAtOf, UNDATED_PENALTY_MS, type FeedSource, type NewsItem } from "@/modules/news/domain/news";
import { Article, FeedState, Settings, SETTINGS_ID, type ArticleDoc } from "@/core/models/system";
import { extractArticle, type Extractor } from "@/modules/news/lib/extract";
import { fetchAll, type FeedFetcher, type FeedValidators } from "@/modules/news/lib/fetch";
import { firstImage, htmlToMarkdown } from "@/modules/news/lib/markdown";
import { recomputeDay } from "@/modules/planner/services/day";
import { todayIn } from "@/modules/planner/services/plan";
import { getSettings, invalidateSettings } from "@/modules/settings/services/settings";

const urlHash = (url: string) => createHash("sha1").update(url).digest("hex");

export function newsSources(googleNewsQueries: readonly string[] | null): FeedSource[] {
  return [
    ...newsContent.feeds,
    ...googleNewsFeeds(googleNewsQueries, newsContent.googleNews.defaultQueries, newsContent.googleNews.urlTemplate),
  ];
}

/**
 * Body fields for a new article. Feed bodies long enough to be the real
 * article are stored as-is ("full"); teasers stay unset so the reader or the
 * morning prefetch extracts the page; Google News links are headline-only.
 */
function contentFromFeed(item: NewsItem) {
  const base = { tags: classifyTags(item.title, item.snippet), ...(item.leadImage ? { leadImage: item.leadImage } : {}) };
  if (isHeadlineOnly(item.url)) return { ...base, contentStatus: "headline" as const };
  if (!item.contentHtml) return base;
  const markdown = htmlToMarkdown(item.contentHtml, item.url);
  if (wordCount(plainText(markdown)) < FULL_TEXT_MIN_WORDS) return base;
  return {
    content: markdown,
    contentStatus: "full" as const,
    readingMinutes: readingMinutes(markdown),
    tags: classifyTags(item.title, markdown),
    leadImage: item.leadImage ?? firstImage(markdown) ?? undefined,
  };
}

export type RefreshResult =
  | { status: "fresh"; lastFetchAt: Date }
  | { status: "ok"; inserted: number; fetched: number; failed: string[] };

/**
 * Pull every feed and upsert new articles. Claimed with a compare-and-set on
 * `newsLastFetchAt`, so the cron, the page and the refresh button can overlap.
 */
export async function refreshNews(opts: { force?: boolean; now?: Date; fetcher?: FeedFetcher } = {}): Promise<RefreshResult> {
  const now = opts.now ?? new Date();
  const s = await getSettings();
  const last = s.newsLastFetchAt;
  const minGap = opts.force ? 60_000 : NEWS_STALE_MS;
  if (last && now.getTime() - last.getTime() < minGap) return { status: "fresh", lastFetchAt: last };

  await connectDb();
  const claim = await Settings.updateOne({ _id: SETTINGS_ID, newsLastFetchAt: last }, { $set: { newsLastFetchAt: now } });
  invalidateSettings();
  if (claim.modifiedCount === 0) return { status: "fresh", lastFetchAt: now };

  const sources = newsSources(s.googleNewsQueries);
  const states = await FeedState.find({ sourceId: { $in: sources.map((x) => x.id) } }).lean<Array<{ sourceId: string; etag?: string; lastModified?: string }>>();
  const feedValidators = new Map<string, FeedValidators>(
    states.map((st) => [st.sourceId, { ...(st.etag ? { etag: st.etag } : {}), ...(st.lastModified ? { lastModified: st.lastModified } : {}) }]),
  );
  const { results, failed, validators } = await fetchAll(sources, opts.fetcher, feedValidators);
  await Settings.updateOne({ _id: SETTINGS_ID }, { $set: { newsLastFailed: failed } });
  invalidateSettings();
  if (validators.size) {
    await FeedState.bulkWrite(
      [...validators].map(([sourceId, v]) => ({
        updateOne: {
          filter: { sourceId },
          update: { $set: { checkedAt: now, ...(v.etag ? { etag: v.etag } : {}), ...(v.lastModified ? { lastModified: v.lastModified } : {}) }, $unset: { ...(v.etag ? {} : { etag: 1 }), ...(v.lastModified ? {} : { lastModified: 1 }) } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }
  const candidates = results.flatMap((r) => r.items.map((i) => i.url));
  const existing = await Article.find({ urlHash: { $in: candidates.map(urlHash) } }, { titleKey: 1, urlHash: 1 }).lean();
  const known = new Set(existing.map((a) => a.urlHash));
  const recentKeys = await Article.find({ fetchedAt: { $gte: new Date(now.getTime() - 7 * 86_400_000) } }, { titleKey: 1 }).lean();
  const items = mergeFeeds(
    results,
    newsContent.maxItemsPerFeed,
    new Set([...existing, ...recentKeys].flatMap((a) => (a.titleKey ? [a.titleKey] : []))),
  );

  const fresh = items.filter((item) => !known.has(urlHash(item.url)));

  let inserted = 0;
  if (fresh.length) {
    const res = await Article.bulkWrite(
      fresh.map((item) => ({
        updateOne: {
          filter: { urlHash: urlHash(item.url) },
          update: {
            $setOnInsert: {
              url: item.url,
              title: item.title,
              sourceId: item.sourceId,
              sourceName: item.sourceName,
              category: item.category,
              ...(item.publishedAt ? { publishedAt: item.publishedAt } : {}),
              sortAt: sortAtOf(item.publishedAt, now),
              fetchedAt: now,
              snippet: item.snippet,
              titleKey: item.titleKey,
              ...contentFromFeed(item),
            },
          },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    inserted = res.upsertedCount;
  }
  return { status: "ok", inserted, fetched: candidates.length, failed };
}

export async function isNewsStale(now = new Date()): Promise<boolean> {
  const s = await getSettings();
  return !s.newsLastFetchAt || now.getTime() - s.newsLastFetchAt.getTime() >= NEWS_STALE_MS;
}

export type NewsFilter = "all" | "full" | "unread" | "bookmarked";

export interface ArticleItem {
  id: string;
  url: string;
  title: string;
  sourceId: string;
  sourceName: string;
  category: string;
  /** Null when the feed doesn't date its items. */
  publishedAt: string | null;
  snippet: string;
  summary: string | null;
  read: boolean;
  bookmarked: boolean;
  contentStatus: ContentStatus | null;
  readingMinutes: number | null;
  leadImage: string | null;
  tags: string[];
}

export interface ArticleWithContent extends ArticleItem {
  content: string | null;
  contentError: string | null;
}

export interface NewsQuery {
  category?: string;
  categories?: readonly string[];
  source?: string;
  tag?: string;
  filter?: NewsFilter;
  /** Only articles with stored full text of at least this many minutes. */
  minMinutes?: number;
  limit?: number;
}

type ArticleRow = Omit<ArticleDoc, "content"> & { _id: unknown; content?: string | null };

function toItem(d: ArticleRow): ArticleItem {
  return {
    id: String(d._id),
    url: d.url,
    title: d.title,
    sourceId: d.sourceId,
    sourceName: d.sourceName,
    category: d.category,
    publishedAt: d.publishedAt ? new Date(d.publishedAt).toISOString() : null,
    snippet: d.snippet ?? "",
    summary: d.aiSummary ?? null,
    read: !!d.read,
    bookmarked: !!d.bookmarked,
    contentStatus: (d.contentStatus as ContentStatus | null | undefined) ?? null,
    readingMinutes: d.readingMinutes ?? null,
    leadImage: d.leadImage ?? null,
    tags: d.tags ?? [],
  };
}

let lastBackfillAt = 0;

/** Articles stored before `sortAt` existed get it filled in (at most every 10 minutes per process). */
async function backfillSortAt(): Promise<void> {
  if (Date.now() - lastBackfillAt < 600_000) return;
  lastBackfillAt = Date.now();
  try {
    await Article.updateMany(
      { sortAt: { $exists: false } },
      [{ $set: { sortAt: { $ifNull: ["$publishedAt", { $subtract: [{ $ifNull: ["$fetchedAt", "$$NOW"] }, UNDATED_PENALTY_MS] }] } } }],
      { updatePipeline: true },
    );
  } catch (err) {
    lastBackfillAt = 0;
    console.warn("[news] sortAt backfill failed:", err instanceof Error ? err.message : err);
  }
}

export async function listArticles(q: NewsQuery = {}): Promise<ArticleItem[]> {
  await connectDb();
  const where: Record<string, unknown> = {};
  if (q.category) where.category = q.category;
  else if (q.categories) where.category = { $in: q.categories };
  if (q.source) where.sourceId = q.source;
  if (q.tag) where.tags = q.tag;
  if (q.filter === "unread") where.read = false;
  if (q.filter === "bookmarked") where.bookmarked = true;
  if (q.filter === "full") where.contentStatus = { $in: ["full", "extracted"] };
  if (q.minMinutes) {
    where.contentStatus = { $in: ["full", "extracted"] };
    where.readingMinutes = { $gte: q.minMinutes };
  }
  await backfillSortAt();
  const docs = await Article.find(where, { content: 0 })
    .sort({ sortAt: -1, _id: 1 })
    .limit(q.limit ?? 60)
    .lean<ArticleRow[]>();
  return docs.map(toItem);
}

export async function getArticle(id: string): Promise<ArticleWithContent | null> {
  await connectDb();
  const d = await Article.findById(id).lean<ArticleRow>();
  return d ? { ...toItem(d), content: d.content ?? null, contentError: d.contentError ?? null } : null;
}

/** The newest unread article in the same category, for the reader's "Next" button. */
export async function nextUnread(id: string, category: string): Promise<{ id: string; title: string } | null> {
  await connectDb();
  const d = await Article.findOne({ category, read: false, _id: { $ne: id } }, { title: 1 })
    .sort({ sortAt: -1, _id: 1 })
    .lean<{ _id: unknown; title: string }>();
  return d ? { id: String(d._id), title: d.title } : null;
}

type ExtractTarget = { _id: unknown; url: string; title: string; leadImage?: string | null };

/** The `$set` that records one extraction outcome. */
function outcomeFields(a: ExtractTarget, result: { markdown: string; leadImage: string | null } | { error: string }, now: Date) {
  if ("error" in result) return { contentStatus: "failed" as const, contentError: result.error.slice(0, 300), contentTriedAt: now };
  return {
    content: result.markdown,
    contentStatus: "extracted" as const,
    readingMinutes: readingMinutes(result.markdown),
    tags: classifyTags(a.title, result.markdown),
    ...(a.leadImage || !result.leadImage ? {} : { leadImage: result.leadImage }),
  };
}

/**
 * Fetch the full text once for an article that doesn't have it. A failure is
 * recorded so neither the reader nor the cron retries a site that blocks us.
 */
export async function ensureArticleContent(id: string, extractor: Extractor = extractArticle): Promise<ContentStatus | null> {
  await connectDb();
  const a = await Article.findOne({ _id: id }, { url: 1, title: 1, snippet: 1, contentStatus: 1, leadImage: 1 }).lean();
  if (!a) return null;
  if (a.contentStatus) return a.contentStatus as ContentStatus;
  if (isHeadlineOnly(a.url)) {
    await Article.updateOne({ _id: id }, { $set: { contentStatus: "headline" } });
    return "headline";
  }
  try {
    const { markdown, leadImage } = await extractor(a.url);
    await Article.updateOne({ _id: id, contentStatus: null }, { $set: outcomeFields(a, { markdown, leadImage }, new Date()) });
    return "extracted";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await Article.updateOne({ _id: id, contentStatus: null }, { $set: outcomeFields(a, { error: message }, new Date()) });
    return "failed";
  }
}

export type RetryResult = { status: "retried"; contentStatus: ContentStatus | null } | { status: "rate-limited"; waitSec: number } | { status: "not-failed" };

/** Manual Retry for a failed extraction: reset it and try again, at most once a minute per article. */
export async function retryArticleContent(id: string, opts: { now?: Date; extractor?: Extractor } = {}): Promise<RetryResult> {
  const now = opts.now ?? new Date();
  await connectDb();
  const a = await Article.findOne({ _id: id }, { contentStatus: 1, contentTriedAt: 1 }).lean();
  if (!a || a.contentStatus !== "failed") return { status: "not-failed" };
  const waitSec = retryExtractWaitSec(a.contentTriedAt, now.getTime());
  if (waitSec > 0) return { status: "rate-limited", waitSec };
  // Compare-and-set on the timestamp we just read, so two overlapping clicks run one extraction.
  const claim = await Article.updateOne(
    { _id: id, contentStatus: "failed", contentTriedAt: a.contentTriedAt ?? null },
    { $set: { contentStatus: null, contentTriedAt: now }, $unset: { contentError: 1 } },
  );
  if (claim.modifiedCount === 0) return { status: "rate-limited", waitSec: 60 };
  return { status: "retried", contentStatus: await ensureArticleContent(id, opts.extractor) };
}

export const PREFETCH_CATEGORIES = ["system-design", "engineering", "ai-labs", "databases", "interview-prep", "frontend", "ai-eng"] as const;

/**
 * Morning job: extract the newest unread articles without full text so the reader
 * opens instantly. One read for the queue and bulk writes for the results; bounded by
 * count, concurrency and a time budget that keeps the cron inside its 60 s limit.
 */
export async function prefetchArticleContent(
  opts: { limit?: number; concurrency?: number; budgetMs?: number; extractor?: Extractor } = {},
): Promise<{ tried: number; extracted: number; failed: number }> {
  const { limit = 20, concurrency = 4, budgetMs = 25_000, extractor = extractArticle } = opts;
  await connectDb();
  const queue = await Article.find(
    { contentStatus: null, read: false, category: { $in: PREFETCH_CATEGORIES } },
    { url: 1, title: 1, leadImage: 1 },
  )
    .sort({ fetchedAt: -1, publishedAt: -1 })
    .limit(limit)
    .lean<ExtractTarget[]>();
  const deadline = Date.now() + budgetMs;
  const counts = { tried: 0, extracted: 0, failed: 0 };
  type Op = { updateOne: { filter: Record<string, unknown>; update: { $set: Record<string, unknown> } } };
  let pending: Op[] = [];
  const flush = async () => {
    const ops = pending;
    pending = [];
    if (ops.length) await Article.bulkWrite(ops, { ordered: false });
  };
  const record = (a: ExtractTarget, fields: Record<string, unknown>) => {
    pending.push({ updateOne: { filter: { _id: a._id, contentStatus: null }, update: { $set: fields } } });
  };
  async function worker() {
    for (let a = queue.shift(); a && Date.now() < deadline; a = queue.shift()) {
      counts.tried++;
      if (isHeadlineOnly(a.url)) {
        record(a, { contentStatus: "headline" });
        continue;
      }
      try {
        const { markdown, leadImage } = await extractor(a.url);
        record(a, outcomeFields(a, { markdown, leadImage }, new Date()));
        counts.extracted++;
      } catch (err) {
        record(a, outcomeFields(a, { error: err instanceof Error ? err.message : String(err) }, new Date()));
        counts.failed++;
      }
      if (pending.length >= 8) await flush();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  await flush();
  return counts;
}

export async function readingsToday(now = new Date()): Promise<number> {
  await connectDb();
  return Article.countDocuments({ readOn: todayIn(await getSettings(), now) });
}

export async function unreadArticleCount(): Promise<number> {
  await connectDb();
  return Article.countDocuments({ read: false });
}

/** First open counts toward today's readings; re-opening an old article doesn't move it. */
export async function markArticleRead(id: string, now = new Date()): Promise<{ readings: number }> {
  await connectDb();
  const today = todayIn(await getSettings(), now);
  const res = await Article.updateOne({ _id: id, readOn: null }, { $set: { read: true, readOn: today } });
  if (res.matchedCount === 0) await Article.updateOne({ _id: id }, { $set: { read: true } });
  const { day } = await recomputeDay(today);
  return { readings: day.readings };
}

/** The TTL index ignores documents without `fetchedAt`, so bookmarks survive the 30-day cleanup. */
export async function setBookmark(id: string, bookmarked: boolean, now = new Date()): Promise<void> {
  await connectDb();
  await Article.updateOne(
    { _id: id },
    bookmarked ? { $set: { bookmarked }, $unset: { fetchedAt: 1 } } : { $set: { bookmarked, fetchedAt: now } },
  );
}
