import { describe, expect, it } from "vitest";
import { bar, formatMinutes, percent, weekVerdict, weeklyReport, type WeeklyInput } from "@/modules/progress/domain/weekly";

const base: WeeklyInput = {
  from: "2026-10-05",
  to: "2026-10-11",
  workDays: 6,
  completedDays: 5,
  solved: { total: 14, main: 11, js: 2, sql: 1, easy: 5, medium: 7, hard: 2 },
  topSolved: [{ title: "Two Sum", path: "/dsa/two-sum", note: "Easy" }],
  theoryTicked: 9,
  theoryTitles: [{ title: "Encapsulation", path: "/learn/oop-pillars", note: "OOP" }],
  tracks: [
    { id: "dsa", name: "DSA Concepts", done: 12, total: 36, thisWeek: 4 },
    { id: "hld", name: "System Design", done: 0, total: 120, thisWeek: 0 },
  ],
  quizzes: { passed: 5, taken: 6, avgPct: 82 },
  studyMinutes: 540,
  streak: 5,
  best: 9,
  pace: { ideal: 20, solved: 22, delta: 2 },
  forecast: null,
  backlog: null,
  nextWeek: { week: 2, topics: [{ title: "SOLID & Clean Code", path: "/learn/solid" }] },
  appUrl: "https://prep.example.com",
};

describe("weekly helpers", () => {
  it("draws bars, percentages and durations", () => {
    expect(bar(0)).toBe("░░░░░░░░░░");
    expect(bar(100)).toBe("██████████");
    expect(bar(33)).toBe("███░░░░░░░");
    expect(bar(250)).toBe("██████████");
    expect(percent(1, 4)).toBe(25);
    expect(percent(1, 0)).toBe(0);
    expect(formatMinutes(0)).toBe("0 min");
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(120)).toBe("2 h");
    expect(formatMinutes(135)).toBe("2 h 15 min");
  });

  it("words the week by how many days were completed", () => {
    expect(weekVerdict(100, 6, 6)).toMatch(/strong week/);
    expect(weekVerdict(67, 4, 6)).toMatch(/decent week/);
    expect(weekVerdict(17, 1, 6)).toMatch(/light week/);
    expect(weekVerdict(0, 0, 6)).toMatch(/No study day was completed/);
    expect(weekVerdict(0, 0, 0)).toMatch(/No study days were planned/);
  });
});

describe("weeklyReport", () => {
  it("summarises the week, lists every track with a bar, and links next week's focus", () => {
    const r = weeklyReport(base);
    expect(r.title).toBe("Week in review · 2026-10-05 to 2026-10-11 · 5/6 days");
    expect(r.weekPct).toBe(83);
    expect(r.text).toContain("Days complete: 5/6");
    expect(r.text).toContain("Progress by track");
    expect(r.text).toContain("DSA Concepts: ███░░░░░░░ 33% (12/36), +4 this week");
    expect(r.text).toContain("System Design: ░░░░░░░░░░ 0% (0/120)");
    expect(r.text).toContain("14 problems: 11 DSA, 2 JS, 1 SQL");
    expect(r.text).toContain("Next week (week 2) focus\n- SOLID & Clean Code\n  https://prep.example.com/learn/solid");
    expect(r.text).toContain("You're 2 problems ahead of plan");
    expect(r.text).toContain("Best streak so far: 9 days.");
    expect(r.html).toContain("<h2");
    expect(r.html).toContain("Open the planner");
  });

  it("includes the backlog only when something is owed, and the 'more' row for long lists", () => {
    expect(weeklyReport(base).text).not.toContain("Backlog");
    const owed = {
      total: 11,
      totalMinutes: 330,
      budget: 2,
      queue: [{ title: "Valid Anagram", path: "/dsa/valid-anagram" }],
      groups: [
        { kind: "dsa" as const, label: "DSA behind plan", noun: "problems", total: 9, items: [{ title: "Valid Anagram", path: "/dsa/valid-anagram" }], path: "/dsa" },
        { kind: "review" as const, label: "Overdue reviews", noun: "reviews", total: 2, items: [{ title: "Two Sum", path: "/dsa/two-sum" }], path: "/review" },
      ],
    };
    const r = weeklyReport({ ...base, backlog: owed });
    expect(r.text).toContain("Backlog queue for today (1 of 2)");
    expect(r.text).toContain("Backlog: DSA behind plan (9)");
    expect(r.text).toContain("+8 more");
    expect(r.text).toContain("Backlog: Overdue reviews (2)");
  });

  it("handles an empty week without claiming progress", () => {
    const r = weeklyReport({ ...base, completedDays: 0, solved: { total: 0, main: 0, js: 0, sql: 0, easy: 0, medium: 0, hard: 0 }, topSolved: [], theoryTicked: 0, theoryTitles: [], quizzes: { passed: 0, taken: 0, avgPct: null }, streak: 0 });
    expect(r.weekPct).toBe(0);
    expect(r.text).toContain("No problems solved this week.");
    expect(r.text).not.toContain("Theory finished");
    expect(r.text).not.toContain("Quizzes\n");
  });

  it("escapes titles in the html", () => {
    const r = weeklyReport({ ...base, topSolved: [{ title: "<b>x</b>", path: "/dsa/x" }] });
    expect(r.html).not.toContain("<b>x</b>");
    expect(r.html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
