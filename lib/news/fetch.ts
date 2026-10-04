import Parser from "rss-parser";
import { cleanSnippet, safeUrl, type FeedSource, type RawItem } from "@/lib/domain/news";
import { fetchWithPolicy, pLimit } from "@/lib/http";
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

/** Cache validators remembered per feed so the next request can be conditional. */
export interface FeedValidators {
  etag?: string;
  lastModified?: string;
}

/** A feed answered 304 Not Modified: nothing new, nothing failed. */
export interface FeedNotModified {
  notModified: true;
}

export interface FeedResponse extends FeedValidators {
  items: RawItem[];
}

/** Plain arrays are still accepted (tests and simple fetchers); real fetches return a FeedResponse or 304. */
export type FeedFetchResult = RawItem[] | FeedResponse | FeedNotModified;

export type FeedFetcher = (source: FeedSource, validators?: FeedValidators) => Promise<FeedFetchResult>;

export const FEED_CONCURRENCY = 6;

function conditionalHeaders(v: FeedValidators | undefined): Record<string, string> {
  return {
    ...(v?.etag ? { "if-none-match": v.etag } : {}),
    ...(v?.lastModified ? { "if-modified-since": v.lastModified } : {}),
  };
}

function validatorsOf(res: Response): FeedValidators {
  const etag = res.headers.get("etag");
  const lastModified = res.headers.get("last-modified");
  return { ...(etag ? { etag } : {}), ...(lastModified ? { lastModified } : {}) };
}

/** Reads the body but stops downloading once it passes the cap (the old check ran after the whole body was in memory). */
async function readBounded(res: Response, message: string): Promise<string> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new Error(message);
  const reader = res.body?.getReader();
  if (!reader) {
    const whole = await res.text();
    if (whole.length > MAX_BYTES) throw new Error(message);
    return whole;
  }
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new Error(message);
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

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
    const res = await fetchWithPolicy(url, { timeoutMs: PAGE_TIMEOUT_MS, retries: 1, headers: { "user-agent": USER_AGENT, accept: "text/html,*/*;q=0.8" } });
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
async function fetchSitemapFeed(source: FeedSource, validators?: FeedValidators): Promise<FeedResponse | FeedNotModified> {
  const res = await fetchWithPolicy(source.url, {
    timeoutMs: TIMEOUT_MS,
    retries: 1,
    headers: { "user-agent": USER_AGENT, accept: "application/xml, text/xml, */*;q=0.8", ...conditionalHeaders(validators) },
  });
  if (res.status === 304) return { notModified: true };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await readBounded(res, "Sitemap too large");
  const recent = pickRecentEntries(parseSitemap(xml), { match: source.match, limit: SITEMAP_ITEMS });
  if (recent.length === 0) throw new Error("No pages in sitemap");
  const limit = pLimit(PAGE_CONCURRENCY);
  const fetched = await Promise.all(recent.map((e) => limit(() => fetchPageItem(e.url, e.lastmod))));
  const items = fetched.filter((item): item is RawItem => item !== null);
  if (items.length === 0) throw new Error("No readable pages");
  return { items, ...validatorsOf(res) };
}

/** Fetch and parse one RSS/Atom feed (or sitemap blog). Throws on timeout, HTTP errors and oversized bodies. */
export const fetchFeed: FeedFetcher = async (source, validators) => {
  if (source.kind === "sitemap") return fetchSitemapFeed(source, validators);
  const res = await fetchWithPolicy(source.url, {
    timeoutMs: TIMEOUT_MS,
    retries: 1,
    headers: { "user-agent": USER_AGENT, accept: ACCEPT, ...conditionalHeaders(validators) },
  });
  if (res.status === 304) return { notModified: true };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await readBounded(res, "Feed too large");
  const feed = await parser.parseString(xml);
  const items = feed.items.flatMap((item) => {
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
  return { items, ...validatorsOf(res) };
};

export interface FetchAllResult {
  results: Array<{ source: FeedSource; items: RawItem[] }>;
  failed: string[];
  /** Feed ids that answered 304 Not Modified. */
  unchanged: string[];
  /** Fresh validators to remember, by feed id. */
  validators: Map<string, FeedValidators>;
}

/** Feeds with bounded concurrency; one slow or broken feed never sinks the refresh. */
export async function fetchAll(
  sources: readonly FeedSource[],
  fetcher: FeedFetcher = fetchFeed,
  known: ReadonlyMap<string, FeedValidators> = new Map(),
): Promise<FetchAllResult> {
  const limit = pLimit(FEED_CONCURRENCY);
  const settled = await Promise.allSettled(sources.map((s) => limit(() => fetcher(s, known.get(s.id)))));
  const out: FetchAllResult = { results: [], failed: [], unchanged: [], validators: new Map() };
  settled.forEach((r, i) => {
    const source = sources[i];
    if (r.status === "rejected") return void out.failed.push(source.id);
    const value = r.value;
    if (Array.isArray(value)) return void out.results.push({ source, items: value });
    if ("notModified" in value) return void out.unchanged.push(source.id);
    out.results.push({ source, items: value.items });
    if (value.etag || value.lastModified) out.validators.set(source.id, { etag: value.etag, lastModified: value.lastModified });
  });
  return out;
}
