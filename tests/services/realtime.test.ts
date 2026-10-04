import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { decodeEvent, encodeEvent, resumeId, sseComment, sseMessage, sseRetry, summarise, type LiveEvent } from "@/lib/domain/live-events";
import { MemoryKv } from "@/lib/kv/memory";
import { MongoKv } from "@/lib/kv/mongo";
import { liveLastId, publish, readLive } from "@/lib/realtime";
import { liveStream } from "@/lib/realtime/stream";
import { notify } from "@/lib/services/notifications";
import { syncJobs } from "@/lib/services/job-sync";
import { Settings } from "@/lib/models/system";
import { invalidateSettings } from "@/lib/services/settings";
import { resetDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
});

describe("wire format", () => {
  it("frames events, keep-alives and the retry hint as the SSE spec requires", () => {
    expect(sseMessage({ id: "7", event: "jobs.new", data: '{"a":1}' })).toBe('id: 7\nevent: jobs.new\ndata: {"a":1}\n\n');
    expect(sseMessage({ data: "a\nb" })).toBe("data: a\ndata: b\n\n");
    expect(sseComment("hb")).toBe(": hb\n\n");
    expect(sseRetry(3000)).toBe("retry: 3000\n\n");
  });
  it("cannot be split into a second event by a newline in an id or event name", () => {
    const m = sseMessage({ id: "1\ndata: evil", event: "x\n\nevent: y", data: "ok" });
    expect(m.split("\n\n")).toHaveLength(2);
    expect(m).not.toContain("\ndata: evil");
  });
  it("reads the resume id from the header or a query, and rejects junk", () => {
    expect(resumeId("12", null)).toBe("12");
    expect(resumeId(null, "1727-0")).toBe("1727-0");
    expect(resumeId("12", "99")).toBe("12");
    expect(resumeId(null, null)).toBeNull();
    expect(resumeId("a b", null)).toBeNull();
    expect(resumeId("x".repeat(65), null)).toBeNull();
    expect(resumeId("1;DROP", null)).toBeNull();
  });
});

describe("events", () => {
  const e: LiveEvent = { type: "sync.done", ok: 80, failed: 2, added: 40 };
  it("round-trips and rejects anything malformed", () => {
    expect(decodeEvent(encodeEvent(e))).toEqual(e);
    for (const bad of ["", "{", "[]", '{"type":"nope"}', '{"type":"jobs.new","count":0}', '{"type":"sync.done","ok":-1,"failed":0,"added":0}']) expect(decodeEvent(bad), bad).toBeNull();
    expect(() => encodeEvent({ type: "jobs.new", count: 0 })).toThrow();
  });
  it("collapses a burst into what a page needs", () => {
    const s = summarise([{ type: "sync.progress", done: 10, total: 80 }, { type: "sync.progress", done: 40, total: 80 }, { type: "jobs.new", count: 5 }, { type: "jobs.new", count: 3 }, { type: "notification", kind: "news" }, { type: "capture", kind: "job" }]);
    expect(s).toEqual({ newJobs: 8, syncing: { done: 40, total: 80 }, syncDone: false, notifications: 1, captures: 1 });
    expect(summarise([{ type: "sync.progress", done: 1, total: 2 }, { type: "sync.done", ok: 2, failed: 0, added: 0 }])).toMatchObject({ syncing: null, syncDone: true });
  });
});

describe("liveStream", () => {
  const opts = (kv: MemoryKv, over: Partial<Parameters<typeof liveStream>[0]> = {}) => ({ kv, after: null, lifetimeMs: 60, pollMs: 5, heartbeatMs: 20, ...over });
  const collect = async (gen: AsyncGenerator<string>) => {
    const out: string[] = [];
    for await (const c of gen) out.push(c);
    return out.join("");
  };

  it("starts from now, delivers new events in order, heartbeats, and ends by itself", async () => {
    const kv = new MemoryKv();
    await kv.eventsAppend("live", encodeEvent({ type: "capture", kind: "job" })); // before the tab opened: not replayed
    const run = collect(liveStream(opts(kv, { lifetimeMs: 120 })));
    await new Promise((r) => setTimeout(r, 30));
    await kv.eventsAppend("live", encodeEvent({ type: "jobs.new", count: 3 }));
    await kv.eventsAppend("live", encodeEvent({ type: "notification", kind: "news" }));
    const text = await run;
    expect(text.startsWith("retry: 3000\n\n: connected\n\n")).toBe(true);
    expect(text).not.toContain("event: capture");
    expect(text.indexOf("event: jobs.new")).toBeGreaterThan(0);
    expect(text.indexOf("event: notification")).toBeGreaterThan(text.indexOf("event: jobs.new"));
    expect(text).toContain(": hb");
  });

  it("resumes after the id the browser last saw, without repeats", async () => {
    const kv = new MemoryKv();
    const a = await kv.eventsAppend("live", encodeEvent({ type: "jobs.new", count: 1 }));
    await kv.eventsAppend("live", encodeEvent({ type: "jobs.new", count: 2 }));
    const text = await collect(liveStream(opts(kv, { after: a, lifetimeMs: 25 })));
    expect(text.match(/event: jobs\.new/g)).toHaveLength(1);
    expect(text).toContain('"count":2');
    expect(text).not.toContain('"count":1');
  });

  it("stops promptly when the client disconnects", async () => {
    const ctrl = new AbortController();
    const started = Date.now();
    const run = collect(liveStream({ ...opts(new MemoryKv(), { lifetimeMs: 10_000, pollMs: 50 }), signal: ctrl.signal }));
    setTimeout(() => ctrl.abort(), 40);
    await run;
    expect(Date.now() - started).toBeLessThan(500);
  });

  it("keeps going after a read error and tells the page", async () => {
    const kv = new MemoryKv();
    let calls = 0;
    const flaky = Object.assign(Object.create(kv), {
      eventsRead: async (c: string, a: string, l?: number) => {
        if (++calls === 1) throw new Error("down");
        return kv.eventsRead(c, a, l);
      },
      eventsLastId: async () => null,
    });
    const text = await collect(liveStream({ ...opts(flaky), lifetimeMs: 60 }));
    expect(text).toContain(": read failed, retrying");
    expect(calls).toBeGreaterThan(1);
  });

  it("passes unknown stored messages as a harmless skip instead of breaking the stream", async () => {
    const kv = new MemoryKv();
    const a = await kv.eventsAppend("live", "{}");
    await kv.eventsAppend("live", "garbage");
    const text = await collect(liveStream(opts(kv, { after: "0", lifetimeMs: 20 })));
    expect(a).toBe("1");
    expect(text.match(/event: skip/g)).toHaveLength(2);
  });
});

describe("publishing from the app", () => {
  it("notify() tells open tabs, and a failed publish never breaks it", async () => {
    const before = await liveLastId();
    await notify({ kind: "news", title: "T", body: "B", dedupeKey: "t:1" });
    const rows = await readLive(before ?? "0");
    expect(rows.map((r) => r.event)).toEqual([{ type: "notification", kind: "news" }]);
    expect(await notify({ kind: "news", title: "T", body: "B", dedupeKey: "t:1" })).toMatchObject({ created: false });
    expect((await readLive(before ?? "0")).length).toBe(1);
  });

  it("a sync reports progress and then what it found", async () => {
    const before = (await liveLastId()) ?? "0";
    const body = JSON.stringify({ jobs: [{ id: 1, title: "Backend Engineer", absolute_url: "https://boards.greenhouse.io/stripe/jobs/1", location: { name: "x" }, content: "Node.js" }], meta: { total: 1 } });
    await syncJobs({ now: new Date("2026-10-05T06:00:00Z"), fetcher: async () => ({ status: 200, text: body, headers: new Headers() }), only: ["stripe"] });
    const events = (await readLive(before)).map((r) => r.event);
    expect(events).toEqual(expect.arrayContaining([{ type: "sync.progress", done: 1, total: 1 }, { type: "sync.done", ok: 1, failed: 0, added: 1 }, { type: "jobs.new", count: 1 }]));
    expect(events.at(-1)).toEqual({ type: "jobs.new", count: 1 });
  });

  it("works the same on the Mongo store that production uses by default", async () => {
    const kv = new MongoKv();
    const id = await kv.eventsAppend("live", encodeEvent({ type: "capture", kind: "profile" }));
    const text = await (async () => {
      const out: string[] = [];
      for await (const c of liveStream({ kv, after: "0", lifetimeMs: 30, pollMs: 5, heartbeatMs: 1000 })) out.push(c);
      return out.join("");
    })();
    expect(text).toContain(`id: ${id}`);
    expect(text).toContain("event: capture");
  });
});
