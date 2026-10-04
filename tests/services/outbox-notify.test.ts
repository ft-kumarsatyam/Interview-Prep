import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb, startDb, stopDb } from "@/tests/services/db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  const { Outbox, Inbox } = await import("@/core/models/outbox");
  const { Notification } = await import("@/core/models/system");
  await Promise.all([Outbox.syncIndexes(), Inbox.syncIndexes(), Notification.syncIndexes()]);
  Object.assign(process.env, { TELEGRAM_BOT_TOKEN: "tg-token", TELEGRAM_CHAT_ID: "42" });
  const { resetEnvForTests } = await import("@/core/env");
  resetEnvForTests();
});

describe("notify() through the outbox", () => {
  it("delivers to each configured channel and records done events", async () => {
    const fetchMock = vi.fn(async (..._args: unknown[]) => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { notify } = await import("@/modules/notifications/services/notifications");
    const { Outbox } = await import("@/core/models/outbox");
    const res = await notify({ kind: "plan", title: "Today", body: "Do it", dedupeKey: "plan:2026-01-01" }, { push: true });
    expect(res).toEqual({ created: true, pushed: ["telegram"] });
    expect(String(fetchMock.mock.calls[0]![0])).toContain("api.telegram.org");
    const rows = await Outbox.find({}).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ type: "NotificationRequested", status: "done" });
    vi.unstubAllGlobals();
  });

  it("keeps a failed send in the outbox and the relay delivers it later, exactly once", async () => {
    let up = false;
    const fetchMock = vi.fn(async (..._args: unknown[]) => new Response("down", { status: up ? 200 : 502 }));
    vi.stubGlobal("fetch", fetchMock);
    const { notify } = await import("@/modules/notifications/services/notifications");
    const { Outbox } = await import("@/core/models/outbox");
    const { relayOutbox } = await import("@/core/events/relay");
    const { MongoPollBroker } = await import("@/core/broker/mongo-poll");

    const res = await notify({ kind: "recap", title: "Recap", body: "Good day", dedupeKey: "recap:2026-01-01" }, { push: true });
    expect(res).toEqual({ created: true, pushed: [] }); // in-app notification still created; the send is pending
    expect(await Outbox.findOne({}).lean()).toMatchObject({ status: "pending", attempts: 1 });

    up = true;
    const out = await relayOutbox({ broker: new MongoPollBroker(), now: new Date(Date.now() + 3600_000) });
    expect(out.done).toBe(1);
    expect((await Outbox.findOne({}).lean())?.status).toBe("done");
    const callsAfter = fetchMock.mock.calls.length;
    await relayOutbox({ broker: new MongoPollBroker(), now: new Date(Date.now() + 7200_000) });
    expect(fetchMock.mock.calls.length).toBe(callsAfter);
    vi.unstubAllGlobals();
  });

  it("a repeated dedupeKey creates nothing and queues nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    const { notify } = await import("@/modules/notifications/services/notifications");
    const { Outbox } = await import("@/core/models/outbox");
    await notify({ kind: "plan", title: "T", body: "b", dedupeKey: "plan:x" }, { push: true });
    expect(await notify({ kind: "plan", title: "T", body: "b", dedupeKey: "plan:x" }, { push: true })).toEqual({ created: false, pushed: [] });
    expect(await Outbox.countDocuments({})).toBe(1);
    vi.unstubAllGlobals();
  });

  it("without push (or with explicit channels) nothing goes through the outbox", async () => {
    const { notify } = await import("@/modules/notifications/services/notifications");
    const { Outbox } = await import("@/core/models/outbox");
    await notify({ kind: "news", title: "N", body: "b" });
    const send = vi.fn(async () => undefined);
    const res = await notify({ kind: "plan", title: "T", body: "b" }, { push: true, channels: [{ name: "email", send }] });
    expect(res.pushed).toEqual(["email"]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(await Outbox.countDocuments({})).toBe(0);
  });
});
