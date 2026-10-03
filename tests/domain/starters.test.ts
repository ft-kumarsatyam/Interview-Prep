import { describe, expect, it } from "vitest";
import { testcaseBySlug } from "@/lib/content";
import { jsStarter, parseSignature, pyStarter, pyType, starterFor, tsStarter, tsType } from "@/lib/domain/starters";
import { caseToDraft, casesFromInputs, parseDrafts, stepFontSize } from "@/lib/domain/ide";

describe("starters", () => {
  it("reads parameter and return types from the JSDoc starter", () => {
    const sig = parseSignature(testcaseBySlug.get("two-sum")!);
    expect(sig).toEqual({ functionName: "twoSum", params: [{ name: "nums", type: "number[]" }, { name: "target", type: "number" }], returnType: "number[]" });
  });

  it("maps JSDoc types to TypeScript", () => {
    expect(tsType("number[][]")).toBe("number[][]");
    expect(tsType("character[]")).toBe("string[]");
    expect(tsType("ListNode")).toBe("ListNode | null");
    expect(tsType("TreeNode | null")).toBe("TreeNode | null");
  });

  it("maps JSDoc types to Python hints", () => {
    expect(pyType("number[]")).toBe("List[int]");
    expect(pyType("string[][]")).toBe("List[List[str]]");
    expect(pyType("boolean")).toBe("bool");
    expect(pyType("void")).toBe("None");
    expect(pyType("ListNode")).toBe("Optional[ListNode]");
    expect(pyType("TreeNode | null")).toBe("Optional[TreeNode]");
  });

  it("builds a LeetCode-style Python Solution class and a typed TS function", () => {
    const sig = parseSignature(testcaseBySlug.get("two-sum")!);
    expect(pyStarter(sig)).toContain("class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:");
    expect(tsStarter(sig)).toContain("function twoSum(nums: number[], target: number): number[] {");
  });

  it("notes the predefined node classes only when a problem uses them", () => {
    const reverse = [...testcaseBySlug.entries()].find(([, e]) => e.argTypes?.[0] === "ListNode")![1];
    expect(starterFor("python", reverse)).toMatch(/^# ListNode/);
    expect(starterFor("python", testcaseBySlug.get("two-sum")!)).not.toContain("ListNode");
  });

  it("derives a stub for every runnable problem in every language", () => {
    for (const entry of testcaseBySlug.values()) {
      expect(starterFor("javascript", entry)).toBe(entry.starter);
      expect(starterFor("typescript", entry)).toContain(`function ${entry.signature.functionName}(`);
      expect(starterFor("python", entry)).toContain(`def ${entry.signature.functionName}(self`);
      expect(starterFor("python", entry)).not.toContain("Any");
    }
  });

  it("prefers a hand-written starter", () => {
    const e = { ...testcaseBySlug.get("two-sum")!, starters: { python: "def twoSum(nums, target): pass" } };
    expect(starterFor("python", e)).toBe("def twoSum(nums, target): pass");
  });

  it("round-trips a typed signature through a JSDoc starter", () => {
    const sig = { functionName: "f", params: [{ name: "grid", type: "number[][]" }], returnType: "boolean" };
    const js = jsStarter(sig);
    expect(parseSignature({ signature: { functionName: "f", params: ["grid"], returnType: "boolean" }, starter: js })).toEqual(sig);
  });
});

describe("workspace test-case inputs", () => {
  const visible = [{ input: [[2, 7], 9], expected: [0, 1], hidden: false }];

  it("turns each argument into JSON text", () => {
    expect(caseToDraft(visible[0]!)).toEqual(["[2,7]", "9"]);
  });

  it("reports the first argument that isn't JSON", () => {
    expect(parseDrafts([["[1,2]", "x"]], ["nums", "target"])).toEqual({ ok: false, error: expect.stringContaining("Case 1: target") });
    expect(parseDrafts([["[1, 2]", " 3 "]], ["nums", "target"])).toEqual({ ok: true, inputs: [[[1, 2], 3]] });
  });

  it("keeps the expected answer for an unchanged case and marks edited ones custom", () => {
    const out = casesFromInputs([[[2, 7], 9], [[1, 1], 2]], visible);
    expect(out[0]).toMatchObject({ expected: [0, 1], custom: false });
    expect(out[1]).toMatchObject({ expected: undefined, custom: true });
  });

  it("steps the font size within bounds", () => {
    expect(stepFontSize(14, 1)).toBe(15);
    expect(stepFontSize(12, -1)).toBe(12);
    expect(stepFontSize(18, 1)).toBe(18);
  });
});
