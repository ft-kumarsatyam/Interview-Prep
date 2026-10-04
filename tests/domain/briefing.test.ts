import { describe, expect, it } from "vitest";
import {
  alertMail,
  ALERT_MAX_AGE_H,
  briefingDigest,
  interestTags,
  localHour,
  pickAlerts,
  pickDesignReads,
  pickTopNews,
  scoreArticle,
  type BriefArticle,
} from "@/lib/domain/briefing";

const NOW = new Date("2026-10-05T06:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();
const art = (id: string, over: Partial<BriefArticle> = {}): BriefArticle => ({
  id: id.padEnd(24, "0"),
  title: `Story ${id}`,
  sourceId: `src-${id}`,
  sourceName: `Source ${id}`,
  category: "tech-news",
  publishedAt: hoursAgo(2),
  readingMinutes: 4,
  tags: [],
  read: false,
  bookmarked: false,
  ...over,
});

describe("scoreArticle", () => {
  it("prefers fresh over stale and weighted categories over minor ones", () => {
    expect(scoreArticle(art("a", { publishedAt: hoursAgo(1) }), NOW)).toBeGreaterThan(scoreArticle(art("a", { publishedAt: hoursAgo(60) }), NOW));
    expect(scoreArticle(art("a", { category: "ai-labs" }), NOW)).toBeGreaterThan(scoreArticle(art("a", { category: "career" }), NOW));
  });
  it("adds for interests (capped), bookmarks and long system design reads", () => {
    const base = scoreArticle(art("a"), NOW);
    expect(scoreArticle(art("a", { tags: ["llm"] }), NOW, ["llm"])).toBeCloseTo(base + 1.5);
    expect(scoreArticle(art("a", { tags: ["llm", "dsa", "caching", "infra"] }), NOW, ["llm", "dsa", "caching", "infra"])).toBeCloseTo(base + 3);
    expect(scoreArticle(art("a", { bookmarked: true }), NOW)).toBeCloseTo(base + 1);
    const sd = art("a", { category: "system-design", readingMinutes: 8 });
    expect(scoreArticle(sd, NOW)).toBeGreaterThan(scoreArticle({ ...sd, readingMinutes: 2 }, NOW));
  });
  it("gives undated items a small recency", () => {
    expect(scoreArticle(art("a", { publishedAt: null }), NOW)).toBeLessThan(scoreArticle(art("a"), NOW));
  });
});

describe("pickTopNews", () => {
  it("returns unread, recent news, best first, one per source", () => {
    const list = [
      art("a", { category: "ai-labs", publishedAt: hoursAgo(1) }),
      art("b", { sourceId: "src-a", category: "ai-labs", publishedAt: hoursAgo(1) }),
      art("c", { read: true, category: "ai-labs" }),
      art("d", { publishedAt: hoursAgo(200), category: "ai-labs" }),
      art("e", { category: "system-design" }),
      art("f", { category: "engineering", publishedAt: hoursAgo(5) }),
    ];
    const top = pickTopNews(list, NOW);
    expect(top.map((x) => x.id.slice(0, 1))).toEqual(["a", "f"]);
    expect(top.some((x) => x.id.startsWith("c") || x.id.startsWith("d") || x.id.startsWith("e") || x.id.startsWith("b"))).toBe(false);
  });
  it("respects the limit and is deterministic", () => {
    const list = Array.from({ length: 9 }, (_, i) => art(String(i)));
    expect(pickTopNews(list, NOW, { limit: 3 })).toHaveLength(3);
    expect(pickTopNews(list, NOW).map((x) => x.id)).toEqual(pickTopNews([...list].reverse(), NOW).map((x) => x.id));
  });
});

describe("pickAlerts", () => {
  it("only lets fresh, high-scoring stories through", () => {
    const hot = art("h", { category: "ai-labs", publishedAt: hoursAgo(1) });
    const old = art("o", { category: "ai-labs", publishedAt: hoursAgo(ALERT_MAX_AGE_H + 5) });
    const meh = art("m", { category: "tech-news", publishedAt: hoursAgo(9) });
    const undated = art("u", { category: "ai-labs", publishedAt: null });
    expect(pickAlerts([meh, old, hot, undated], NOW).map((x) => x.id)).toEqual([hot.id]);
  });
  it("interests can lift a story over the bar", () => {
    const a = art("i", { category: "tech-news", publishedAt: hoursAgo(1), tags: ["llm", "distributed"] });
    expect(pickAlerts([a], NOW)).toHaveLength(0);
    expect(pickAlerts([a], NOW, ["llm", "distributed"])).toHaveLength(1);
  });
});

describe("pickDesignReads", () => {
  it("puts case matches first, then the best system design posts, skipping excluded and read ones", () => {
    const match = art("m", { category: "engineering", title: "How we built our rate limiter", tags: ["reliability"] });
    const sd1 = art("s", { category: "system-design", readingMinutes: 9 });
    const sd2 = art("t", { category: "system-design", readingMinutes: 3 });
    const gone = art("x", { category: "system-design", read: true });
    const dup = art("d", { category: "system-design" });
    const out = pickDesignReads([sd2, gone, sd1, match, dup], NOW, { caseKeywords: ["rate limiter"], caseTags: ["reliability"], exclude: new Set([dup.id]), limit: 3 });
    expect(out.map((x) => x.id)).toEqual([match.id, sd1.id, sd2.id]);
  });
  it("works without a case", () => {
    expect(pickDesignReads([art("s", { category: "system-design" })], NOW)).toHaveLength(1);
  });
});

describe("briefingDigest and alertMail", () => {
  it("is null when there is nothing to say", () => {
    expect(briefingDigest({ date: "2026-10-05", news: [], designReads: [], designCases: [], questions: [], streak: 0 })).toBeNull();
  });
  it("lists news, design study and questions with links", () => {
    const d = briefingDigest({
      date: "2026-10-05",
      news: [{ title: "Big launch", path: "/news/abc" }],
      designReads: [{ title: "Sharding at scale", path: "/news/def" }],
      designCases: [{ title: "Case: Rate limiter", path: "/design/rate-limiter" }],
      questions: [{ title: "Two Sum", path: "/dsa/two-sum", note: "Easy" }],
      companies: ["Google"],
      streak: 3,
      appUrl: "https://prep.example.com",
    })!;
    expect(d.spec.sections.map((s) => s.heading)).toEqual(["Top news", "System design: study this", "Questions to practise"]);
    expect(d.text).toContain("https://prep.example.com/news/abc");
    expect(d.spec.intro).toContain("Google");
  });
  it("escapes article titles in the HTML", () => {
    const a = alertMail(art("z", { title: "<script>alert(1)</script>" }));
    expect(a.html).not.toContain("<script>");
    expect(a.title).toContain("Top story");
  });
});

describe("interestTags and localHour", () => {
  it("always includes the core tags and adds per kind of company", () => {
    expect(interestTags([])).toEqual(expect.arrayContaining(["system-design", "llm"]));
    expect(interestTags(["ai-data"])).toContain("queues");
    expect(interestTags(["nope"])).toEqual(interestTags([]));
  });
  it("reads the hour in the given zone", () => {
    expect(localHour(new Date("2026-10-05T02:30:00Z"), "Asia/Kolkata")).toBe(8);
    expect(localHour(new Date("2026-10-05T23:00:00Z"), "Asia/Kolkata")).toBe(4);
  });
});

describe("briefing follow-ups", () => {
  it("adds applications to follow up, and a briefing with only those is still worth sending", () => {
    const d = briefingDigest({ date: "2026-10-05", news: [], designReads: [], designCases: [], questions: [], followUps: [{ title: "Backend Engineer at Acme", path: "/jobs/abc", note: "applied" }], streak: 0 })!;
    expect(d).not.toBeNull();
    expect(d.spec.sections.map((s) => s.heading)).toEqual(["Applications to follow up"]);
    expect(d.summary).toContain("1 application to follow up");
  });
});
