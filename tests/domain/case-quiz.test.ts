import { describe, expect, it } from "vitest";
import { CASE_ANCHORS, casePath, caseRef, parseCaseRef, pickCaseQuestions } from "@/lib/domain/case-quiz";
import { buildCaseQuestions, type AuthoredCaseQuestion } from "@/lib/domain/case-quiz-build";
import { seededRng } from "@/lib/domain/sampling";
import { askSubjectForRef } from "@/lib/quiz/subject";

describe("case refs", () => {
  it("round-trips and rejects anything else", () => {
    expect(parseCaseRef(caseRef("hld", "url-shortener"))).toEqual({ kind: "hld", slug: "url-shortener" });
    expect(parseCaseRef("case:os:thread-pool-design")).toEqual({ kind: "os", slug: "thread-pool-design" });
    for (const bad of ["hld:url-shortener", "case:lld:x", "case:hld:", "case:hld:A_b", "case:hld:a:b", "dsa-arrays:1"]) expect(parseCaseRef(bad)).toBeNull();
  });

  it("builds page paths, with an optional anchor", () => {
    expect(casePath("hld", "chat")).toBe("/design/chat");
    expect(casePath("dbms", "btree-vs-lsm", "tradeoffs")).toBe("/design/dbms/btree-vs-lsm#tradeoffs");
  });

  it("maps a case to its Ask-Gemini subject", () => {
    expect(askSubjectForRef("case:hld:chat")).toBe("hld");
    expect(askSubjectForRef("case:os:thread-pool-design")).toBe("os");
    expect(askSubjectForRef("case:dbms:btree-vs-lsm")).toBe("dbms");
  });
});

describe("pickCaseQuestions", () => {
  const qs = [
    ...Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, type: "single" as const })),
    { id: "m1", type: "multi" as const },
    { id: "t1", type: "truefalse" as const },
  ];

  it("returns n distinct questions, deterministically for a seed", () => {
    const a = pickCaseQuestions(qs, 8, seededRng(7));
    expect(a).toHaveLength(8);
    expect(new Set(a.map((q) => q.id)).size).toBe(8);
    expect(pickCaseQuestions(qs, 8, seededRng(7))).toEqual(a);
  });

  it("always includes a multi-select or true/false question when the case has one", () => {
    for (let seed = 0; seed < 100; seed++) {
      expect(pickCaseQuestions(qs, 8, seededRng(seed)).some((q) => q.type !== "single")).toBe(true);
    }
  });

  it("returns everything when asked for more than exist", () => {
    expect(pickCaseQuestions(qs.slice(0, 3), 8, seededRng(1))).toHaveLength(3);
  });
});

describe("buildCaseQuestions", () => {
  const base = (over: Partial<AuthoredCaseQuestion> = {}): AuthoredCaseQuestion => ({
    prompt: "Which one is right?",
    options: ["alpha", "beta", "gamma", "delta"],
    answerIndex: 1,
    explanation: "Because beta.",
    anchor: "tradeoffs",
    ...over,
  });
  const many = (q: AuthoredCaseQuestion, n = 8) => Array.from({ length: n }, (_, i) => ({ ...q, prompt: `${q.prompt} ${i}` }));

  it("assigns stable ids and keeps the right option right after shuffling", () => {
    const { questions, errors } = buildCaseQuestions("hld", "chat", many(base()));
    expect(errors).toEqual([]);
    expect(questions[0]!.id).toBe("cq-hld-chat-01");
    for (const q of questions) expect(q.options[q.answerIndex]).toBe("beta");
    expect(buildCaseQuestions("hld", "chat", many(base())).questions).toEqual(questions);
    expect(new Set(questions.map((q) => q.answerIndex)).size).toBeGreaterThan(1);
  });

  it("shuffles multi-select and keeps the answer set and the first-index rule", () => {
    const { questions, errors } = buildCaseQuestions("os", "x", many(base({ type: "multi", answerIndex: undefined, answerIndices: [0, 2] })));
    expect(errors).toEqual([]);
    for (const q of questions) {
      expect(q.type).toBe("multi");
      expect(q.answerIndices!.map((i) => q.options[i]).sort()).toEqual(["alpha", "gamma"]);
      expect(q.answerIndex).toBe(q.answerIndices![0]);
      expect(q.answerIndices).toEqual([...q.answerIndices!].sort((a, b) => a - b));
    }
  });

  it("keeps true/false in order", () => {
    const { questions } = buildCaseQuestions("dbms", "x", many(base({ type: "truefalse", options: ["True", "False"], answerIndex: 1 })));
    for (const q of questions) expect(q).toMatchObject({ options: ["True", "False"], answerIndex: 1, type: "truefalse" });
  });

  it("reports bad anchors, bad answers, 'all of the above' and too few questions", () => {
    expect(buildCaseQuestions("hld", "x", many(base({ anchor: "prompt" }))).errors.join()).toContain("anchor");
    expect(buildCaseQuestions("os", "x", many(base({ anchor: "functional" }))).errors.join()).toContain("anchor");
    expect(buildCaseQuestions("hld", "x", many(base({ answerIndex: 9 }))).errors.join()).toContain("outside");
    expect(buildCaseQuestions("hld", "x", many(base({ options: ["a", "b", "All of the above"] }))).errors.join()).toContain("above");
    expect(buildCaseQuestions("hld", "x", many(base({ type: "multi", answerIndices: [0, 1, 2, 3] }))).errors.join()).toContain("at least one wrong");
    expect(buildCaseQuestions("hld", "x", many(base(), 3)).errors.join()).toContain("at least 8");
    expect(buildCaseQuestions("hld", "x", many(base({ options: ["a", "a", "b"] }))).errors.join()).toContain("distinct");
  });

  it("only offers anchors that exist on the right kind of page", () => {
    expect(CASE_ANCHORS.hld).toContain("deep-dives");
    expect(CASE_ANCHORS.os).not.toContain("deep-dives");
  });
});
