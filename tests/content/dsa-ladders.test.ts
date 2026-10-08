import { describe, expect, it } from "vitest";
import { dsaLadders, externalDsaSheets, extraProblems, problemBySlug, problems, testcaseBySlug } from "@/core/content";
import { extraCatalogueSchema, extraSlugClashes } from "@/modules/dsa/domain/extra-problems";
import extraCatalogueJson from "@/data/dsa-extra-problems.json";

describe("DSA ladders", () => {
  it("keeps the Array Ladder complete, ordered and unique", () => {
    const arrays = dsaLadders.find((sheet) => sheet.id === "ladder-arrays");
    expect(arrays?.questions).toHaveLength(60);
    const codes = arrays!.questions.map((q) => q.code);
    expect(codes).toEqual(Array.from({ length: 60 }, (_, i) => `A${String(i + 1).padStart(2, "0")}`));
    for (const sheet of dsaLadders) {
      const ids = sheet.questions.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(sheet.questions.map((q) => q.order)).toEqual(sheet.questions.map((q) => q.order).toSorted((a, b) => a - b));
    }
  });

  it("opens every ladder row in PrepOS with a judge", () => {
    for (const question of dsaLadders.flatMap((sheet) => sheet.questions)) {
      expect(question.localSlug, `${question.code} has no local problem`).toBeTruthy();
      expect(problemBySlug.has(question.localSlug!), `${question.code} -> ${question.localSlug}`).toBe(true);
      expect(testcaseBySlug.has(question.localSlug!), `${question.code} -> ${question.localSlug} has no judge`).toBe(true);
    }
  });
});

describe("Striver A2Z in PrepOS", () => {
  it("links every A2Z row to a problem that exists", () => {
    const a2z = externalDsaSheets.find((sheet) => sheet.id === "striver-a2z")!;
    const missing = a2z.questions.filter((q) => !q.localSlug || !problemBySlug.has(q.localSlug)).map((q) => q.id);
    expect(missing).toEqual([]);
  });
});

describe("extra problems", () => {
  it("parse, never clash with seeded slugs, and stay out of the planner list", () => {
    expect(() => extraCatalogueSchema.parse(extraCatalogueJson)).not.toThrow();
    const seeded = new Set(problems.map((p) => p.slug));
    expect(extraSlugClashes(extraProblems, seeded)).toEqual([]);
    expect(extraProblems.every((p) => !seeded.has(p.slug))).toBe(true);
    expect(extraProblems.every((p) => problemBySlug.get(p.slug) === p)).toBe(true);
  });

  it("every extra has a judge", () => {
    const noJudge = extraProblems.filter((p) => !testcaseBySlug.has(p.slug)).map((p) => p.slug);
    expect(noJudge).toEqual([]);
  });
});
