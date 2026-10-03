import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { RawItem } from "@/lib/domain/news";
import { DayLog } from "@/lib/models/day";
import { Article, Notification, Settings } from "@/lib/models/system";
import type { FeedFetcher } from "@/lib/news/fetch";
import type { NotifyChannel } from "@/lib/notify";
import { runEvening, runMorning, runReminder } from "@/lib/services/cron";
import type { Extractor } from "@/lib/news/extract";
import {
  ensureArticleContent,
  getArticle,
  listArticles,
  markArticleRead,
  nextUnread,
  prefetchArticleContent,
  refreshNews,
  retryArticleContent,
  setBookmark,
} from "@/lib/services/news";
import { notify } from "@/lib/services/notifications";
import { getSetupChecklist } from "@/lib/services/setup";
import { at, resetDb, startDb, stopDb } from "./db";

process.env.CRON_SECRET = "cron-secret-cron-secret";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
});

const item = (url: string, title: string): RawItem => ({ url, title, publishedAt: new Date("2026-10-05T00:00:00Z"), snippet: "s" });

function fakeFetcher(byId: Record<string, RawItem[]>): FeedFetcher & { calls: number } {
  const f = Object.assign(
    async (source: { id: string }) => {
      f.calls++;
      if (source.id === "openai") throw new Error("down");
      return byId[source.id] ?? [];
    },
    { calls: 0 },
  );
  return f;
}

const longBody = `<h2>Sharding</h2><p>${Array(300).fill("partition keys spread load").join(" ")}</p><img src="https://cdn.x/d.png">`;

function fakeExtractor(fail: string[] = []): Extractor & { calls: string[] } {
  const calls: string[] = [];
  return Object.assign(
    async (url: string) => {
      calls.push(url);
      if (fail.includes(url)) throw new Error("HTTP 403");
      return { markdown: `## Extracted\n\n${Array(1200).fill("cache").join(" ")}`, leadImage: "https://og.x/i.png" };
    },
    { calls },
  );
}

function fakeChannel(): NotifyChannel & { sent: string[]; bodies: string[]; htmls: (string | undefined)[] } {
  const sent: string[] = [];
  const bodies: string[] = [];
  const htmls: (string | undefined)[] = [];
  return {
    name: "telegram",
    sent,
    bodies,
    htmls,
    send: async (title, body, html) => {
      sent.push(title);
      bodies.push(body);
      htmls.push(html);
    },
  };
}

describe("news", () => {
  it("refreshes once, tolerates broken feeds and dedupes across sources", async () => {
    const fetcher = fakeFetcher({
      "google-ai": [item("https://blog.google/a", "Gemini 4 launches")],
      "gn-gemini": [item("https://news.google.com/r/1", "Gemini 4 launches - The Verge"), item("https://news.google.com/r/2", "Other story")],
    });
    const first = await refreshNews({ fetcher, now: at("2026-10-06") });
    expect(first).toMatchObject({ status: "ok", inserted: 2, failed: ["openai"] });
    expect(await Article.countDocuments()).toBe(2);

    expect((await refreshNews({ fetcher, now: at("2026-10-06") })).status).toBe("fresh");
    const forced = await refreshNews({ fetcher, force: true, now: new Date(at("2026-10-06").getTime() + 120_000) });
    expect(forced).toMatchObject({ status: "ok", inserted: 0 });
  });

  it("counts the first read toward today's readings, once", async () => {
    await refreshNews({ fetcher: fakeFetcher({ hf: [item("https://hf.co/1", "A"), item("https://hf.co/2", "B")] }), now: at("2026-10-06") });
    const [a] = await listArticles();
    expect((await markArticleRead(a.id, at("2026-10-06"))).readings).toBe(1);
    expect((await markArticleRead(a.id, at("2026-10-07"))).readings).toBe(0);
    expect((await DayLog.findOne({ date: "2026-10-06" }).lean())?.readings).toBe(1);
    expect(await listArticles({ filter: "unread" })).toHaveLength(1);
  });

  it("stores full feed bodies as markdown, leaves teasers for extraction, marks Google News headline-only", async () => {
    await refreshNews({
      fetcher: fakeFetcher({
        bytebytego: [{ ...item("https://blog.bytebytego.com/p/shard", "How sharding works"), contentHtml: longBody }],
        infoq: [{ ...item("https://www.infoq.com/news/x", "Short teaser"), contentHtml: "<p>Only a teaser.</p>" }],
        "gn-backend": [item("https://news.google.com/rss/articles/abc", "System design news")],
      }),
      now: at("2026-10-06"),
    });
    const list = await listArticles();
    const by = Object.fromEntries(list.map((a) => [a.title, a]));
    expect(by["How sharding works"]).toMatchObject({ contentStatus: "full", readingMinutes: 5, leadImage: "https://cdn.x/d.png" });
    expect(by["How sharding works"].tags).toContain("distributed");
    expect(by["Short teaser"].contentStatus).toBeNull();
    expect(by["System design news"].contentStatus).toBe("headline");
    expect(list.every((a) => !("content" in a))).toBe(true);

    const full = await getArticle(by["How sharding works"].id);
    expect(full?.content).toMatch(/^## Sharding\n\npartition keys/);
    expect(await listArticles({ minMinutes: 5 })).toHaveLength(1);
    expect(await listArticles({ tag: "distributed" })).toHaveLength(1);
  });

  it("extracts on demand once, records failures and never retries them", async () => {
    await refreshNews({
      fetcher: fakeFetcher({ infoq: [item("https://www.infoq.com/a", "A"), item("https://www.infoq.com/b", "B")] }),
      now: at("2026-10-06"),
    });
    const [a, b] = (await listArticles()).toSorted((x, y) => x.title.localeCompare(y.title));
    const ex = fakeExtractor(["https://www.infoq.com/b"]);
    expect(await ensureArticleContent(a.id, ex)).toBe("extracted");
    expect(await ensureArticleContent(a.id, ex)).toBe("extracted");
    expect(await ensureArticleContent(b.id, ex)).toBe("failed");
    expect(await ensureArticleContent(b.id, ex)).toBe("failed");
    expect(ex.calls).toEqual(["https://www.infoq.com/a", "https://www.infoq.com/b"]);

    const got = await getArticle(a.id);
    expect(got).toMatchObject({ contentStatus: "extracted", readingMinutes: 5, leadImage: "https://og.x/i.png", tags: ["caching"] });
    expect((await getArticle(b.id))?.contentError).toBe("HTTP 403");
    expect(await nextUnread(a.id, "system-design")).toMatchObject({ id: b.id });
  });

  it("prefetch only touches untried articles in reading categories, within the limit", async () => {
    await refreshNews({
      fetcher: fakeFetcher({
        infoq: [item("https://www.infoq.com/1", "One"), item("https://www.infoq.com/2", "Two"), item("https://www.infoq.com/3", "Three")],
        "js-weekly": [item("https://javascriptweekly.com/1", "JS")],
      }),
      now: at("2026-10-06"),
    });
    const ex = fakeExtractor();
    expect(await prefetchArticleContent({ limit: 2, concurrency: 2, extractor: ex })).toEqual({ tried: 2, extracted: 2, failed: 0 });
    expect(await prefetchArticleContent({ extractor: ex })).toEqual({ tried: 1, extracted: 1, failed: 0 });
    expect(ex.calls.some((u) => u.includes("javascriptweekly"))).toBe(false);
  });

  it("exempts bookmarks from the 30-day cleanup", async () => {
    await refreshNews({ fetcher: fakeFetcher({ hf: [item("https://hf.co/1", "A")] }), now: at("2026-10-06") });
    const [a] = await listArticles();
    await setBookmark(a.id, true);
    expect((await Article.findById(a.id).lean())?.fetchedAt).toBeUndefined();
    expect(await listArticles({ filter: "bookmarked" })).toHaveLength(1);
    await setBookmark(a.id, false);
    expect((await Article.findById(a.id).lean())?.fetchedAt).toBeInstanceOf(Date);
  });
});

describe("notifications and cron", () => {
  it("dedupes by key and only pushes the first time", async () => {
    const ch = fakeChannel();
    expect(await notify({ kind: "plan", title: "T", body: "B", dedupeKey: "plan:x" }, { push: true, channels: [ch] })).toEqual({ created: true, pushed: ["telegram"] });
    expect(await notify({ kind: "plan", title: "T", body: "B", dedupeKey: "plan:x" }, { push: true, channels: [ch] })).toEqual({ created: false, pushed: [] });
    expect(ch.sent).toEqual(["T"]);
  });

  it("morning: news, plan and notification; safe to re-run", async () => {
    const ch = fakeChannel();
    const fetcher = fakeFetcher({ hf: [item("https://hf.co/1", "A")] });
    const extractor = fakeExtractor();
    const res = await runMorning(at("2026-10-06"), { channels: [ch], fetcher, extractor });
    expect(res.today).toBe("2026-10-06");
    expect(res.news).toMatchObject({ ok: true });
    expect(res.articles).toMatchObject({ ok: true, detail: { tried: 1, extracted: 1 } });
    expect(res.plan).toMatchObject({ ok: true, detail: { kind: "study", notified: true } });
    expect(res.leetcode).toMatchObject({ ok: true, detail: { status: "disabled" } });
    await runMorning(at("2026-10-06"), { channels: [ch], fetcher, extractor });
    expect(await Notification.countDocuments({ kind: "plan" })).toBe(1);
    expect((await Notification.findOne({ kind: "plan" }).lean())?.title).toBe("Today's plan is ready");
    expect(ch.sent).toHaveLength(1);
    expect(ch.sent[0]).toMatch(/^.+ \| Today's targets · 2026-10-06$/);
    expect(ch.bodies[0]).toMatch(/DSA problems?.*then the daily quiz/);
    expect(ch.bodies[0]).toContain("Daily quiz");
    expect(ch.htmls[0]).toContain("<h2");
  });

  it("morning with roast mode off: the plain subject", async () => {
    await Settings.updateOne({ _id: "settings" }, { $set: { roastMode: false } });
    const ch = fakeChannel();
    await runMorning(at("2026-10-06"), { channels: [ch], fetcher: fakeFetcher({}), extractor: fakeExtractor() });
    expect(ch.sent).toEqual(["Today's targets · 2026-10-06"]);
  });

  it("morning on a rest day: a day-off note instead of targets", async () => {
    await Settings.updateOne({ _id: "settings" }, { $set: { restDays: ["2026-10-06"] } });
    const ch = fakeChannel();
    const res = await runMorning(at("2026-10-06"), { channels: [ch], fetcher: fakeFetcher({}), extractor: fakeExtractor() });
    expect(res.plan).toMatchObject({ ok: true, detail: { kind: "rest", notified: true } });
    expect((await Notification.findOne({ kind: "plan" }).lean())?.title).toBe("Day off");
    expect(ch.sent[0]).toMatch(/^.+ \| Day off · 2026-10-06$/);
  });

  it("evening: sends the day recap once", async () => {
    const ch = fakeChannel();
    const res = await runEvening(at("2026-10-06"), [ch]);
    expect(res).toMatchObject({ recapped: true, pushed: ["telegram"] });
    expect((await runEvening(at("2026-10-06"), [ch])).recapped).toBe(false);
    const n = await Notification.findOne({ kind: "recap" }).lean();
    expect(n?.title).toMatch(/^Day recap · 2026-10-06 · /);
    expect(n?.body).toMatch(/Still open: \d+ DSA problems?/);
  });

  it("reminder: nudges when incomplete, once", async () => {
    const ch = fakeChannel();
    const res = await runReminder(at("2026-10-06"), [ch]);
    expect(res).toMatchObject({ reminded: true, pushed: ["telegram"] });
    expect((await runReminder(at("2026-10-06"), [ch])).reminded).toBe(false);
    expect((await Notification.findOne({ kind: "reminder" }).lean())?.body).toMatch(/^Left: \d+ DSA problems?/);
  });

  it("setup checklist sees the job runs, news failures and missing LeetCode username", async () => {
    process.env.AUTH_SECRET ??= "test-secret-that-is-at-least-32-characters";
    const before = await getSetupChecklist({ remember: true, now: at("2026-10-06") });
    expect(before.items.find((i) => i.id === "jobs")?.status).toBe("todo");

    await runMorning(at("2026-10-06"), { fetcher: fakeFetcher({ hf: [item("https://hf.co/1", "A")] }), extractor: fakeExtractor(), channels: [] });
    const after = await getSetupChecklist({ remember: false, now: new Date(at("2026-10-06").getTime() + 3_600_000) });
    const byId = Object.fromEntries(after.items.map((i) => [i.id, i]));
    expect(byId.jobs.detail).toContain("Morning ran 1h ago");
    expect(byId.news.detail).toContain("1 of");
    expect(byId.leetcode.status).toBe("todo");
    expect(byId.session.status).toBe("warn");
    expect(byId.database.status).toBe("todo");
  });

  it("cron routes reject a missing or wrong bearer token", async () => {
    const { GET } = await import("@/app/api/cron/evening/route");
    expect((await GET(new Request("http://x/api/cron/evening"))).status).toBe(401);
    expect((await GET(new Request("http://x/api/cron/evening", { headers: { authorization: "Bearer nope" } }))).status).toBe(401);
    const ok = await GET(new Request("http://x/api/cron/evening", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }));
    expect(ok.status).toBe(200);
  });
});

describe("conditional feeds, retry and prefetch", () => {
  it("sends remembered validators and treats 304 as no change", async () => {
    const seen: Array<{ id: string; etag?: string }> = [];
    let round = 0;
    const fetcher: FeedFetcher = async (source, validators) => {
      if (source.id !== "hf") return [];
      seen.push({ id: source.id, etag: validators?.etag });
      return round++ === 0 ? { items: [item("https://hf.co/1", "A")], etag: '"v1"' } : { notModified: true };
    };
    expect(await refreshNews({ fetcher, now: at("2026-10-06") })).toMatchObject({ status: "ok", inserted: 1, failed: [] });
    const later = new Date(at("2026-10-06").getTime() + 120_000);
    expect(await refreshNews({ fetcher, force: true, now: later })).toMatchObject({ status: "ok", inserted: 0, failed: [] });
    expect(seen).toEqual([{ id: "hf", etag: undefined }, { id: "hf", etag: '"v1"' }]);
  });

  it("retries a failed extraction once a minute", async () => {
    await refreshNews({ fetcher: fakeFetcher({ infoq: [item("https://www.infoq.com/a", "A")] }), now: at("2026-10-06") });
    const [a] = await listArticles();
    expect(await ensureArticleContent(a.id, fakeExtractor(["https://www.infoq.com/a"]))).toBe("failed");
    const ex = fakeExtractor();
    expect((await retryArticleContent(a.id, { extractor: ex })).status).toBe("rate-limited");
    const later = new Date(Date.now() + 61_000);
    expect(await retryArticleContent(a.id, { extractor: ex, now: later })).toEqual({ status: "retried", contentStatus: "extracted" });
    expect(await retryArticleContent(a.id, { extractor: ex, now: later })).toEqual({ status: "not-failed" });
  });

  it("prefetches only unread articles", async () => {
    await refreshNews({
      fetcher: fakeFetcher({ infoq: [item("https://www.infoq.com/a", "A"), item("https://www.infoq.com/b", "B")] }),
      now: at("2026-10-06"),
    });
    const [a] = await listArticles();
    await markArticleRead(a.id, at("2026-10-06"));
    const ex = fakeExtractor();
    expect(await prefetchArticleContent({ extractor: ex })).toEqual({ tried: 1, extracted: 1, failed: 0 });
    expect(ex.calls).toHaveLength(1);
  });
});
