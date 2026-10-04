import { describe, expect, it } from "vitest";
import { nextNode, nodeStatus, roadmapProgress, type NodeSignals, type Roadmap } from "@/modules/roadmap/domain/roadmap";

const none: NodeSignals = { readLinks: [], doneLessons: new Set(), solvedProblems: new Set(), passedQuizzes: new Set(), manual: false };
const node = { links: [{ title: "a", url: "https://a.dev/x", kind: "article" as const }], lesson: "dsa/arrays", problems: ["two-sum", "3sum"], quiz: "dsa-complexity:3" };

describe("nodeStatus", () => {
  it("is not done until every declared part is done", () => {
    expect(nodeStatus(node, none).done).toBe(false);
    const s1 = nodeStatus(node, { ...none, readLinks: ["https://a.dev/x"], doneLessons: new Set(["dsa/arrays"]) });
    expect(s1.reading).toBe(true);
    expect(s1.done).toBe(false);
    expect(s1.parts).toEqual({ done: 1, total: 3 });
    const all = nodeStatus(node, { ...none, readLinks: ["https://a.dev/x"], doneLessons: new Set(["dsa/arrays"]), solvedProblems: new Set(["two-sum", "3sum"]), passedQuizzes: new Set(["dsa-complexity:3"]) });
    expect(all.done).toBe(true);
  });

  it("needs all problems and the lesson, not just some", () => {
    expect(nodeStatus(node, { ...none, solvedProblems: new Set(["two-sum"]) }).practice).toBe(false);
    expect(nodeStatus(node, { ...none, readLinks: ["https://a.dev/x"] }).reading).toBe(false);
  });

  it("ignores parts the node does not declare", () => {
    const onlyQuiz = { links: [], problems: [], quiz: "q:0" };
    const s = nodeStatus(onlyQuiz, { ...none, passedQuizzes: new Set(["q:0"]) });
    expect(s.reading).toBeNull();
    expect(s.practice).toBeNull();
    expect(s.done).toBe(true);
  });

  it("treats the checklist as its own part, done only when every topic is ticked", () => {
    const n = { links: [], problems: ["p"], checklist: ["one", "two", "three"] };
    const solved = { ...none, solvedProblems: new Set(["p"]) };
    const partial = nodeStatus(n, { ...solved, checked: [0, 2] });
    expect(partial.checklist).toBe(false);
    expect(partial.topics).toEqual({ done: 2, total: 3 });
    expect(partial.parts).toEqual({ done: 1, total: 2 });
    expect(partial.done).toBe(false);
    expect(nodeStatus(n, { ...solved, checked: [0, 1, 2] }).done).toBe(true);
    // stale or duplicate indexes never count
    expect(nodeStatus(n, { ...solved, checked: [0, 0, 1, 7, -1] }).topics.done).toBe(2);
    expect(nodeStatus({ links: [], problems: [] }, none).checklist).toBeNull();
    expect(nodeStatus(n, { ...none, manual: true }).done).toBe(true);
  });

  it("a manual tick always counts, and an empty node is never auto-done", () => {
    expect(nodeStatus(node, { ...none, manual: true }).done).toBe(true);
    expect(nodeStatus({ links: [], problems: [] }, none).done).toBe(false);
  });
});

describe("roadmapProgress and nextNode", () => {
  const r = {
    id: "t", title: "t", blurb: "x", audience: "x",
    sections: [
      { id: "s1", title: "s1", nodes: [{ id: "a", title: "a", summary: "aaaaaaaaaa", priority: "must", links: [], problems: ["p"] }, { id: "b", title: "b", summary: "bbbbbbbbbb", priority: "skip", links: [], problems: ["p"] }] },
      { id: "s2", title: "s2", nodes: [{ id: "c", title: "c", summary: "cccccccccc", priority: "can", links: [], problems: ["p"] }, { id: "d", title: "d", summary: "dddddddddd", priority: "must", links: [], problems: ["p"] }] },
    ],
  } as unknown as Roadmap;
  const done = nodeStatus({ links: [], problems: ["p"] }, { ...none, solvedProblems: new Set(["p"]) });
  const open = nodeStatus({ links: [], problems: ["p"] }, none);

  it("scores must-do nodes and suggests must before can, never skip", () => {
    const st = new Map([["a", done], ["b", open], ["c", open], ["d", open]]);
    const p = roadmapProgress(r, st);
    expect(p.must).toEqual({ done: 1, total: 2 });
    expect(p.pct).toBe(50);
    expect(nextNode(r, st)?.id).toBe("d");
    const st2 = new Map([["a", done], ["b", open], ["c", open], ["d", done]]);
    expect(nextNode(r, st2)?.id).toBe("c");
    const st3 = new Map([["a", done], ["b", open], ["c", done], ["d", done]]);
    expect(nextNode(r, st3)).toBeNull();
  });
});
