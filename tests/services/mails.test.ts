import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Notification, Settings } from "@/core/models/system";
import type { NotifyChannel } from "@/core/notify";
import { runEvening, runMorning, runReminder } from "@/core/services/cron";
import { buildWeeklyMail } from "@/modules/notifications/services/mail-content";
import { ensureToday } from "@/modules/planner/services/plan";
import { getSettings, invalidateSettings, setMailPref, setRoastLevel } from "@/modules/settings/services/settings";
import { sendTestMail } from "@/modules/notifications/services/test-mail";
import { at, resetDb, startDb, stopDb } from "./db";

process.env.CRON_SECRET = "cron-secret-cron-secret";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await Settings.create({ _id: "settings" });
  invalidateSettings();
});

function channel(): NotifyChannel & { sent: string[]; bodies: string[]; htmls: (string | undefined)[] } {
  const sent: string[] = [];
  const bodies: string[] = [];
  const htmls: (string | undefined)[] = [];
  return { name: "telegram", sent, bodies, htmls, send: async (title, body, html) => void (sent.push(title), bodies.push(body), htmls.push(html)) };
}

const noNews = { fetcher: async () => [], extractor: async () => ({ markdown: "x", leadImage: "https://og.x/i.png" }) };

describe("morning mail", () => {
  it("lists what is owed beyond today's plan, in the subject and the body", async () => {
    const ch = channel();
    await runMorning(at("2026-10-20"), { channels: [ch], ...noNews });
    expect(ch.sent[0]).toMatch(/in backlog/);
    expect(ch.bodies[0]).toMatch(/Backlog: DSA behind plan \(\d+\)/);
    expect(ch.htmls[0]).toContain("Backlog");
  });

  it("follows the roast level: off is plain, coach is plain English, savage is the desi one", async () => {
    const subject = async (level: "off" | "coach" | "savage") => {
      await resetDb();
      await Settings.create({ _id: "settings" });
      invalidateSettings();
      await setRoastLevel(level);
      const ch = channel();
      await runMorning(at("2026-10-20"), { channels: [ch], ...noNews });
      return ch.sent[0]!;
    };
    expect(await subject("off")).toMatch(/^Today's targets/);
    const coach = await subject("coach");
    expect(coach).toContain(" | Today's targets");
    expect(coach).not.toMatch(/bsdk|bosdike|lawde|chutiye|nalle/i);
    expect(await subject("savage")).toContain(" | Today's targets");
  });

  it("an email switched off still reaches the bell but nothing is pushed", async () => {
    await setMailPref("morning", false);
    const ch = channel();
    const res = await runMorning(at("2026-10-20"), { channels: [ch], ...noNews });
    expect(res.plan).toMatchObject({ ok: true, detail: { notified: true } });
    // The briefing has its own switch, so only the plan must stay out of the channel.
    expect(ch.sent.filter((t) => t.includes("Today's targets"))).toHaveLength(0);
    expect(await Notification.countDocuments({ kind: "plan" })).toBe(1);
  });
});

describe("evening nudge", () => {
  it("says what is left, once, and respects its switch", async () => {
    const ch = channel();
    const res = await runReminder(at("2026-10-20"), [ch]);
    expect(res).toMatchObject({ reminded: true });
    expect(ch.sent[0]).toMatch(/Evening check-in · \d+ left/);
    expect(ch.bodies[0]).toContain("Still open today");
    expect((await runReminder(at("2026-10-20"), [ch])).reminded).toBe(false);

    await resetDb();
    await Settings.create({ _id: "settings" });
    invalidateSettings();
    await setMailPref("nudge", false);
    const quiet = channel();
    await runReminder(at("2026-10-20"), [quiet]);
    expect(quiet.sent).toHaveLength(0);
    expect(await Notification.countDocuments({ kind: "reminder" })).toBe(1);
  });
});

describe("weekly report", () => {
  it("is sent with the Sunday night recap, once, and not on other days", async () => {
    const ch = channel();
    const midweek = await runEvening(at("2026-10-14"), [ch]);
    expect(midweek.weekly).toMatchObject({ ok: true, detail: { sent: false } });

    const sunday = await runEvening(at("2026-10-18"), [ch]);
    expect(sunday.weekly).toMatchObject({ ok: true, detail: { sent: true, date: "2026-10-18" } });
    const report = ch.sent.find((t) => t.includes("Week in review"));
    expect(report).toContain("2026-10-12 to 2026-10-18");
    expect(ch.bodies.find((b) => b.includes("Progress by track"))).toBeTruthy();

    await runEvening(at("2026-10-18"), [ch]);
    expect(ch.sent.filter((t) => t.includes("Week in review"))).toHaveLength(1);
  });

  it("stays out of the channels when switched off", async () => {
    await setMailPref("weekly", false);
    const ch = channel();
    await runEvening(at("2026-10-18"), [ch]);
    expect(ch.sent.some((t) => t.includes("Week in review"))).toBe(false);
    expect(await Notification.countDocuments({ dedupeKey: "weekly:2026-10-18" })).toBe(1);
  });

  it("builds a report for the latest Sunday when forced (the test button)", async () => {
    const state = await ensureToday(at("2026-10-21"));
    expect(await buildWeeklyMail(at("2026-10-21"), state)).toBeNull();
    const forced = await buildWeeklyMail(at("2026-10-21"), state, { force: true });
    expect(forced?.date).toBe("2026-10-18");
    expect(forced?.push.title).toContain("Week in review");
  });
});

describe("test mail and settings", () => {
  it("falls back to no channels cleanly", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.NOTIFY_EMAIL;
    delete process.env.WHAPI_TOKEN;
    delete process.env.VAPID_PUBLIC_KEY;
    expect(await sendTestMail("weekly", at("2026-10-21"))).toBeNull();
  });

  it("stores the roast level, keeping the old flag in step, and defaults older settings to savage", async () => {
    expect((await getSettings()).roastLevel).toBe("savage");
    await setRoastLevel("coach");
    expect(await getSettings()).toMatchObject({ roastLevel: "coach", roastMode: true });
    await setRoastLevel("off");
    expect(await getSettings()).toMatchObject({ roastLevel: "off", roastMode: false });
    await resetDb();
    await Settings.create({ _id: "settings", roastMode: false });
    invalidateSettings();
    expect((await getSettings()).roastLevel).toBe("off");
  });

  it("every email is on by default", async () => {
    expect((await getSettings()).mail).toEqual({ morning: true, briefing: true, alerts: true, jobs: true, nudge: true, night: true, weekly: true });
  });
});
