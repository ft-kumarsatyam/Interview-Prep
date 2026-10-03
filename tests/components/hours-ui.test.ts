import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HoursToday } from "@/components/dashboard/hours-today";
import { SettingsForm, type SettingsFormValues } from "@/components/settings/settings-form";

describe("HoursToday", () => {
  it("shows the planned hours, the estimate and the presets, with the current one pressed", () => {
    const html = renderToStaticMarkup(createElement(HoursToday, { hours: 3.5, estMinutes: 205, locked: false }));
    expect(html).toContain("3.5 h today");
    expect(html).toContain("3 h 25 min");
    for (const h of ["1 h", "2 h", "3.5 h", "5 h", "6 h"]) expect(html).toContain(h);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="Custom hours"');
  });

  it("locks once the day is complete", () => {
    const html = renderToStaticMarkup(createElement(HoursToday, { hours: 3.5, estMinutes: 205, locked: true }));
    expect(html).toContain("plan is locked");
    expect(html).not.toContain("Custom hours");
  });

  it("copes with a plan that has no hours yet", () => {
    const html = renderToStaticMarkup(createElement(HoursToday, { hours: null, estMinutes: null, locked: false }));
    expect(html).toContain("Hours today");
    expect(html).not.toContain("plan is about");
  });
});

describe("SettingsForm study hours", () => {
  const initial: SettingsFormValues = {
    startDate: "2026-10-05",
    endDate: "2027-03-21",
    quizPassPct: 60,
    topicMasteryPct: 70,
    minDailyDsa: 3,
    maxDailyDsa: 6,
    maxSaturdayDsa: 10,
    maxDailyTheory: 5,
    revisionWeeks: 3,
    restDays: [],
    hoursByDow: [4, 3.5, 3.5, 3.5, 3.5, 3.5, 6],
    geminiLinks: {},
    llmPaidEnabled: true,
    llmPaidDailyCap: 20,
    llmPaidRequireConfirm: true,
    googleNewsQueries: [],
    leetcodeUsername: "",
    mockDsaWeekday: 6,
    mockHldWeekday: 0,
  };

  it("shows the weekly hours read-only, Sunday first, with the weekly total and a link to the Planner", () => {
    const html = renderToStaticMarkup(createElement(SettingsForm, { initial, today: "2026-10-05", defaultQueries: [], timezone: "Asia/Kolkata" }));
    // The Planner is the one editor of hours and the interview date, so Settings has no editable hour inputs.
    for (const i of [0, 1, 2, 3, 4, 5, 6]) expect(html).not.toContain(`id="hours-${i}"`);
    expect(html.indexOf(">Sun<")).toBeLessThan(html.indexOf(">Sat<"));
    expect(html).toContain("27 h 30 min"); // 4 + 5 * 3.5 + 6
    expect(html).toContain("Edit on the Planner");
    expect(html).toContain('href="/plan"');
  });
});
