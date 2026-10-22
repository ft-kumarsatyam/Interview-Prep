import { describe, expect, it } from "vitest";
import { courseLessonByKey } from "@/core/courses";
import { flatPackTasks, genaiPrepPlan, genaiPrepResourceById, genaiPrepMapping } from "@/core/genai-prep-pack";
import { packPlanSchema, packResourcesFileSchema } from "@/modules/genai-prep/domain/schemas";

describe("data/genai-prep-pack", () => {
  it("parses plan and resources", () => {
    expect(packPlanSchema.safeParse(genaiPrepPlan).success).toBe(true);
    expect(packResourcesFileSchema.safeParse({ as_of: genaiPrepPlan.as_of, note: "", resources: [...genaiPrepResourceById.values()] }).success).toBe(true);
  });

  it("has unique stable task ids", () => {
    const tasks = flatPackTasks();
    const ids = tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(tasks.length).toBe(103);
  });

  it("resolves inline resource ids from the catalog when present", () => {
    for (const task of flatPackTasks()) {
      for (const r of task.resources) {
        if (r.id && genaiPrepResourceById.has(r.id)) {
          expect(genaiPrepResourceById.get(r.id)!.url).toBe(r.url);
        } else {
          expect(r.url.startsWith("https://")).toBe(true);
        }
      }
    }
  });

  it("maps learn tasks to real course lessons when set", () => {
    for (const m of genaiPrepMapping.tasks) {
      if (m.courseLesson) expect(courseLessonByKey.has(m.courseLesson), m.courseLesson).toBe(true);
    }
  });
});
