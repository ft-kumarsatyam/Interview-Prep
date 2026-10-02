import Parser from "rss-parser";
import { cleanSnippet, safeUrl, type FeedSource, type RawItem } from "@/lib/domain/news";

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 5_000_000;
const USER_AGENT = "Mozilla/5.0 (compatible; PrepOS/1.0; personal RSS reader)";
/** blog.google stalls on an XML-only Accept header, so keep the wildcard. */
const ACCEPT = "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8";
const parser = new Parser();

export type FeedFetcher = (source: FeedSource) => Promise<RawItem[]>;

/** Fetch and parse one RSS/Atom feed. Throws on timeout, HTTP errors and oversized bodies. */
export const fetchFeed: FeedFetcher = async (source) => {
  const res = await fetch(source.url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": USER_AGENT, accept: ACCEPT },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  if (xml.length > MAX_BYTES) throw new Error("Feed too large");
  const feed = await parser.parseString(xml);
  return feed.items.flatMap((item) => {
    const url = safeUrl(item.link);
    const title = cleanSnippet(item.title, 300);
    if (!url || !title) return [];
    const date = item.isoDate ?? item.pubDate;
    const publishedAt = date ? new Date(date) : null;
    return [
      {
        url,
        title,
        publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
        snippet: cleanSnippet(item.contentSnippet ?? item.content ?? item.summary),
      },
    ];
  });
};

/** All feeds in parallel; one slow or broken feed never sinks the refresh. */
export async function fetchAll(
  sources: readonly FeedSource[],
  fetcher: FeedFetcher = fetchFeed,
): Promise<{ results: Array<{ source: FeedSource; items: RawItem[] }>; failed: string[] }> {
  const settled = await Promise.allSettled(sources.map((s) => fetcher(s)));
  const results: Array<{ source: FeedSource; items: RawItem[] }> = [];
  const failed: string[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") results.push({ source: sources[i], items: r.value });
    else failed.push(sources[i].id);
  });
  return { results, failed };
}
