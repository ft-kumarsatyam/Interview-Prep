import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startReplDb, stopDb } from "@/tests/services/db";

beforeAll(startReplDb);
afterAll(stopDb);

describe("transactional outbox on a replica set", () => {
  it("commits the state change and its event together", async () => {
    const { inTransaction, enqueueEvent, resetTransactionSupport } = await import("@/core/events/outbox");
    const { Notification } = await import("@/core/models/system");
    const { Outbox } = await import("@/core/models/outbox");
    await Promise.all([Notification.createCollection(), Outbox.createCollection()]);
    resetTransactionSupport();
    await inTransaction(async (session) => {
      await Notification.create([{ kind: "plan", title: "T", body: "b" }], { session });
      await enqueueEvent("JobSyncRequested", {}, { session });
    });
    expect(await Notification.countDocuments({})).toBe(1);
    expect(await Outbox.countDocuments({})).toBe(1);
  });

  it("rolls both back when something fails after the event was queued", async () => {
    const { inTransaction, enqueueEvent } = await import("@/core/events/outbox");
    const { Notification } = await import("@/core/models/system");
    const { Outbox } = await import("@/core/models/outbox");
    await expect(
      inTransaction(async (session) => {
        await Notification.create([{ kind: "plan", title: "T2", body: "b" }], { session });
        await enqueueEvent("JobSyncRequested", {}, { session });
        throw new Error("crash before commit");
      }),
    ).rejects.toThrow("crash before commit");
    expect(await Notification.countDocuments({ title: "T2" })).toBe(0);
    expect(await Outbox.countDocuments({})).toBe(1); // only the first test's event
  });
});
