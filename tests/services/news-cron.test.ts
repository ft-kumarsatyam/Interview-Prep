import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { RawItem } from "@/lib/domain/news";
import { DayLog } from "@/lib/models/day";
import { Article, Notification, Settings } from "@/lib/models/system";
import type { FeedFetcher } from "@/lib/news/fetch";
import type { NotifyChannel } from "@/lib/notify";
import { runEvening, runMorning } from "@/lib/services/cron";
import { listArticles, markArticleRead, refreshNews, setBookmark } from "@/lib/services/news";
import { notify } from "@/lib/services/notifications";
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

function fakeChannel(): NotifyChannel & { sent: string[] } {
  const sent: string[] = [];
  return { name: "telegram", sent, send: async (title) => void sent.push(title) };
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
    const res = await runMorning(at("2026-10-06"), { channels: [ch], fetcher });
    expect(res.today).toBe("2026-10-06");
    expect(res.news).toMatchObject({ ok: true });
    expect(res.plan).toMatchObject({ ok: true, detail: { kind: "study", notified: true } });
    expect(res.leetcode).toMatchObject({ ok: true, detail: { status: "disabled" } });
    await runMorning(at("2026-10-06"), { channels: [ch], fetcher });
    expect(await Notification.countDocuments({ kind: "plan" })).toBe(1);
    expect(ch.sent).toEqual(["Today's plan is ready"]);
  });

  it("evening: reminds when incomplete, once", async () => {
    const ch = fakeChannel();
    const res = await runEvening(at("2026-10-06"), [ch]);
    expect(res).toMatchObject({ reminded: true, pushed: ["telegram"] });
    expect((await runEvening(at("2026-10-06"), [ch])).reminded).toBe(false);
    expect((await Notification.findOne({ kind: "reminder" }).lean())?.body).toMatch(/^Left: \d+ DSA problems?/);
  });

  it("cron routes reject a missing or wrong bearer token", async () => {
    const { GET } = await import("@/app/api/cron/evening/route");
    expect((await GET(new Request("http://x/api/cron/evening"))).status).toBe(401);
    expect((await GET(new Request("http://x/api/cron/evening", { headers: { authorization: "Bearer nope" } }))).status).toBe(401);
    const ok = await GET(new Request("http://x/api/cron/evening", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }));
    expect(ok.status).toBe(200);
  });
});
