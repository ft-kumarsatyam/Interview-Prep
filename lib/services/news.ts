import { createHash } from "node:crypto";
import { news as newsContent } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { googleNewsFeeds, mergeFeeds, NEWS_STALE_MS, type FeedSource } from "@/lib/domain/news";
import { Article, Settings, SETTINGS_ID, type ArticleDoc } from "@/lib/models/system";
import { fetchAll, type FeedFetcher } from "@/lib/news/fetch";
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
  const candidates = results.flatMap((r) => r.items.map((i) => i.url));
  const existing = await Article.find({ urlHash: { $in: candidates.map(urlHash) } }, { titleKey: 1 }).lean();
  const recentKeys = await Article.find({ fetchedAt: { $gte: new Date(now.getTime() - 7 * 86_400_000) } }, { titleKey: 1 }).lean();
  const items = mergeFeeds(
    results,
    newsContent.maxItemsPerFeed,
    new Set([...existing, ...recentKeys].flatMap((a) => (a.titleKey ? [a.titleKey] : []))),
  );

  let inserted = 0;
  if (items.length) {
    const res = await Article.bulkWrite(
      items.map((item) => ({
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

export type NewsFilter = "all" | "unread" | "bookmarked";

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
}

export interface NewsQuery {
  category?: string;
  source?: string;
  filter?: NewsFilter;
  limit?: number;
}

export async function listArticles(q: NewsQuery = {}): Promise<ArticleItem[]> {
  await connectDb();
  const where: Record<string, unknown> = {};
  if (q.category) where.category = q.category;
  if (q.source) where.sourceId = q.source;
  if (q.filter === "unread") where.read = false;
  if (q.filter === "bookmarked") where.bookmarked = true;
  const docs = await Article.aggregate<ArticleDoc & { _id: unknown }>([
    { $match: where },
    { $addFields: { sortAt: { $ifNull: ["$publishedAt", { $subtract: ["$fetchedAt", UNDATED_PENALTY_MS] }] } } },
    { $sort: { sortAt: -1, _id: 1 } },
    { $limit: q.limit ?? 60 },
  ]);
  return docs.map((d) => ({
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
  }));
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
