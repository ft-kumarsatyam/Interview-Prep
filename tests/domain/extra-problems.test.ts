import { describe, expect, it } from "vitest";
import { effectiveStatuses, type ExternalQuestion } from "@/modules/dsa/domain/external-catalogue";
import { extraProblemSchema, extraSlugClashes, formatExampleInput } from "@/modules/dsa/domain/extra-problems";

describe("extra problem schema", () => {
  it("requires a statement for authored problems and a LeetCode id and url for LeetCode-backed ones", () => {
    const base = { slug: "sum-of-array", title: "Sum of Array", difficulty: "Easy", pattern: "Arrays" } as const;
    expect(extraProblemSchema.safeParse({ ...base, source: "authored", statementMd: "Return the sum of all elements." }).success).toBe(true);
    expect(extraProblemSchema.safeParse({ ...base, source: "authored" }).success).toBe(false);
    expect(extraProblemSchema.safeParse({ ...base, source: "leetcode", leetcodeId: 1, url: "https://leetcode.com/problems/two-sum/" }).success).toBe(true);
    expect(extraProblemSchema.safeParse({ ...base, source: "leetcode", url: "https://leetcode.com/problems/two-sum/" }).success).toBe(false);
    expect(extraProblemSchema.safeParse({ ...base, source: "leetcode", leetcodeId: 1, url: "https://example.com/two-sum" }).success).toBe(false);
    expect(extraProblemSchema.safeParse({ ...base, slug: "Bad Slug", source: "authored", statementMd: "Return the sum of all elements." }).success).toBe(false);
  });
});

describe("extraSlugClashes", () => {
  it("reports duplicates and slugs that are already seeded", () => {
    expect(extraSlugClashes([{ slug: "a" }, { slug: "b" }, { slug: "a" }, { slug: "two-sum" }], new Set(["two-sum"]))).toEqual(["a", "two-sum"]);
    expect(extraSlugClashes([{ slug: "a" }], new Set())).toEqual([]);
  });
});

describe("formatExampleInput", () => {
  it("renders each parameter as JSON", () => {
    expect(formatExampleInput(["nums", "k", "s"], [[1, 2], 3, "ab"])).toBe('nums = [1,2], k = 3, s = "ab"');
  });
});

describe("effectiveStatuses", () => {
  const q = (id: string, localSlug?: string): ExternalQuestion => ({
    id, sheetId: "s", order: 1, section: "Arrays", category: "Arrays", difficulty: "Easy", title: id, links: [], companies: [], sourceCoverage: "exact", ...(localSlug ? { localSlug } : {}),
  });
  const sheets = [{ questions: [q("a", "two-sum"), q("b", "three-sum"), q("c"), q("d", "four-sum")] }];

  it("takes the further of the sheet status and the local problem's progress", () => {
    const out = effectiveStatuses(sheets, { b: "completed", c: "in-progress", d: "in-progress" }, { "two-sum": { status: "solved" }, "three-sum": { status: "attempted" }, "four-sum": { status: "solved" } });
    expect(out).toEqual({ a: "completed", b: "completed", c: "in-progress", d: "completed" });
  });

  it("leaves untouched questions out", () => {
    expect(effectiveStatuses(sheets, {}, {})).toEqual({});
  });
});
