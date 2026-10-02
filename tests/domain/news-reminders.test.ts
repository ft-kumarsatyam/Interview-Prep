import { describe, expect, it } from "vitest";
import { cleanSnippet, googleNewsFeeds, mergeFeeds, safeUrl, timeAgo, titleKey, type RawItem } from "@/lib/domain/news";
import { eveningReminder, joinList, morningPlanMessage, remainingWork } from "@/lib/domain/reminders";
import type { DayProgress } from "@/lib/domain/streak";

const item = (url: string, title: string, iso = "2026-10-05T00:00:00Z"): RawItem => ({ url, title, publishedAt: new Date(iso), snippet: "" });
const src = (id: string) => ({ id, name: id, category: "ai-news", url: `https://x/${id}` });

describe("news helpers", () => {
  it("normalises titles, dropping the Google News publisher suffix", () => {
    expect(titleKey("OpenAI ships GPT-6 - The Verge")).toBe(titleKey("OpenAI ships GPT-6!"));
    expect(titleKey("  Hello,   World  ")).toBe("hello world");
  });

  it("strips HTML and entities into a bounded plain-text snippet", () => {
    expect(cleanSnippet("<p>Hi &amp; <b>bye</b><script>alert(1)</script></p>")).toBe("Hi & bye");
    expect(cleanSnippet("a".repeat(400), 10)).toHaveLength(10);
    expect(cleanSnippet(undefined)).toBe("");
  });

  it("only keeps http(s) links", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("not a url")).toBeNull();
    expect(safeUrl("https://openai.com/news")).toBe("https://openai.com/news");
  });

  it("builds Google News feeds from settings or defaults", () => {
    const defaults = [{ id: "gn-openai", name: "Google News · OpenAI", category: "ai-news", query: "OpenAI" }];
    const tpl = "https://news.google.com/rss/search?q={query}";
    expect(googleNewsFeeds(null, defaults, tpl)).toEqual([{ id: "gn-openai", name: "Google News · OpenAI", category: "ai-news", url: `${tpl.replace("{query}", "OpenAI")}` }]);
    const custom = googleNewsFeeds(["OpenAI", '"Node.js" release'], defaults, tpl);
    expect(custom.map((c) => c.id)).toEqual(["gn-openai", "gn-node-js-release"]);
    expect(custom[1].url).toContain(encodeURIComponent('"Node.js" release'));
  });

  it("caps per feed and dedupes by URL and title, newest first", () => {
    const merged = mergeFeeds(
      [
        { source: src("a"), items: [item("https://a/1", "Story one", "2026-10-01T00:00:00Z"), item("https://a/2", "Story two", "2026-10-03T00:00:00Z"), item("https://a/3", "Story three", "2026-10-02T00:00:00Z")] },
        { source: src("b"), items: [item("https://b/1", "Story two - Reuters", "2026-10-04T00:00:00Z"), item("https://a/2", "Dup url")] },
      ],
      2,
      new Set(["old story"]),
    );
    expect(merged.map((m) => m.url)).toEqual(["https://a/2", "https://a/3"]);
    expect(mergeFeeds([{ source: src("c"), items: [item("https://c/1", "Old story")] }], 5, new Set(["old story"]))).toEqual([]);
  });

  it("formats ages", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    expect(timeAgo(new Date("2026-10-05T11:59:30Z"), now)).toBe("just now");
    expect(timeAgo(new Date("2026-10-05T09:00:00Z"), now)).toBe("3h ago");
    expect(timeAgo(new Date("2026-10-03T12:00:00Z"), now)).toBe("2d ago");
  });
});

const study = (p: Partial<DayProgress> = {}): DayProgress => ({ kind: "study", dsaTarget: 3, dsaSolved: 1, theoryTarget: 2, theoryDone: 2, quizPassed: false, ...p });

describe("reminders", () => {
  it("lists what's left, quiz last", () => {
    expect(remainingWork(study())).toEqual(["2 DSA problems", "the daily quiz"]);
    expect(remainingWork(study({ dsaSolved: 3, theoryDone: 1 }))).toEqual(["1 theory subtopic", "the daily quiz"]);
    expect(remainingWork(study({ dsaSolved: 3, quizPassed: true }))).toEqual([]);
    expect(remainingWork(study({ kind: "rest" }))).toEqual([]);
    expect(remainingWork(study({ kind: "sunday" }))).toEqual(["the weekly review quiz"]);
  });

  it("joins lists in plain English", () => {
    expect(joinList(["a"])).toBe("a");
    expect(joinList(["a", "b", "c"])).toBe("a, b and c");
  });

  it("only reminds when the day is incomplete and mentions the streak", () => {
    expect(eveningReminder(study(), 4)?.body).toBe("Left: 2 DSA problems and the daily quiz. Your 4-day streak is on the line.");
    expect(eveningReminder(study({ dsaSolved: 3, quizPassed: true }), 4)).toBeNull();
  });

  it("writes the morning plan, skipping rest days", () => {
    expect(morningPlanMessage(study(), ["Closures"])?.body).toBe("3 DSA problems and 2 theory subtopics, then the daily quiz. Theory: Closures.");
    expect(morningPlanMessage(study({ kind: "rest" }), [])).toBeNull();
  });
});
