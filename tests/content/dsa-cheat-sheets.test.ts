import { describe, expect, it } from "vitest";
import { dsaCheatSheets, problemBySlug } from "@/core/content";
import { cheatSheetSlugs } from "@/modules/dsa/domain/dsa-cheat-sheet";
import { STEP_ORDER } from "@/modules/dsa/domain/dsa-sheet";

describe("data/dsa-cheat-sheets.json", () => {
  it("contains unique, usable cheat sheets", () => {
    expect(dsaCheatSheets.length).toBeGreaterThan(0);
    expect(new Set(dsaCheatSheets.map((sheet) => sheet.id)).size).toBe(dsaCheatSheets.length);
    for (const sheet of dsaCheatSheets) {
      expect(sheet.patterns.length).toBeGreaterThanOrEqual(8);
      expect(sheet.decisionTree.length).toBeGreaterThanOrEqual(7);
      expect(new Set(sheet.patterns.map((pattern) => pattern.pattern)).size).toBe(sheet.patterns.length);
    }
  });

  it("covers every sheet step plus the extra topics", () => {
    const titles = dsaCheatSheets.map((sheet) => sheet.title);
    for (const step of STEP_ORDER) expect(titles).toContain(step);
    for (const id of ["recursion", "hashing", "prefix-sum", "strings", "string-algorithms", "queue", "bst", "matrix"]) {
      expect(dsaCheatSheets.some((sheet) => sheet.id === id)).toBe(true);
    }
    const arrays = dsaCheatSheets.find((sheet) => sheet.id === "arrays");
    expect(arrays?.title).toBe("Arrays & Hashing");
    expect(arrays?.patterns.map((pattern) => pattern.pattern)).toContain("Two Pointers");
    expect(arrays?.patterns.map((pattern) => pattern.pattern)).toContain("Variable Sliding Window");
    expect(arrays?.decisionTree.some((item) => item.signal.includes("exactly K"))).toBe(true);
  });

  it("gives every topic a five-step interview workflow", () => {
    for (const sheet of dsaCheatSheets) {
      expect(sheet.workflow?.map((step) => step.step)).toEqual([1, 2, 3, 4, 5]);
    }
  });

  it("links only to problems PrepOS can open", () => {
    expect(cheatSheetSlugs(dsaCheatSheets).filter((slug) => !problemBySlug.has(slug))).toEqual([]);
  });
});
