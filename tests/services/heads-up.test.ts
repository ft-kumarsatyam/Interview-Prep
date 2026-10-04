import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Notification, Settings } from "@/core/models/system";
import type { NotifyChannel } from "@/core/notify";
import { runReminder } from "@/core/services/cron";
import { sendCalendarHeadsUp, sendDesignTopic, sendResumeCheck } from "@/modules/notifications/services/heads-up";
import { listNotifications } from "@/modules/notifications/services/notifications";
import { ensureToday } from "@/modules/planner/services/plan";
import { saveBaseResume } from "@/modules/resume/services/resume";
import { invalidateSettings, setMailPref } from "@/modules/settings/services/settings";
import { at, resetDb, startDb, stopDb } from "./db";

process.env.CRON_SECRET = "cron-secret-cron-secret";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
});

function channel(): NotifyChannel & { sent: string[] } {
  const sent: string[] = [];
  return { name: "telegram", sent, send: async (title) => void sent.push(title) };
}

const stateOn = (date: string) => ensureToday(at(date));

describe("resume check", () => {
  it("asks for a resume once a month, with a push, and not again", async () => {
    const ch = channel();
    const state = await stateOn("2026-10-20");
    expect(await sendResumeCheck(state, [ch])).toMatchObject({ sent: true });
    expect(ch.sent).toEqual(["Add your resume"]);
    expect(await sendResumeCheck(state, [ch])).toMatchObject({ sent: false });
    expect((await listNotifications()).items[0]).toMatchObject({ kind: "resume", title: "Add your resume" });
  });

  it("stays quiet once a fresh resume is saved", async () => {
    await saveBaseResume("Senior engineer. ".repeat(10));
    expect(await sendResumeCheck(await stateOn("2026-10-20"), [channel()])).toMatchObject({ sent: false, reason: "resume is fresh" });
  });

  it("still lands in the bell when switched off, but pushes nothing", async () => {
    await setMailPref("resume", false);
    const ch = channel();
    expect(await sendResumeCheck(await stateOn("2026-10-20"), [ch])).toMatchObject({ sent: true });
    expect(ch.sent).toEqual([]);
  });
});

describe("design topic", () => {
  it("sends the day's case once", async () => {
    const ch = channel();
    const state = await stateOn("2026-10-20");
    const res = await sendDesignTopic(state, [ch]);
    expect(res.sent).toBe(true);
    expect(ch.sent[0]).toMatch(/^System design today: /);
    expect(await sendDesignTopic(state, [ch])).toMatchObject({ sent: false });
    expect(await Notification.countDocuments({ kind: "design" })).toBe(1);
  });
});

describe("calendar heads-up", () => {
  it("is silent before an ordinary day and speaks before a rest day", async () => {
    const ch = channel();
    expect(await sendCalendarHeadsUp(await stateOn("2026-10-20"), [ch])).toMatchObject({ sent: false });
    await Settings.updateOne({ _id: "settings" }, { $set: { restDays: ["2026-10-22"] } });
    invalidateSettings();
    const res = await sendCalendarHeadsUp(await stateOn("2026-10-21"), [ch]);
    expect(res.sent).toBe(true);
    expect(ch.sent[0]).toMatch(/day off/);
  });

  it("rides along with the evening reminder run even when the day needs no nudge", async () => {
    await Settings.updateOne({ _id: "settings" }, { $set: { restDays: ["2026-10-22"] } });
    invalidateSettings();
    const res = await runReminder(at("2026-10-21"), [channel()]);
    expect(res.calendar).toMatchObject({ ok: true, detail: { sent: true } });
  });
});
