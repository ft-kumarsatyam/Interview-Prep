import { describe, expect, it } from "vitest";
import {
  capContent,
  classifyTags,
  diversify,
  isHeadlineOnly,
  isLongRead,
  isPrivateAddress,
  isSafeUrl,
  plainText,
  readingMinutes,
  wordCount,
} from "@/lib/domain/article";
import { cleanSnippet } from "@/lib/domain/news";

describe("reading time and caps", () => {
  it("counts words in markdown, ignoring code, images and link targets", () => {
    const md = "# Title\n\nSome [linked text](https://x.y/very/long/url) here.\n\n```js\nconst ignored = 1;\n```\n\n![alt](https://img)";
    expect(plainText(md)).toBe("Title Some linked text here.");
    expect(wordCount("don’t stop-the-world, 3 times")).toBe(4);
  });

  it("rounds to whole minutes with a 1-minute floor", () => {
    expect(readingMinutes("short")).toBe(1);
    expect(readingMinutes(Array(230 * 7).fill("word").join(" "))).toBe(7);
  });

  it("cuts long content at a paragraph break and says so", () => {
    const para = "x".repeat(300);
    const md = Array(10).fill(para).join("\n\n");
    const capped = capContent(md, 1000);
    expect(capped.length).toBeLessThan(1100);
    expect(capped).toMatch(/x\n\n\*…article truncated/);
    expect(capContent("  small  ", 1000)).toBe("small");
  });
});

describe("classifyTags", () => {
  it("tags from the title alone", () => {
    expect(classifyTags("How Discord stores trillions of messages in Cassandra")).toEqual(["databases"]);
    expect(classifyTags("Kafka 101: partitions and consumer groups")).toEqual(["distributed", "queues"]);
  });

  it("needs two body mentions so a passing reference doesn't tag", () => {
    expect(classifyTags("Weekly notes", "We mention Redis once.")).toEqual([]);
    expect(classifyTags("Weekly notes", "Redis as a cache. Cache invalidation is hard.")).toEqual(["caching"]);
  });

  it("caps the number of tags", () => {
    const body = "database database cache cache kafka kafka kubernetes kubernetes llm llm security security";
    expect(classifyTags("x", body, 3)).toHaveLength(3);
  });
});

describe("SSRF guard", () => {
  it.each([
    ["127.0.0.1", true],
    ["10.1.2.3", true],
    ["172.20.0.1", true],
    ["192.168.1.10", true],
    ["169.254.169.254", true],
    ["100.100.1.1", true],
    ["0.0.0.0", true],
    ["::1", true],
    ["fd00::1", true],
    ["fe80::1", true],
    ["::ffff:127.0.0.1", true],
    ["192.0.66.220", false],
    ["151.101.105.91", false],
    ["2606:4700::6810:84e5", false],
  ])("isPrivateAddress(%s) = %s", (ip, expected) => {
    expect(isPrivateAddress(ip)).toBe(expected);
  });

  it.each([
    ["https://blog.bytebytego.com/p/x", true],
    ["http://example.com/a", true],
    ["https://8.8.8.8/", true],
    ["ftp://example.com/", false],
    ["javascript:alert(1)", false],
    ["https://localhost/", false],
    ["https://intranet/", false],
    ["https://db.internal/", false],
    ["https://127.0.0.1/", false],
    ["https://[::1]/", false],
    ["https://user:pw@example.com/", false],
    ["https://example.com:8080/", false],
    ["not a url", false],
  ])("isSafeUrl(%s) = %s", (url, expected) => {
    expect(isSafeUrl(url)).toBe(expected);
  });
});

describe("misc", () => {
  it("marks Google News links as headline-only", () => {
    expect(isHeadlineOnly("https://news.google.com/rss/articles/abc")).toBe(true);
    expect(isHeadlineOnly("https://blog.cloudflare.com/x")).toBe(false);
  });

  it("diversify caps items per source and keeps order", () => {
    const items = ["a", "a", "a", "b", "a", "c", "b", "b"].map((sourceId, i) => ({ sourceId, i }));
    expect(diversify(items, 2, 10).map((x) => x.i)).toEqual([0, 1, 3, 5, 6]);
    expect(diversify(items, 1, 2).map((x) => x.sourceId)).toEqual(["a", "b"]);
  });

  it("long reads need stored text and enough minutes", () => {
    expect(isLongRead({ contentStatus: "full", readingMinutes: 8 })).toBe(true);
    expect(isLongRead({ contentStatus: "extracted", readingMinutes: 3 })).toBe(false);
    expect(isLongRead({ contentStatus: "failed", readingMinutes: 12 })).toBe(false);
  });

  it("decodes numeric entities in snippets", () => {
    expect(cleanSnippet("Big tech ruined the cloud, so we&#8217;re &#x201C;done&#x201D;")).toBe("Big tech ruined the cloud, so we’re “done”");
    expect(cleanSnippet("bad &#1; entity")).toBe("bad entity");
  });
});
