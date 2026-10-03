import { cleanSnippet, safeUrl } from "./news";

export interface SitemapEntry {
  url: string;
  lastmod: Date | null;
}

export interface PageMeta {
  title: string;
  description: string;
  image: string | null;
  publishedAt: Date | null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");
}

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** `<url><loc>…</loc><lastmod>…</lastmod></url>` entries of a urlset sitemap. Sitemap indexes yield nothing. */
export function parseSitemap(xml: string): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = /<loc>\s*([^<]+?)\s*<\/loc>/.exec(block[1])?.[1];
    const url = loc ? safeUrl(decodeEntities(loc)) : null;
    if (url) out.push({ url, lastmod: toDate(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/.exec(block[1])?.[1]) });
  }
  return out;
}

/**
 * The newest `limit` article URLs: `match` keeps only URLs containing that text
 * (e.g. "/blog/" or "/p/"), and index pages (nothing after the match) are dropped.
 */
export function pickRecentEntries(entries: readonly SitemapEntry[], opts: { match?: string; limit: number }): SitemapEntry[] {
  const { match, limit } = opts;
  return entries
    .filter((e) => {
      if (!match) return true;
      const at = e.url.indexOf(match);
      return at >= 0 && e.url.length > at + match.length;
    })
    .toSorted((a, b) => (b.lastmod?.getTime() ?? 0) - (a.lastmod?.getTime() ?? 0))
    .slice(0, limit);
}

function metaContent(html: string, key: string): string | undefined {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const t = tag[0];
    const name = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(t)?.[1]?.toLowerCase();
    if (name !== key) continue;
    const content = /\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i.exec(t);
    const value = content?.[1] ?? content?.[2];
    if (value) return decodeEntities(value);
  }
  return undefined;
}

/** Strips a trailing " | Site name" so titles read cleanly in the feed. */
export function cleanPageTitle(title: string): string {
  const cleaned = title.replace(/\s+\|\s+[^|]{2,40}$/, "").trim();
  return cleaned.length >= 8 ? cleaned : title.trim();
}

/** Title, description, lead image and publish date from a page's `<head>` meta tags. */
export function parsePageMeta(html: string): PageMeta {
  const head = html.slice(0, html.search(/<\/head>/i) > 0 ? html.search(/<\/head>/i) : 200_000);
  const rawTitle = metaContent(head, "og:title") ?? /<title[^>]*>([^<]*)<\/title>/i.exec(head)?.[1] ?? "";
  const description = metaContent(head, "og:description") ?? metaContent(head, "description") ?? "";
  const image = safeUrl(metaContent(head, "og:image"));
  return {
    title: cleanPageTitle(cleanSnippet(decodeEntities(rawTitle), 300)),
    description: cleanSnippet(description),
    image: image?.startsWith("https:") ? image : null,
    publishedAt: toDate(metaContent(head, "article:published_time") ?? metaContent(head, "og:article:published_time")),
  };
}
