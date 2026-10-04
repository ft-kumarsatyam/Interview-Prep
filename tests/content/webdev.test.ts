import { describe, expect, it } from "vitest";
import { webLessonById, webLessons, webProjectBySlug, webProjects, webTracks } from "@/core/content";
import { WEB_AREAS, webdevFileSchema, webdevProblems } from "@/modules/learn/domain/webdev";

describe("data/webdev.json", () => {
  it("matches the schema", () => {
    const parsed = webdevFileSchema.safeParse({ tracks: webTracks, lessons: webLessons, projects: webProjects });
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues.slice(0, 3))).toBe(true);
  });

  it("is internally consistent", () => {
    expect(webdevProblems({ tracks: webTracks, lessons: webLessons, projects: webProjects })).toEqual([]);
    expect(webLessonById.size).toBe(webLessons.length);
    expect(webProjectBySlug.size).toBe(webProjects.length);
  });

  it("covers the stacks asked for", () => {
    const text = JSON.stringify([webLessons, webProjects]).toLowerCase();
    for (const term of ["next.js", "react", "node.js", "nestjs", "sql", "mongodb", "cockroachdb", "postgresql", "raft", "outbox"]) expect(text, term).toContain(term);
    expect(webTracks.map((t) => t.id)).toEqual(expect.arrayContaining(["react", "nextjs", "node", "sql", "mongo", "distdb", "arch", "fe-core", "fe-scale", "fe-sd", "llm", "rag", "genai-eng"]));
  });

  it("covers frontend at scale, frontend system design and GenAI end to end", () => {
    const text = JSON.stringify([webLessons, webProjects]).toLowerCase();
    for (const term of ["core web vitals", "micro-frontend", "design system", "crdt", "self-attention", "kv cache", "lora", "rag", "hnsw", "rerank", "prompt injection", "model context protocol", "evals"]) expect(text, term).toContain(term);
    for (const area of WEB_AREAS) expect(webTracks.some((t) => t.area === area), area).toBe(true);
  });

  it("covers every area in depth, with outside reading on each lesson", () => {
    const ids = ["html-css", "typescript", "a11y", "fe-testing", "state-data", "http-apis", "auth-security", "caching-queues", "cloud-devops", "observability", "sd-cases", "ml-foundations", "llm-evals-ops", "agents"];
    expect(webTracks.map((t) => t.id)).toEqual(expect.arrayContaining(ids));
    expect(webLessons.length).toBeGreaterThanOrEqual(200);
    for (const t of webTracks) expect(webLessons.filter((l) => l.track === t.id).length, t.id).toBeGreaterThanOrEqual(7);
    for (const area of WEB_AREAS) expect(webTracks.filter((t) => t.area === area).length, area).toBeGreaterThanOrEqual(4);
    for (const l of webLessons.filter((x) => ids.includes(x.track))) expect(l.resources.length, l.id).toBeGreaterThanOrEqual(3);
  });

  it("every new project explains its hard parts", () => {
    for (const p of webProjects.filter((x) => x.features || x.deepDives)) {
      expect(p.features?.length ?? 0, p.slug).toBeGreaterThanOrEqual(3);
      expect(p.deepDives?.length ?? 0, p.slug).toBeGreaterThanOrEqual(2);
    }
    expect(webProjects.length).toBeGreaterThanOrEqual(30);
  });

  it("every lesson has distinct check questions with an answer that is not always the first option", () => {
    for (const l of webLessons) expect(new Set(l.check.map((c) => c.q)).size, l.id).toBe(3);
    const positions = webLessons.flatMap((l) => l.check.map((c) => c.answer));
    expect(new Set(positions).size).toBeGreaterThan(1);
    expect(positions.filter((p) => p === 0).length / positions.length).toBeLessThan(0.5);
  });

  it("every project milestone ends in something checkable and every project feeds the resume", () => {
    for (const p of webProjects) {
      expect(p.milestones.length, p.slug).toBeGreaterThanOrEqual(5);
      expect(p.resume.some((r) => /\[[^\]]+\]/.test(r)), `${p.slug} resume bullets keep placeholders`).toBe(true);
    }
  });
});
