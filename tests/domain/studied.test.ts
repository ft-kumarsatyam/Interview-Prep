import { describe, expect, it } from "vitest";
import { lessonBySubtopic, studiedRefs } from "@/modules/progress/domain/studied";

const TOPICS: Record<string, string[]> = { "t-a": ["t-a:0", "t-a:1", "t-a:2"], "t-b": ["t-b:0"] };
const topicOf = (id: string) => Object.entries(TOPICS).find(([, subs]) => subs.includes(id))?.[0];
const subtopicsOf = (id: string) => TOPICS[id] ?? [];
const base = { topicOf, subtopicsOf, doneSubtopics: [] as string[], doneLessons: [] as string[], lessonRef: () => undefined as string | undefined };

describe("studiedRefs", () => {
  it("counts ticked subtopics and the topics they belong to", () => {
    const s = studiedRefs({ ...base, doneSubtopics: ["t-a:1"] });
    expect([...s.subtopics]).toEqual(["t-a:1"]);
    expect([...s.topics]).toEqual(["t-a"]);
    expect(s.viaLessonsOnly.size).toBe(0);
  });

  it("counts a finished lesson through its practiceRef, and flags what was studied only that way", () => {
    const s = studiedRefs({ ...base, doneSubtopics: ["t-a:0"], doneLessons: ["dsa/x", "dsa/y"], lessonRef: (k) => ({ "dsa/x": "t-a:0", "dsa/y": "t-b:0" })[k] });
    expect([...s.subtopics].toSorted()).toEqual(["t-a:0", "t-b:0"]);
    expect([...s.topics].toSorted()).toEqual(["t-a", "t-b"]);
    expect([...s.viaLessonsOnly]).toEqual(["t-b:0"]); // t-a:0 was ticked already
  });

  it("a lesson that names a whole topic covers all of its subtopics", () => {
    const s = studiedRefs({ ...base, doneLessons: ["c/l"], lessonRef: () => "t-a" });
    expect([...s.subtopics].toSorted()).toEqual(["t-a:0", "t-a:1", "t-a:2"]);
    expect(s.viaLessonsOnly.size).toBe(3);
  });

  it("ignores lessons with no ref or an unknown ref, and unfinished lessons", () => {
    expect(studiedRefs({ ...base, doneLessons: ["c/none"] }).subtopics.size).toBe(0);
    expect(studiedRefs({ ...base, doneLessons: ["c/l"], lessonRef: () => "nope" }).subtopics.size).toBe(0);
  });
});

describe("lessonBySubtopic", () => {
  it("maps a subtopic to the first lesson that teaches it and skips topic refs", () => {
    const m = lessonBySubtopic(
      [{ key: "c/a", practiceRef: "t-a:0" }, { key: "c/b", practiceRef: "t-a:0" }, { key: "c/c", practiceRef: "t-a" }, { key: "c/d" }],
      (id) => topicOf(id) !== undefined,
    );
    expect([...m]).toEqual([["t-a:0", "c/a"]]);
  });
});
