import { describe, expect, it } from "vitest";
import {
  assembleBacklog,
  companyItems,
  designItems,
  dsaItems,
  minutesLabel,
  mockItems,
  pickBudget,
  priorityOf,
  readingItems,
  reviewItems,
  snoozeUntil,
  theoryItems,
  topicQuizItems,
  type BacklogItem,
  type BacklogUserState,
} from "@/modules/progress/domain/backlog-items";

const today = "2026-10-20";
const none = new Map<string, BacklogUserState>();

describe("item builders", () => {
  it("reviews: overdue ones not already in today's plan, oldest first", () => {
    const items = reviewItems({
      overdue: [{ slug: "b", title: "B", nextReviewAt: "2026-10-18" }, { slug: "a", title: "A", nextReviewAt: "2026-10-10" }, { slug: "c", title: "C", nextReviewAt: "2026-10-12" }],
      inToday: new Set(["c"]),
    });
    expect(items.map((i) => i.key)).toEqual(["review:a", "review:b"]);
    expect(items[0]).toMatchObject({ kind: "review", path: "/dsa/a", since: "2026-10-10", rank: 0 });
  });

  it("dsa: the next unsolved after today's, no more than you are behind", () => {
    const unsolved = ["a", "b", "c", "d", "e"].map((s) => ({ slug: s, title: s.toUpperCase(), difficulty: "Medium" as const }));
    const items = dsaItems({ behind: 3, unsolved, todayProblems: new Set(["a"]), today });
    expect(items.map((i) => i.key)).toEqual(["dsa:b", "dsa:c", "dsa:d"]);
    expect(dsaItems({ behind: -4, unsolved, todayProblems: new Set(), today })).toEqual([]);
    expect(items[0]!.minutes).toBe(35);
  });

  it("theory: unticked subtopics of weeks that ended, dated to the end of their week", () => {
    const subtopics = [
      { id: "t:0", title: "T0", topicId: "t", topicTitle: "Topic", week: 1, position: 1, done: false },
      { id: "t:1", title: "T1", topicId: "t", topicTitle: "Topic", week: 3, position: 2, done: false },
      { id: "t:2", title: "T2", topicId: "t", topicTitle: "Topic", week: 1, position: 3, done: true },
    ];
    const items = theoryItems({ subtopics, currentWeek: 3, todayTheory: new Set(), planStart: "2026-10-05" });
    expect(items.map((i) => i.key)).toEqual(["theory:t:0"]);
    expect(items[0]!.since).toBe("2026-10-11");
    expect(theoryItems({ subtopics, currentWeek: 3, todayTheory: new Set(["t:0"]), planStart: "2026-10-05" })).toEqual([]);
  });

  it("topic quizzes: fully ticked topics that aren't mastered", () => {
    const items = topicQuizItems({
      topics: [
        { id: "a", title: "A", subtopics: 3, ticked: 3, mastered: false, week: 2 },
        { id: "b", title: "B", subtopics: 3, ticked: 3, mastered: true, week: 1 },
        { id: "c", title: "C", subtopics: 3, ticked: 2, mastered: false, week: 1 },
        { id: "d", title: "D", subtopics: 0, ticked: 0, mastered: false, week: 1 },
      ],
      today,
    });
    expect(items.map((i) => i.key)).toEqual(["quiz:a"]);
    expect(items[0]!.path).toBe("/learn/practice?ref=a");
  });

  it("design: unstarted or in-progress cases from finished weeks", () => {
    const items = designItems({
      cases: [
        { slug: "x", title: "X", week: 1, status: "new" },
        { slug: "y", title: "Y", week: 2, status: "mastered" },
        { slug: "z", title: "Z", week: 5, status: "new" },
        { slug: "w", title: "W", week: 2, status: "studying" },
      ],
      currentWeek: 4,
      planStart: "2026-10-05",
    });
    expect(items.map((i) => i.key)).toEqual(["design:x", "design:w"]);
    expect(items[1]!.note).toBe("in progress");
  });

  it("mocks, reading and company gaps", () => {
    expect(mockItems([{ kind: "hld", date: "2026-10-18" }, { kind: "dsa", date: "2026-10-10" }]).map((i) => i.key)).toEqual(["mock:dsa:2026-10-10", "mock:hld:2026-10-18"]);
    expect(readingItems([{ id: "1", title: "T", source: "S", minutes: null, savedOn: "2026-10-01" }])[0]).toMatchObject({ minutes: 8, path: "/news/1" });
    expect(companyItems([{ key: "google:dsa:two-sum", title: "Two Sum", note: "Google", path: "/dsa/two-sum", minutes: 20, boost: 10 }], today)[0]).toMatchObject({ key: "company:google:dsa:two-sum", boost: 10 });
  });
});

describe("priority and assembly", () => {
  const mk = (kind: BacklogItem["kind"], ref: string, extra: Partial<BacklogItem> = {}): BacklogItem => ({ key: `${kind}:${ref}`, kind, title: ref, path: "/", minutes: 10, rank: 0, ...extra });

  it("ranks reviews first, older above newer, and boosts add up", () => {
    expect(priorityOf(mk("review", "a"), today)).toBeGreaterThan(priorityOf(mk("theory", "a"), today));
    expect(priorityOf(mk("dsa", "a", { since: "2026-09-01" }), today)).toBeGreaterThan(priorityOf(mk("dsa", "b", { since: today }), today));
    expect(priorityOf(mk("company", "a", { boost: 10 }), today)).toBe(priorityOf(mk("company", "b"), today) + 10);
  });

  it("caps the age bonus and penalises later ranks a little", () => {
    const old = priorityOf(mk("dsa", "a", { since: "2020-01-01" }), today);
    const older = priorityOf(mk("dsa", "b", { since: "2010-01-01" }), today);
    expect(old).toBe(older);
    expect(priorityOf(mk("dsa", "a", { rank: 0 }), today)).toBeGreaterThan(priorityOf(mk("dsa", "b", { rank: 10 }), today));
  });

  it("hides dismissed and still-snoozed items, brings a snooze back on its day, and dedupes", () => {
    const items = [mk("dsa", "a"), mk("dsa", "b"), mk("dsa", "c"), mk("dsa", "a")];
    const state = new Map<string, BacklogUserState>([
      ["dsa:a", { status: "dismissed", until: null }],
      ["dsa:b", { status: "snoozed", until: "2026-10-22" }],
      ["dsa:c", { status: "snoozed", until: "2026-10-20" }],
    ]);
    const a = assembleBacklog(items, state, today);
    expect(a.open.map((i) => i.key)).toEqual(["dsa:c"]);
    expect(a.snoozed.map((i) => i.key)).toEqual(["dsa:b"]);
    expect(a.dismissedCount).toBe(1);
    expect(a.byKind.dsa).toBe(1);
    expect(a.totalMinutes).toBe(10);
  });

  it("sorts the open list by priority", () => {
    const a = assembleBacklog([mk("reading", "r"), mk("review", "v"), mk("theory", "t")], none, today);
    expect(a.open.map((i) => i.kind)).toEqual(["review", "theory", "reading"]);
  });
});

describe("pickBudget", () => {
  const mk = (kind: BacklogItem["kind"], ref: string): BacklogItem => ({ key: `${kind}:${ref}`, kind, title: ref, path: "/", minutes: 10, rank: 0 });
  const open = [mk("review", "1"), mk("review", "2"), mk("review", "3"), mk("theory", "1"), mk("dsa", "1")];

  it("is empty for a zero budget", () => {
    expect(pickBudget(open, 0, new Set())).toEqual([]);
    expect(pickBudget(open, -2, new Set())).toEqual([]);
  });

  it("mixes kinds: at most half the budget from one kind, while other kinds exist", () => {
    const picked = pickBudget(open, 4, new Set());
    expect(picked.map((i) => i.key)).toEqual(["review:1", "review:2", "theory:1", "dsa:1"]);
  });

  it("tops up from one kind when the others run dry", () => {
    const only = [mk("review", "1"), mk("review", "2"), mk("review", "3")];
    expect(pickBudget(only, 3, new Set()).map((i) => i.key)).toEqual(["review:1", "review:2", "review:3"]);
  });

  it("counts what is already queued and never re-picks it", () => {
    const picked = pickBudget(open, 3, new Set(["review:1"]));
    expect(picked).toHaveLength(2);
    expect(picked.map((i) => i.key)).not.toContain("review:1");
    expect(pickBudget(open, 1, new Set(["review:1"]))).toEqual([]);
  });
});

describe("helpers", () => {
  it("computes snooze dates and minute labels", () => {
    expect(snoozeUntil("2026-10-30", 3)).toBe("2026-11-02");
    expect(minutesLabel(45)).toBe("45 min");
    expect(minutesLabel(60)).toBe("1 h");
    expect(minutesLabel(80)).toBe("1 h 20 min");
    expect(minutesLabel(85 * 60 + 15)).toBe("85 h");
  });
});
