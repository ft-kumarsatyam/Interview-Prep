import { describe, expect, it } from "vitest";
import { externalDsaSheets, externalResources, problemBySlug } from "@/core/content";
import { matchExternalQuestion, normalizeTitle } from "@/modules/dsa/domain/external-catalogue";

describe("external DSA catalogue", () => {
  it("keeps ordered, unique external questions", () => {
    expect(externalDsaSheets.map((sheet) => sheet.id)).toContain("striver-a2z");
    const a2z = externalDsaSheets.find((sheet) => sheet.id === "striver-a2z");
    expect(a2z?.moduleCount).toBe(20);
    expect(a2z?.topicCount).toBe(495);
    expect(a2z?.sections).toContain("Hashing");
    expect(a2z?.sections).toContain("Maths");
    const gfg = externalDsaSheets.find((sheet) => sheet.id === "gfg-160");
    expect(gfg?.practiceProblemCount).toBe(161);
    expect(gfg?.source).toBe("GeeksforGeeks");
    for (const sheet of externalDsaSheets) {
      const ids = sheet.questions.map((question) => question.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(sheet.questions.map((question) => question.order)).toEqual([...sheet.questions].map((question) => question.order).toSorted((a, b) => a - b));
      for (const question of sheet.questions) {
        if (question.localSlug) expect(problemBySlug.has(question.localSlug)).toBe(true);
        for (const link of question.links) expect(link.url).toMatch(/^https:\/\//);
        if (question.sourceCoverage !== "hub-only") expect(question.links.some((link) => link.scope === "item")).toBe(true);
        expect(question.sourceCoverage).toBeTruthy();
      }
    }
  });

  it("matches by local slug, LeetCode id, then normalized title", () => {
    const first = externalDsaSheets[0]!.questions[0]!;
    expect(matchExternalQuestion(first, [...problemBySlug.values()])).toBe(first.localSlug);
    expect(normalizeTitle("Two Sum")).toBe("two sum");
  });
});

describe("external resources", () => {
  it("contains core interview subjects with safe links", () => {
    for (const subject of ["System Design", "Operating Systems", "DBMS", "OOP", "Networking"]) {
      expect(externalResources.some((resource) => resource.subject === subject)).toBe(true);
    }
    expect(externalResources.every((resource) => resource.url.startsWith("https://"))).toBe(true);
  });
});
