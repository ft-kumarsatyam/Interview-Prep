import Parser from "rss-parser";
import { cleanSnippet, safeUrl, type FeedSource, type RawItem } from "@/lib/domain/news";
import { parsePageMeta, parseSitemap, pickRecentEntries } from "@/lib/domain/sitemap";

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 5_000_000;
/** Raw HTML kept per item before conversion; the markdown is capped again at CONTENT_MAX. */
const MAX_CONTENT_HTML = 400_000;
const USER_AGENT = "Mozilla/5.0 (compatible; PrepOS/1.0; personal RSS reader)";
/** blog.google stalls on an XML-only Accept header, so keep the wildcard. */
const ACCEPT = "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8";
const parser = new Parser<Record<string, unknown>, { "content:encoded"?: string; mediaContent?: { $?: { url?: string; medium?: string } } }>({
  customFields: { item: [["media:content", "mediaContent"]] },
});

function imageUrl(raw: string | undefined): string | null {
  const url = safeUrl(raw);
  return url?.startsWith("https:") ? url : null;
}

export type FeedFetcher = (source: FeedSource) => Promise<RawItem[]>;

const PAGE_TIMEOUT_MS = 8_000;
/** Meta tags live in `<head>`; there's no need to download the article. */
const PAGE_HEAD_BYTES = 200_000;
const SITEMAP_ITEMS = 10;
const PAGE_CONCURRENCY = 5;

/** Reads a response body until `</head>` or `limit` bytes, then cancels the rest of the download. */
async function readHead(res: Response, limit: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return (await res.text()).slice(0, limit);
  const decoder = new TextDecoder();
  let text = "";
  while (text.length < limit && !/<\/head>/i.test(text)) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => undefined);
  return text;
}

async function fetchPageItem(url: string, lastmod: Date | null): Promise<RawItem | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(PAGE_TIMEOUT_MS), headers: { "user-agent": USER_AGENT, accept: "text/html,*/*;q=0.8" } });
    if (!res.ok) return null;
    const meta = parsePageMeta(await readHead(res, PAGE_HEAD_BYTES));
    if (!meta.title) return null;
    return {
      url,
      title: meta.title,
      publishedAt: meta.publishedAt ?? lastmod,
      snippet: meta.description,
      ...(meta.image ? { leadImage: meta.image } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Blogs without RSS: read the sitemap, take the newest pages and pull each
 * title, description and image from its meta tags. The article body is left
 * for the reader's on-demand extraction, like any other teaser.
 */
async function fetchSitemapFeed(source: FeedSource): Promise<RawItem[]> {
  const res = await fetch(source.url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": USER_AGENT, accept: "application/xml, text/xml, */*;q=0.8" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  if (xml.length > MAX_BYTES) throw new Error("Sitemap too large");
  const recent = pickRecentEntries(parseSitemap(xml), { match: source.match, limit: SITEMAP_ITEMS });
  if (recent.length === 0) throw new Error("No pages in sitemap");
  const items: RawItem[] = [];
  for (let i = 0; i < recent.length; i += PAGE_CONCURRENCY) {
    const batch = await Promise.all(recent.slice(i, i + PAGE_CONCURRENCY).map((e) => fetchPageItem(e.url, e.lastmod)));
    for (const item of batch) if (item) items.push(item);
  }
  if (items.length === 0) throw new Error("No readable pages");
  return items;
}

/** Fetch and parse one RSS/Atom feed (or sitemap blog). Throws on timeout, HTTP errors and oversized bodies. */
export const fetchFeed: FeedFetcher = async (source) => {
  if (source.kind === "sitemap") return fetchSitemapFeed(source);
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
    const body = item["content:encoded"] ?? item.content ?? "";
    const enclosure = item.enclosure?.type?.startsWith("image/") ? item.enclosure.url : undefined;
    const media = item.mediaContent?.$?.medium === "image" || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(item.mediaContent?.$?.url ?? "") ? item.mediaContent?.$?.url : undefined;
    return [
      {
        url,
        title,
        publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
        snippet: cleanSnippet(item.contentSnippet ?? item.content ?? item.summary),
        ...(body.length > 0 ? { contentHtml: body.slice(0, MAX_CONTENT_HTML) } : {}),
        ...(imageUrl(enclosure ?? media) ? { leadImage: imageUrl(enclosure ?? media)! } : {}),
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
