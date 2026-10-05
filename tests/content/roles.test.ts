import { describe, expect, it } from "vitest";
import { topics } from "@/core/content";
import { rolePathView, rolePlacement, roleProblems, roleWeekMap } from "@/modules/planner/domain/role-path";
import { roles, weekMapForRole } from "@/modules/planner/lib/roles";

const topicIds = topics.map((t) => t.id);

describe("data/roles.json", () => {
  it("has unique role ids", () => {
    expect(new Set(roles.map((r) => r.id)).size).toBe(roles.length);
  });

  it.each(roles.map((r) => [r.id, r] as const))("%s places every topic once, LLD before HLD, language with DSA", (_id, role) => {
    expect(roleProblems(role, topicIds)).toEqual([]);
  });

  it.each(roles.map((r) => [r.id, r] as const))("%s keeps every week in the 24-week plan", (_id, role) => {
    const weeks = [...roleWeekMap(role).values()];
    expect(Math.min(...weeks)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...weeks)).toBeLessThanOrEqual(24);
  });
});

describe("role path helpers", () => {
  const role = roles[0]!;

  it("flags an LLD topic scheduled after HLD", () => {
    const bad = structuredClone(role);
    const lld = bad.phases.flatMap((p) => p.lanes).find((l) => l.kind === "lld")!;
    lld.weeks = [20, 22];
    expect(roleProblems(bad, topicIds).some((p) => p.includes("lld must come before hld"))).toBe(true);
  });

  it("spreads a lane's topics evenly over its weeks", () => {
    const weeks = roleWeekMap({ ...role, phases: [{ title: "t", outcome: "outcome", lanes: [{ label: "lane", kind: "hld", weeks: [1, 2], topics: ["a", "b", "c", "d"] }] }] });
    expect([...weeks.values()]).toEqual([1, 1, 2, 2]);
  });

  it("orders phases by start week", () => {
    const view = rolePathView(role);
    expect(view.map((p) => p.fromWeek)).toEqual(view.map((p) => p.fromWeek).toSorted((a, b) => a - b));
  });

  it("leaves weeks alone with no role", () => {
    expect(weekMapForRole("")).toBeNull();
    expect(weekMapForRole("nope")).toBeNull();
    expect(rolePlacement(null, "js-basics", 1, 5)).toEqual({ week: 1, position: 5 });
    expect(rolePlacement(new Map([["js-basics", 3]]), "js-basics", 1, 5)).toEqual({ week: 3, position: 300_005 });
  });
});
