import { describe, expect, it } from "vitest";
import { problemBySlug, subtopicById, topicById } from "@/core/content";
import { courseById, courses } from "@/core/courses";
import { courseMetaSchema, courseProblems, courseLessonSchema, courseProgress, courseNeighbours, flatLessons, masteryPhaseProgress, masteryProblemById, nextCourseLesson } from "@/modules/course/domain/course";

describe("data/courses", () => {
  it("has valid course metadata", () => {
    for (const c of courses) expect(courseMetaSchema.safeParse({ id: c.id, title: c.title, blurb: c.blurb, intro: c.intro, audience: c.audience }).success, c.id).toBe(true);
    expect(courseById.size).toBe(courses.length);
    for (const id of ["dsa", "system-design", "frontend", "genai"]) expect(flatLessons(courseById.get(id)!).length, id).toBeGreaterThanOrEqual(15);
  });

  it("every lesson matches the schema", () => {
    for (const c of courses)
      for (const l of flatLessons(c)) {
        const parsed = courseLessonSchema.safeParse(l);
        expect(parsed.success, `${c.id}/${l.id} ${parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3))}`).toBe(true);
      }
  });

  it("is internally consistent and links only real problems and practice refs", () => {
    const refs = (r: string) => topicById.has(r) || subtopicById.has(r);
    expect(courseProblems(courses, new Set(problemBySlug.keys()), refs)).toEqual([]);
  });

  it("check answers are not always the first option", () => {
    const answers = courses.flatMap((c) => flatLessons(c).flatMap((l) => l.check.map((q) => q.answer)));
    expect(new Set(answers).size).toBeGreaterThan(1);
    expect(answers.filter((a) => a === 0).length / answers.length).toBeLessThan(0.5);
  });

  it("includes the pattern mastery roadmaps with ordered phases", () => {
    const masteryLessons = flatLessons(courseById.get("dsa")!).filter((lesson) => lesson.mastery);
    expect(masteryLessons.length).toBeGreaterThanOrEqual(12);
    const arrays = masteryLessons.find((lesson) => lesson.id === "arrays")?.mastery;
    expect(arrays?.problems).toHaveLength(45);
    expect(arrays?.phases.map((phase) => phase.title)).toEqual([
      "Foundation mechanics",
      "Core interview patterns",
      "Pattern mixing",
    ]);
    expect(arrays ? masteryProblemById(arrays, "c5")?.slug : undefined).toBe("minimum-window-substring");
    expect(arrays ? masteryPhaseProgress(arrays, new Set(["a1", "b6", "b14"])).map((p) => p.done) : []).toEqual([1, 2, 0]);
  });
});

describe("course progress helpers", () => {
  const dsa = courseById.get("dsa")!;
  const all = flatLessons(dsa);
  it("counts progress and finds the next lesson", () => {
    expect(courseProgress(dsa, new Set()).pct).toBe(0);
    expect(nextCourseLesson(dsa, new Set())?.id).toBe(all[0].id);
    expect(nextCourseLesson(dsa, new Set([all[0].id]))?.id).toBe(all[1].id);
    expect(courseProgress(dsa, new Set(all.map((l) => l.id))).pct).toBe(100);
    expect(nextCourseLesson(dsa, new Set(all.map((l) => l.id)))).toBeNull();
  });
  it("finds neighbours", () => {
    expect(courseNeighbours(dsa, all[0].id).prev).toBeNull();
    expect(courseNeighbours(dsa, all[0].id).next?.id).toBe(all[1].id);
  });
});
