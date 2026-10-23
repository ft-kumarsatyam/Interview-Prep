import { describe, expect, it } from "vitest";
import { courseLessonIndex, hasCourseLesson } from "@/core/courses";
import { genaiPlaybookPlan as plan, genaiPlaybookSourceMap as sourceMap } from "@/core/genai-playbook";
import { loadRoadmap } from "@/core/roadmaps";
import { TASK_ID } from "@/modules/genai-playbook/domain/schemas";

describe("data/genai-playbook", () => {
  it("covers Oct 26 2026 to Mar 31 2027 with one day per date and no gaps", () => {
    expect(plan.start_date).toBe("2026-10-26");
    expect(plan.end_date).toBe("2027-03-31");
    const dates = plan.days.map((d) => d.date);
    expect(new Set(dates).size).toBe(dates.length);
    for (let i = 1; i < dates.length; i++) expect(Date.parse(dates[i]) - Date.parse(dates[i - 1]), dates[i]).toBe(86_400_000);
    expect(dates[0]).toBe(plan.start_date);
    expect(dates.at(-1)).toBe(plan.end_date);
  });

  it("has the 23 playbook weeks, each a Monday start", () => {
    expect(plan.weeks).toHaveLength(23);
    for (const w of plan.weeks) expect(new Date(`${w.start}T00:00:00Z`).getUTCDay(), w.id).toBe(1);
    expect(plan.days.every((d) => plan.weeks.some((w) => w.id === d.week && d.date >= w.start && d.date <= w.end))).toBe(true);
  });

  it("has unique, well-formed task ids with a DSA task every day", () => {
    const ids = plan.days.flatMap((d) => d.tasks.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(TASK_ID);
    for (const d of plan.days) expect(d.tasks.some((t) => t.kind === "dsa"), d.date).toBe(true);
  });

  it("links every week to a real lesson and roadmap node", async () => {
    const roadmap = await loadRoadmap("genai-interview-playbook");
    expect(roadmap).toBeDefined();
    const nodes = new Map(roadmap!.sections.flatMap((s) => s.nodes).map((n) => [n.id, n]));
    for (const w of plan.weeks) {
      expect(hasCourseLesson(w.lesson), w.lesson).toBe(true);
      expect(nodes.get(w.nodeId)?.lesson, w.nodeId).toBe(w.lesson);
    }
  });

  it("only links in-app pages that exist", () => {
    for (const t of plan.days.flatMap((d) => d.tasks)) {
      const m = t.href?.match(/^\/courses\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
      if (m) expect(hasCourseLesson(`${m[1]}/${m[2]}`), t.href).toBe(true);
    }
  });

  describe("source map", () => {
    const sources = Object.values(sourceMap.sources);
    const byUrl = new Map(sources.map((s) => [s.url, s]));

    it("maps every playbook lesson once, with a real lesson and known sources", () => {
      const ids = sourceMap.lessons.map((l) => l.lesson_id);
      expect(new Set(ids).size).toBe(ids.length);
      const playbookLessons = courseLessonIndex().filter((l) => l.courseId === "genai-playbook").map((l) => `${l.courseId}/${l.id}`);
      expect(ids.toSorted()).toEqual(playbookLessons.toSorted());
      for (const l of sourceMap.lessons) {
        expect(byUrl.has(l.primary_source_url), l.lesson_id).toBe(true);
        for (const u of l.supplemental_source_urls) expect(byUrl.has(u), `${l.lesson_id} ${u}`).toBe(true);
        expect(l.interview_questions.length, l.lesson_id).toBeGreaterThanOrEqual(3);
      }
    });

    it("covers every domain of the curriculum matrix with real lessons (DSA via the plan)", () => {
      expect(sourceMap.coverage.length).toBeGreaterThanOrEqual(16);
      for (const c of sourceMap.coverage) {
        for (const key of c.lessons) expect(hasCourseLesson(key), `${c.domain}: ${key}`).toBe(true);
        if (c.domain === "DSA") expect(plan.days.every((d) => d.tasks.some((t) => t.kind === "dsa"))).toBe(true);
        else expect(c.lessons.length, c.domain).toBeGreaterThan(0);
      }
    });

    it("never marks an unverified source as reusable", () => {
      for (const s of sources) {
        if (s.url.includes("myengineeringpath.dev")) expect(s.licence_status).toBe("unknown_link_only");
        expect(["CC-BY-4.0", "MIT"].includes(s.licence_status) && !/h9-tec|AdilShamim8/.test(s.url)).toBe(false);
      }
      for (const l of sourceMap.lessons) expect(l.primary_source_url).not.toContain("myengineeringpath.dev");
    });
  });
});
