import { describe, expect, it } from "vitest";
import { studyProblems, studyStats, subtopicDetail, subtopicKey, type StudyEntry, type StudyFile } from "@/modules/genai-study/domain/study";

const entry = (over: Partial<StudyEntry> = {}): StudyEntry => ({
  explain: "x".repeat(220),
  keyPoints: ["first point", "second point"],
  questions: [
    { q: "What is the first thing?", a: "The first thing is this one.", kind: "recall" },
    { q: "What is the second thing?", a: "The second thing is that one.", kind: "apply" },
  ],
  links: [],
  ...over,
});
const roadmap = { id: "r", sections: [{ nodes: [{ id: "n", checklist: ["Alpha topic: does a thing.", "Beta topic: does another."] }] }] };

describe("subtopicKey", () => {
  it("slugs the title before the first colon", () => {
    expect(subtopicKey("Roles & instruction priority: Use roles correctly.")).toBe("roles-instruction-priority");
  });
  it("drops a leading group tag", () => {
    expect(subtopicKey("[Component-level evaluation] Retrieval metrics: Measure it.")).toBe("retrieval-metrics");
  });
  it("uses the whole text when there is no description", () => {
    expect(subtopicKey("Plain item")).toBe("plain-item");
  });
  it("is stable when the checklist is reordered", () => {
    const a = ["One: a", "Two: b"].map(subtopicKey);
    const b = ["Two: b", "One: a"].map(subtopicKey);
    expect(new Set(a)).toEqual(new Set(b));
  });
});

describe("subtopicDetail", () => {
  it("returns the description after the title", () => {
    expect(subtopicDetail("[G] Title here: The description: with a colon.")).toBe("The description: with a colon.");
    expect(subtopicDetail("No description")).toBe("");
  });
});

describe("studyProblems", () => {
  const file = (nodes: StudyFile["nodes"]): StudyFile => ({ roadmapId: "r", nodes });
  it("accepts a fully covered node", () => {
    expect(studyProblems([roadmap], [file({ n: { "alpha-topic": entry(), "beta-topic": entry() } })])).toEqual([]);
  });
  it("reports a checklist item with no note", () => {
    expect(studyProblems([roadmap], [file({ n: { "alpha-topic": entry() } })])).toContain("r/n: checklist item beta-topic has no note");
  });
  it("reports a note that matches nothing", () => {
    expect(studyProblems([roadmap], [file({ n: { "alpha-topic": entry(), "beta-topic": entry(), ghost: entry() } })])).toContain("r/n: note ghost matches no checklist item");
  });
  it("reports unknown roadmaps and nodes", () => {
    expect(studyProblems([roadmap], [{ roadmapId: "zzz", nodes: {} }])).toContain("unknown roadmap zzz");
    expect(studyProblems([roadmap], [file({ nope: { x: entry() } })])).toContain("r/nope: unknown node");
  });
  it("rejects raw HTML and repeated questions", () => {
    const bad = entry({ explain: `<script>alert(1)</script>${"x".repeat(220)}` });
    expect(studyProblems([roadmap], [file({ n: { "alpha-topic": bad, "beta-topic": entry() } })]).some((m) => m.includes("raw HTML"))).toBe(true);
    const dup = entry({ questions: [entry().questions[0]!, entry().questions[0]!] });
    expect(studyProblems([roadmap], [file({ n: { "alpha-topic": dup, "beta-topic": entry() } })]).some((m) => m.includes("repeated question"))).toBe(true);
  });
  it("checks lab ids when given", () => {
    const f = file({ n: { "alpha-topic": entry({ lab: "missing-lab" }), "beta-topic": entry() } });
    expect(studyProblems([roadmap], [f], new Set(["other"]))).toContain("r/n/alpha-topic: unknown lab missing-lab");
  });
});

describe("studyStats", () => {
  it("counts known, review and new", () => {
    const s = studyStats(["a", "b", "c", "d"], new Map([["a", "known"], ["b", "review"]] as const));
    expect(s).toEqual({ total: 4, known: 1, review: 1, fresh: 2, pct: 25 });
  });
  it("handles an empty list", () => {
    expect(studyStats([], new Map()).pct).toBe(0);
  });
});
