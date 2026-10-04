import { describe, expect, it } from "vitest";
import { cleanPageTitle, parsePageMeta, parseSitemap, pickRecentEntries } from "@/modules/news/domain/sitemap";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/blog</loc><lastmod>2026-09-28T04:30:18.754Z</lastmod></url>
  <url><loc>https://example.com/blog/older-post</loc><lastmod>2026-04-16T12:58:02.955Z</lastmod></url>
  <url><loc>https://example.com/blog/newest-post</loc><lastmod>2026-09-28T04:30:18.754Z</lastmod></url>
  <url><loc>https://example.com/about</loc><lastmod>2026-10-01</lastmod></url>
  <url><loc>javascript:alert(1)</loc></url>
  <url><loc>https://example.com/blog/no-date?a=1&amp;b=2</loc></url>
</urlset>`;

describe("parseSitemap", () => {
  it("reads loc and lastmod, decodes entities and drops non-http urls", () => {
    const entries = parseSitemap(xml);
    expect(entries.map((e) => e.url)).toEqual([
      "https://example.com/blog",
      "https://example.com/blog/older-post",
      "https://example.com/blog/newest-post",
      "https://example.com/about",
      "https://example.com/blog/no-date?a=1&b=2",
    ]);
    expect(entries[4].lastmod).toBeNull();
    expect(entries[3].lastmod?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("returns nothing for a sitemap index", () => {
    expect(parseSitemap("<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap></sitemapindex>")).toEqual([]);
  });
});

describe("pickRecentEntries", () => {
  it("keeps only article urls under the match, newest first, undated last", () => {
    const picked = pickRecentEntries(parseSitemap(xml), { match: "/blog/", limit: 10 });
    expect(picked.map((e) => e.url)).toEqual([
      "https://example.com/blog/newest-post",
      "https://example.com/blog/older-post",
      "https://example.com/blog/no-date?a=1&b=2",
    ]);
  });

  it("honours the limit and works without a match", () => {
    expect(pickRecentEntries(parseSitemap(xml), { limit: 1 })).toHaveLength(1);
    expect(pickRecentEntries(parseSitemap(xml), { match: "/blog/", limit: 2 })).toHaveLength(2);
  });
});

describe("parsePageMeta", () => {
  const html = `<html><head><title>Fallback | Site</title>
    <meta property="og:title" content="How Zomato cut a 150 GB Flink state &amp; saved money | Scale Engineer"/>
    <meta name="description" content="Short summary."/>
    <meta property="og:description" content="Zomato shrank its Flink state from 150 GB to 500 MB."/>
    <meta property="og:image" content="https://cdn.example.com/cover.png?t=1"/>
    <meta property="article:published_time" content="2026-09-07T04:30:00.000Z"/>
    </head><body><p>body</p></body></html>`;

  it("prefers Open Graph tags and strips the site suffix", () => {
    const meta = parsePageMeta(html);
    expect(meta.title).toBe("How Zomato cut a 150 GB Flink state & saved money");
    expect(meta.description).toBe("Zomato shrank its Flink state from 150 GB to 500 MB.");
    expect(meta.image).toBe("https://cdn.example.com/cover.png?t=1");
    expect(meta.publishedAt?.toISOString()).toBe("2026-09-07T04:30:00.000Z");
  });

  it("falls back to <title> and the plain description, and ignores insecure images", () => {
    const meta = parsePageMeta(`<head><title>Plain page title here</title><meta name="description" content="Desc"><meta property="og:image" content="http://insecure.example.com/a.png"></head>`);
    expect(meta).toMatchObject({ title: "Plain page title here", description: "Desc", image: null, publishedAt: null });
  });

  it("does not read tags from the body", () => {
    expect(parsePageMeta(`<head><title>Real title of page</title></head><body><meta property="og:title" content="Injected"/></body>`).title).toBe("Real title of page");
  });
});

describe("cleanPageTitle", () => {
  it("strips a trailing pipe suffix only when a real title remains", () => {
    expect(cleanPageTitle("What is Redis? | Scale Engineer")).toBe("What is Redis?");
    expect(cleanPageTitle("A | B")).toBe("A | B");
    expect(cleanPageTitle("Kafka vs RabbitMQ - which one?")).toBe("Kafka vs RabbitMQ - which one?");
  });
});
