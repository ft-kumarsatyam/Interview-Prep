import { createHash } from "node:crypto";
import { news as newsContent } from "@/lib/content";
import { connectDb } from "@/lib/db";
import {
  classifyTags,
  FULL_TEXT_MIN_WORDS,
  isHeadlineOnly,
  plainText,
  readingMinutes,
  wordCount,
  type ContentStatus,
} from "@/lib/domain/article";
import { googleNewsFeeds, mergeFeeds, NEWS_STALE_MS, type FeedSource, type NewsItem } from "@/lib/domain/news";
import { Article, Settings, SETTINGS_ID, type ArticleDoc } from "@/lib/models/system";
import { extractArticle, type Extractor } from "@/lib/news/extract";
import { fetchAll, type FeedFetcher } from "@/lib/news/fetch";
import { firstImage, htmlToMarkdown } from "@/lib/news/markdown";
import { recomputeDay } from "./day";
import { todayIn } from "./plan";
import { getSettings } from "./settings";

/** Undated items rank as if a day old so a feed without dates can't pin itself to the top. */
const UNDATED_PENALTY_MS = 86_400_000;

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
  if (claim.modifiedCount === 0) return { status: "fresh", lastFetchAt: now };

  const { results, failed } = await fetchAll(newsSources(s.googleNewsQueries), opts.fetcher);
  await Settings.updateOne({ _id: SETTINGS_ID }, { $set: { newsLastFailed: failed } });
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
  const docs = await Article.aggregate<ArticleRow>([
    { $match: where },
    { $project: { content: 0 } },
    { $addFields: { sortAt: { $ifNull: ["$publishedAt", { $subtract: ["$fetchedAt", UNDATED_PENALTY_MS] }] } } },
    { $sort: { sortAt: -1, _id: 1 } },
    { $limit: q.limit ?? 60 },
  ]);
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
    .sort({ publishedAt: -1, _id: 1 })
    .lean<{ _id: unknown; title: string }>();
  return d ? { id: String(d._id), title: d.title } : null;
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
    await Article.updateOne(
      { _id: id, contentStatus: null },
      {
        $set: {
          content: markdown,
          contentStatus: "extracted",
          readingMinutes: readingMinutes(markdown),
          tags: classifyTags(a.title, markdown),
          ...(a.leadImage || !leadImage ? {} : { leadImage }),
        },
      },
    );
    return "extracted";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await Article.updateOne({ _id: id, contentStatus: null }, { $set: { contentStatus: "failed", contentError: message.slice(0, 300) } });
    return "failed";
  }
}

export const PREFETCH_CATEGORIES = ["system-design", "engineering", "ai-labs", "databases", "interview-prep"] as const;

/**
 * Morning job: extract the newest articles without full text so the reader
 * opens instantly. Bounded by count, concurrency and a time budget that keeps
 * the cron inside its 60 s limit.
 */
export async function prefetchArticleContent(
  opts: { limit?: number; concurrency?: number; budgetMs?: number; extractor?: Extractor } = {},
): Promise<{ tried: number; extracted: number; failed: number }> {
  const { limit = 20, concurrency = 4, budgetMs = 25_000, extractor = extractArticle } = opts;
  await connectDb();
  const queue = (
    await Article.find({ contentStatus: null, category: { $in: PREFETCH_CATEGORIES } }, { _id: 1 })
      .sort({ fetchedAt: -1, publishedAt: -1 })
      .limit(limit)
      .lean()
  ).map((d) => String(d._id));
  const deadline = Date.now() + budgetMs;
  const counts = { tried: 0, extracted: 0, failed: 0 };
  async function worker() {
    for (let id = queue.shift(); id && Date.now() < deadline; id = queue.shift()) {
      counts.tried++;
      const status = await ensureArticleContent(id, extractor);
      if (status === "extracted") counts.extracted++;
      else if (status === "failed") counts.failed++;
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
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
