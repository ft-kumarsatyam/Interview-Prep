import { describe, expect, it } from "vitest";
import { selectNextAction, type StudyActionCandidate } from "@/modules/progress/domain/next-action";

const item = (overrides: Partial<StudyActionCandidate>): StudyActionCandidate => ({
  kind: "backlog",
  title: "Optional item",
  href: "/backlog",
  reason: "Extra practice",
  required: false,
  rank: 50,
  ...overrides,
});

describe("selectNextAction", () => {
  it("prefers the first unfinished required action", () => {
    const action = selectNextAction({
      kind: "study",
      candidates: [
        item({ kind: "theory", title: "Closures", href: "/learn/js", required: true, rank: 20 }),
        item({ kind: "dsa", title: "Two Sum", href: "/dsa/two-sum", required: true, rank: 10 }),
      ],
    });
    expect(action).toMatchObject({ kind: "dsa", label: "Solve next problem", title: "Two Sum" });
  });

  it("does not surface a locked quiz or optional work before required work", () => {
    const action = selectNextAction({
      kind: "study",
      candidates: [
        item({ kind: "quiz", locked: true, required: true, rank: 1 }),
        item({ kind: "backlog", required: false, rank: 2 }),
      ],
    });
    expect(action?.kind).toBe("backlog");
  });

  it("returns no action on rest days or after completion", () => {
    expect(selectNextAction({ kind: "rest", candidates: [item({})] })).toBeNull();
    expect(selectNextAction({ kind: "study", candidates: [item({ done: true })] })).toBeNull();
  });
});
