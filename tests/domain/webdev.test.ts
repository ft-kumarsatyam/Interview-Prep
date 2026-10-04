import { describe, expect, it } from "vitest";
import { webLessonById, webLessons, webProjects } from "@/core/content";
import { parseResumeText } from "@/modules/resume/domain/resume";
import { renderResumeText } from "@/modules/resume/domain/resume-tailor";
import { addProjectToResume, checkScore, hasPlaceholder, lessonsForProject, nextLesson, projectArea, projectProgress, trackProgress, webdevProblems } from "@/modules/learn/domain/webdev";

describe("progress helpers", () => {
  it("tracks per-track completion", () => {
    const done = new Set([webLessons[0]!.id]);
    const t = trackProgress(webLessons, done);
    expect(t.find((x) => x.track === webLessons[0]!.track)).toMatchObject({ done: 1 });
    expect(t.every((x) => x.pct >= 0 && x.pct <= 100)).toBe(true);
  });
  it("finds the next lesson in order, within a track or overall", () => {
    expect(nextLesson(webLessons, new Set())!.id).toBe(webLessons[0]!.id);
    expect(nextLesson(webLessons, new Set([webLessons[0]!.id]))!.id).toBe(webLessons[1]!.id);
    expect(nextLesson(webLessons, new Set(webLessons.map((l) => l.id)))).toBeNull();
    expect(nextLesson(webLessons, new Set(), "mongo")!.track).toBe("mongo");
  });
  it("files a project under the area most of its lessons come from", () => {
    const lessons = new Map([["a", { track: "react" }], ["b", { track: "llm" }], ["c", { track: "rag" }]]);
    const tracks = [{ id: "react", area: "frontend" as const }, { id: "llm", area: "ai" as const }, { id: "rag", area: "ai" as const }];
    expect(projectArea({ lessons: ["a", "b", "c"] }, lessons, tracks)).toBe("ai");
    expect(projectArea({ lessons: ["a"] }, lessons, tracks)).toBe("frontend");
    expect(projectArea({ lessons: ["zzz"] }, lessons, tracks)).toBe("architecture");
  });
  it("scores a self-check", () => {
    const check = [{ answer: 1 }, { answer: 0 }, { answer: 2 }];
    expect(checkScore(check, [1, 0, 2])).toEqual({ correct: 3, total: 3, pct: 100 });
    expect(checkScore(check, [1, null, 0])).toEqual({ correct: 1, total: 3, pct: 33 });
  });
  it("tracks project milestones", () => {
    const p = webProjects[0]!;
    expect(projectProgress(p, [])).toMatchObject({ done: 0, next: "m1" });
    expect(projectProgress(p, ["m1", "m2", "bogus"])).toMatchObject({ done: 2, next: "m3" });
    expect(projectProgress(p, p.milestones.map((m) => m.id))).toMatchObject({ pct: 100, next: null });
  });
  it("puts unfinished lessons first for a project", () => {
    const p = webProjects[0]!;
    const first = p.lessons[0]!;
    const out = lessonsForProject(p, webLessonById, new Set([first]));
    expect(out.at(-1)!.lesson.id).toBe(first);
    expect(out.every((x) => x.lesson)).toBe(true);
  });
});

describe("webdevProblems", () => {
  it("flags unknown tracks, lessons and duplicate ids", () => {
    const l = { ...webLessons[0]!, track: "nope" };
    const p = { ...webProjects[0]!, lessons: ["missing"] };
    const problems = webdevProblems({ tracks: [{ id: "x", name: "X", color: "c", blurb: "b", area: "frontend" }], lessons: [l, l], projects: [p] });
    expect(problems).toEqual(expect.arrayContaining(["lesson " + l.id + ": unknown track nope", "duplicate lesson " + l.id, "project " + p.slug + ": unknown lesson missing", "track x has no lessons"]));
  });
});

describe("adding a project to the resume", () => {
  const doc = parseResumeText("Aarav\naarav@example.com\nEXPERIENCE\nEngineer | Acme | 2021 - 2023\n• Built things with Node.js for 2M users\nSKILLS\nNode.js");
  it("appends the project with its bullet templates, once", () => {
    const p = webProjects[0]!;
    const first = addProjectToResume(doc, p);
    expect(first.added).toBe(true);
    expect(first.doc.projects.at(-1)).toMatchObject({ name: p.title });
    expect(first.doc.projects.at(-1)!.bullets.length).toBeGreaterThan(0);
    expect(addProjectToResume(first.doc, p).added).toBe(false);
    // The text form round-trips so the saved resume still parses.
    const again = parseResumeText(renderResumeText(first.doc));
    expect(again.projects.at(-1)!.bullets).toEqual(first.doc.projects.at(-1)!.bullets);
  });
  it("detects bracket placeholders that still need real numbers", () => {
    expect(hasPlaceholder("Cut latency by [X]%")).toBe(true);
    expect(hasPlaceholder("Cut latency by 38%")).toBe(false);
    expect(webProjects.every((p) => p.resume.some(hasPlaceholder))).toBe(true);
  });
});
