export interface FeedSource {
  id: string;
  name: string;
  category: string;
  url: string;
}

export interface GoogleNewsQuery {
  id: string;
  name: string;
  category: string;
  query: string;
}

export interface RawItem {
  url: string;
  title: string;
  publishedAt: Date | null;
  snippet: string;
  /** Article body from `content:encoded` / Atom `content`, when the feed carries it. */
  contentHtml?: string;
  leadImage?: string;
}

export interface NewsItem extends RawItem {
  sourceId: string;
  sourceName: string;
  category: string;
  titleKey: string;
}

export const SNIPPET_MAX = 280;
export const NEWS_STALE_MS = 6 * 3600 * 1000;

/**
 * Comparable form of a headline. Google News appends " - Publisher" and links
 * through redirect URLs, so the same story arrives under many URLs.
 */
export function titleKey(title: string): string {
  return title
    .replace(/\s+[-–—|]\s+[^-–—|]{2,60}$/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function safeCodePoint(n: number): string {
  return n > 31 && n <= 0x10ffff && (n < 0xd800 || n > 0xdfff) ? String.fromCodePoint(n) : " ";
}

/** Plain-text excerpt from feed HTML. Output is rendered as text, never as HTML. */
export function cleanSnippet(html: string | undefined, max = SNIPPET_MAX): string {
  if (!html) return "";
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d{1,7});/g, (_, n: string) => safeCodePoint(Number(n)))
    .replace(/&#x([\da-f]{2,5});/gi, (_, h: string) => safeCodePoint(parseInt(h, 16)))
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Turn the Settings keyword list (or the defaults) into Google News search feeds. */
export function googleNewsFeeds(
  queries: readonly string[] | null,
  defaults: readonly GoogleNewsQuery[],
  urlTemplate: string,
): FeedSource[] {
  const list: GoogleNewsQuery[] = queries
    ? queries.map((q) => {
        const known = defaults.find((d) => d.query === q);
        return known ?? { id: `gn-${slugify(q)}`, name: `Google News · ${q.replaceAll('"', "")}`, category: "ai-news", query: q };
      })
    : [...defaults];
  return list.map((q) => ({
    id: q.id,
    name: q.name,
    category: q.category,
    url: urlTemplate.replace("{query}", encodeURIComponent(q.query)),
  }));
}

/** "just now", "5m", "3h", "2d", then a short date. */
export function timeAgo(then: Date, now: Date): string {
  const s = Math.max(0, (now.getTime() - then.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d ago`;
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "query";
}

/** Only http(s) links are stored, so a feed can't smuggle in `javascript:` URLs. */
export function safeUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Newest `perFeed` items per source, deduped by URL and normalised title, newest first. */
export function mergeFeeds(
  results: ReadonlyArray<{ source: FeedSource; items: readonly RawItem[] }>,
  perFeed: number,
  existingTitleKeys: ReadonlySet<string> = new Set(),
): NewsItem[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set(existingTitleKeys);
  const out: NewsItem[] = [];
  for (const { source, items } of results) {
    const newest = items
      .toSorted((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
      .slice(0, perFeed);
    for (const item of newest) {
      const key = titleKey(item.title);
      if (!key || seenUrls.has(item.url) || seenTitles.has(key)) continue;
      seenUrls.add(item.url);
      seenTitles.add(key);
      out.push({ ...item, sourceId: source.id, sourceName: source.name, category: source.category, titleKey: key });
    }
  }
  return out.toSorted((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
}
