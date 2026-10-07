import { describe, expect, it } from "vitest";
import { dsaCheatSheets } from "@/core/content";

describe("data/dsa-cheat-sheets.json", () => {
  it("contains unique, usable cheat sheets", () => {
    expect(dsaCheatSheets.length).toBeGreaterThan(0);
    expect(new Set(dsaCheatSheets.map((sheet) => sheet.id)).size).toBe(dsaCheatSheets.length);
    for (const sheet of dsaCheatSheets) {
      expect(sheet.patterns.length).toBeGreaterThan(5);
      expect(sheet.decisionTree.length).toBeGreaterThan(5);
      expect(new Set(sheet.patterns.map((pattern) => pattern.pattern)).size).toBe(sheet.patterns.length);
    }
  });

  it("includes the Array & Hashing recognition guide", () => {
    const arrays = dsaCheatSheets.find((sheet) => sheet.id === "arrays");
    expect(arrays?.title).toBe("Arrays & Hashing");
    expect(arrays?.patterns.map((pattern) => pattern.pattern)).toContain("Two Pointers");
    expect(arrays?.patterns.map((pattern) => pattern.pattern)).toContain("Variable Sliding Window");
    expect(arrays?.decisionTree.some((item) => item.signal.includes("exactly K"))).toBe(true);
  });
});
