import { describe, expect, it } from "vitest";
import { studyFiles, noteFor } from "@/core/genai-study";
import { roadmaps } from "@/core/roadmaps";
import { studyFileSchema, studyProblems } from "@/modules/genai-study/domain/study";

describe("data/genai-study", () => {
  it.each(studyFiles.map((f, i) => [`${f.roadmapId}#${i}`, f] as const))("%s matches the schema", (_id, f) => {
    expect(studyFileSchema.safeParse(f).success).toBe(true);
  });

  it("is consistent with the roadmaps: every note has a checklist item and every written node is fully covered", () => {
    expect(studyProblems(roadmaps, studyFiles)).toEqual([]);
  });

  it("has notes for every module topic of all 16 levels", () => {
    const roadmap = roadmaps.find((r) => r.id === "genai-16-levels")!;
    const covered = new Set(studyFiles.flatMap((f) => Object.keys(f.nodes)));
    const modules = roadmap.sections.flatMap((s) => s.nodes).filter((n) => /^m\d+-\d+$/.test(n.id));
    expect(modules.length).toBe(144);
    for (const n of modules) expect(covered.has(n.id), n.id).toBe(true);
  });

  it("finds the note for a checklist item by its title", () => {
    const item = "The parts of a prompt: Structure prompts using instructions, context, input, constraints, examples, and output requirements.";
    expect(noteFor("genai-16-levels", "m3-1", item)?.questions.length).toBeGreaterThanOrEqual(2);
    expect(noteFor("genai-16-levels", "m3-1", "Nope: nothing")).toBeUndefined();
  });
});
