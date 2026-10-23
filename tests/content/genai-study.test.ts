import { beforeAll, describe, expect, it } from "vitest";
import { loadAllStudyFiles, noteFor } from "@/core/genai-study";
import { loadRoadmap } from "@/core/roadmaps";
import { studyFileSchema, studyProblems, type StudyFile } from "@/modules/genai-study/domain/study";

describe("data/genai-study", () => {
  let studyFiles: StudyFile[] = [];

  beforeAll(async () => {
    studyFiles = await loadAllStudyFiles();
  });

  it("every study file matches the schema", () => {
    for (const f of studyFiles) expect(studyFileSchema.safeParse(f).success, f.roadmapId).toBe(true);
  });

  it("is consistent with the roadmaps: every note has a checklist item and every written node is fully covered", async () => {
    const roadmaps = [await loadRoadmap("genai-16-levels")].filter((r): r is NonNullable<typeof r> => !!r);
    expect(studyProblems(roadmaps, studyFiles)).toEqual([]);
  });

  it("has notes for every authored module topic (level 14 has no study file)", async () => {
    const roadmap = await loadRoadmap("genai-16-levels");
    expect(roadmap).toBeDefined();
    const covered = new Set(studyFiles.flatMap((f) => Object.keys(f.nodes)));
    const modules = roadmap!.sections.flatMap((s) => s.nodes).filter((n) => /^m\d+-\d+$/.test(n.id));
    expect(modules.length).toBe(144);
    for (const n of modules) {
      if (n.id.startsWith("m14-")) continue;
      expect(covered.has(n.id), n.id).toBe(true);
    }
  });

  it("finds the note for a checklist item by its title", async () => {
    const item = "The parts of a prompt: Structure prompts using instructions, context, input, constraints, examples, and output requirements.";
    expect((await noteFor("genai-16-levels", "m3-1", item))?.questions.length).toBeGreaterThanOrEqual(2);
    expect(await noteFor("genai-16-levels", "m3-1", "Nope: nothing")).toBeUndefined();
  });
});
