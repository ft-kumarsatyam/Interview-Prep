import { describe, expect, it } from "vitest";
import { calendarHeadsUp, calendarLines, designTopicMail, resumeCheck, RESUME_STALE_DAYS } from "@/modules/notifications/domain/heads-up";
import { DEFAULT_MAIL_PREFS, MAIL_KINDS, mailPrefsFrom } from "@/modules/notifications/domain/mail-prefs";
import { GROUP_INFO, NOTIFICATION_GROUPS, NOTIFICATION_KINDS } from "@/modules/notifications/domain/categories";
import { DEFAULT_SETTINGS } from "@/modules/planner/domain/plan-config";

// 2026-10-05 is a Monday.
const settings = { ...DEFAULT_SETTINGS, startDate: "2026-01-01", endDate: "2027-03-01", revisionWeeks: 2, restDays: ["2026-10-09"] };
const input = (today: string, over: Partial<typeof settings> = {}) => ({ today, settings: { ...settings, ...over }, mockSchedule: { dsaWeekday: 6, hldWeekday: 0 } });

describe("calendar heads-up", () => {
  it("says nothing before an ordinary study day", () => {
    expect(calendarLines(input("2026-10-05"))).toEqual([]);
    expect(calendarHeadsUp(input("2026-10-05"))).toBeNull();
  });

  it("announces a rest day tomorrow", () => {
    expect(calendarLines(input("2026-10-08"))[0]).toMatch(/day off/);
  });

  it("announces the Saturday DSA mock and the Sunday review with the design mock", () => {
    expect(calendarLines(input("2026-10-09", { restDays: [] })).join(" ")).toMatch(/DSA mock/);
    const sunday = calendarLines(input("2026-10-10")).join(" ");
    expect(sunday).toMatch(/Sunday/);
    expect(sunday).toMatch(/system design mock/);
  });

  it("counts down to the plan end only on the chosen days", () => {
    expect(calendarLines(input("2027-02-22")).join(" ")).toMatch(/7 days left/);
    expect(calendarLines(input("2027-02-28")).join(" ")).toMatch(/1 day left/);
    expect(calendarLines(input("2027-02-21")).join(" ")).not.toMatch(/left in your plan/);
  });

  it("builds a single-line title and a combined one", () => {
    expect(calendarHeadsUp(input("2026-10-08"))?.title).toBe("Tomorrow is a day off. Nothing is due and your streak is safe");
    expect(calendarHeadsUp(input("2026-10-09", { restDays: [], endDate: "2026-10-16" }))?.title).toMatch(/things to know/);
  });
});

describe("resume check", () => {
  it("asks for a resume when there is none", () => {
    expect(resumeCheck({ today: "2026-10-05", updatedOn: null })).toMatchObject({ reason: "missing", title: "Add your resume" });
  });
  it("flags a stale resume and leaves a fresh one alone", () => {
    expect(resumeCheck({ today: "2026-10-05", updatedOn: "2026-09-05" })).toMatchObject({ reason: "stale", title: "Your resume is 30 days old" });
    expect(resumeCheck({ today: "2026-10-05", updatedOn: "2026-09-06" })).toBeNull();
    expect(RESUME_STALE_DAYS).toBe(30);
  });
});

describe("design topic", () => {
  it("links the case and carries the reason", () => {
    const m = designTopicMail({ title: "Design a URL shortener", slug: "url-shortener", why: "in progress" });
    expect(m.title).toBe("System design today: Design a URL shortener");
    expect(m.spec.cta?.path).toBe("/design/url-shortener");
    expect(m.body).toMatch(/^In progress\./);
  });
});

describe("preferences and categories", () => {
  it("defaults every message on and reads missing flags as on", () => {
    expect(Object.keys(DEFAULT_MAIL_PREFS).sort()).toEqual([...MAIL_KINDS].sort());
    expect(mailPrefsFrom({})).toEqual(DEFAULT_MAIL_PREFS);
    expect(mailPrefsFrom({ mailResume: false })).toMatchObject({ resume: false, design: true });
  });
  it("puts every kind except sync in a group exactly once", () => {
    const grouped = NOTIFICATION_GROUPS.flatMap((g) => GROUP_INFO[g].kinds);
    expect([...grouped].sort()).toEqual(NOTIFICATION_KINDS.filter((k) => k !== "sync").sort());
  });
});
