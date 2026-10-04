import { describe, expect, it } from "vitest";
import { interviewFiles, interviewQuestionById, interviewQuestions, webLessonById, webLessons } from "@/lib/content";
import { INTERVIEW_LEVELS, interviewFileSchema, interviewProblems } from "@/lib/domain/web-interview";

describe("data/web-interview/*.json", () => {
  it("every file matches the schema", () => {
    for (const f of interviewFiles) {
      const parsed = interviewFileSchema.safeParse(f);
      expect(parsed.success, parsed.success ? "" : `${f.track?.id}: ${JSON.stringify(parsed.error.issues.slice(0, 3))}`).toBe(true);
    }
  });

  it("is internally consistent", () => {
    expect(interviewProblems(interviewFiles, new Set(webLessonById.keys()))).toEqual([]);
    expect(interviewQuestionById.size).toBe(interviewQuestions.length);
  });

  it("prefixes every question id with its track", () => {
    for (const q of interviewQuestions) expect(q.id.startsWith(`${q.track}-`), q.id).toBe(true);
  });

  it("answers every interview question a lesson asks, linked back to that lesson", () => {
    for (const l of webLessons) {
      for (const text of l.interview) {
        const match = interviewQuestions.find((q) => q.q === text);
        expect(match, `${l.id}: "${text}" has no answer`).toBeDefined();
        expect(match!.lesson, text).toBe(l.id);
      }
    }
  });

  it("covers the front end, back end and data topics, each with a mix of levels", () => {
    expect(interviewFiles.map((f) => f.track.id)).toEqual(expect.arrayContaining(["html-css", "browser-js", "typescript", "react", "nextjs", "node", "http", "security", "perf", "quality", "sql", "mongo", "distdb", "arch"]));
    expect(interviewQuestions.length).toBeGreaterThanOrEqual(180);
    for (const f of interviewFiles) expect(new Set(f.questions.map((q) => q.level)).size, f.track.id).toBeGreaterThanOrEqual(2);
    expect(new Set(interviewQuestions.map((q) => q.level))).toEqual(new Set(INTERVIEW_LEVELS));
  });

  it("every answer leads with a bolded direct answer", () => {
    for (const q of interviewQuestions) expect(q.answer.trimStart().startsWith("**"), q.id).toBe(true);
  });
});
