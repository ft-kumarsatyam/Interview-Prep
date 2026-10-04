import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deliveryView } from "@/modules/notifications/domain/delivery";

const at = new Date("2026-10-04T17:12:39Z");

describe("deliveryView", () => {
  it("reads the provider and message id from a finished row", () => {
    const v = deliveryView("email", { status: "done", doneAt: at, result: { "notify.send-channel": { sent: true, provider: "resend", id: "abc-123" } } });
    expect(v).toEqual({ channel: "email", state: "sent", at, provider: "resend", id: "abc-123" });
  });

  it("marks a skipped send with its reason", () => {
    const v = deliveryView("push", { status: "done", doneAt: at, result: { "notify.send-channel": { sent: false, reason: "No device has turned on notifications yet" } } });
    expect(v.state).toBe("skipped");
    expect(v.note).toMatch(/No device/);
  });

  it("shows retries and dead letters with the error", () => {
    expect(deliveryView("email", { status: "pending", attempts: 2, lastError: "HTTP 403: domain not verified", createdAt: at })).toMatchObject({ state: "retrying", note: "HTTP 403: domain not verified" });
    expect(deliveryView("email", { status: "dead", lastError: "boom", createdAt: at })).toMatchObject({ state: "failed", note: "boom" });
  });

  it("treats a finished row from before results were stored as sent", () => {
    expect(deliveryView("email", { status: "done", doneAt: at, result: null })).toMatchObject({ state: "sent", provider: undefined });
  });
});

describe("vercel.json crons", () => {
  const crons = (JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: { path: string; schedule: string }[] }).crons;
  const IST_OFFSET_MIN = 330;

  it("are all daily (Hobby rejects anything more frequent)", () => {
    for (const c of crons) {
      const [min, hour, ...rest] = c.schedule.split(" ");
      expect(/^\d+$/.test(min!) && /^\d+$/.test(hour!), c.path).toBe(true);
      expect(rest, c.path).toEqual(["*", "*", "*"]);
    }
  });

  it("run the evening recap so the whole firing hour stays before midnight IST", () => {
    const evening = crons.find((c) => c.path === "/api/cron/evening")!;
    const [min, hour] = evening.schedule.split(" ").map(Number);
    const latestIst = (hour! * 60 + min! + 59 + IST_OFFSET_MIN) % (24 * 60);
    expect(latestIst).toBeGreaterThanOrEqual(18 * 60);
    expect(latestIst).toBeLessThan(24 * 60);
  });

  it("include the evening nudge", () => {
    expect(crons.map((c) => c.path)).toContain("/api/cron/reminder");
  });
});
