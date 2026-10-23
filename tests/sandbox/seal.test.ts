import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { testcaseBySlug as testcases } from "@/core/content";
import { sealCases } from "@/core/sandbox/seal-node";
import { workerLib } from "@/core/sandbox/worker-lib-node";
import type { TestCase } from "@/modules/dsa/domain/dsa-runner";

const lib = workerLib();
const judge = (actual: unknown, c: TestCase, compare?: string) => (c.expectedHash ? lib.sha256(lib.sealText(actual, compare)) === c.expectedHash : lib.matches(actual, c.expected, compare as never));

describe("sha256", () => {
  it("matches Node's crypto for ascii, unicode and long strings", () => {
    const samples = ["", "a", "abc", "[1,2,3]", "héllo wörld", "emoji \u{1F600} test", "x".repeat(1000), "line\nbreak", "a".repeat(55), "a".repeat(56), "a".repeat(64)];
    for (const s of samples) expect(lib.sha256(s), JSON.stringify(s.slice(0, 20))).toBe(createHash("sha256").update(s, "utf8").digest("hex"));
  });
});

describe("sealed hidden cases", () => {
  it("hash judging agrees with the real comparison, in every hashable compare mode", () => {
    let sealed = 0;
    for (const [slug, e] of testcases) {
      if (!lib.sealable(e.compare)) continue;
      const out = sealCases(e.cases, e.compare);
      out.forEach((c, i) => {
        const orig = e.cases[i]!;
        if (!orig.hidden) return expect(c).toEqual(orig);
        sealed++;
        expect(c.expected, `${slug}#${i}`).toBeNull();
        expect(c.expectedHash, `${slug}#${i}`).toMatch(/^[0-9a-f]{64}$/);
        expect(judge(orig.expected, c, e.compare), `${slug}#${i} accepts the right answer`).toBe(true);
        const wrong = Array.isArray(orig.expected) ? [...(orig.expected as unknown[]), "__extra__"] : { not: orig.expected };
        expect(judge(wrong, c, e.compare), `${slug}#${i} rejects a wrong answer`).toBe(false);
      });
    }
    expect(sealed).toBeGreaterThan(5000);
  });

  it("accepts an unordered answer in a different order but not a different one", () => {
    const [c] = sealCases([{ input: [], expected: [[1, 2], [3]], hidden: true }], "unordered");
    expect(judge([[3], [2, 1]], c!, "unordered")).toBe(true);
    expect(judge([[3], [2, 2]], c!, "unordered")).toBe(false);
  });

  it("does not let NaN or -0 pass for null or 0", () => {
    const [c] = sealCases([{ input: [], expected: [null, 0], hidden: true }], "exact");
    expect(judge([NaN, 0], c!, "exact")).toBe(false);
    expect(judge([null, -0], c!, "exact")).toBe(false);
    expect(judge([null, 0], c!, "exact")).toBe(true);
  });

  it("leaves visible cases, revealed cases and non-hashable compare modes unsealed", () => {
    const cases: TestCase[] = [{ input: [1], expected: 1, hidden: false }, { input: [2], expected: 2, hidden: true }, { input: [3], expected: 3, hidden: true }];
    const out = sealCases(cases, "exact", [2]);
    expect(out[0]).toEqual(cases[0]);
    expect(out[1]!.expected).toBeNull();
    expect(out[2]).toEqual(cases[2]);
    expect(sealCases(cases, "no-adjacent-repeat")).toEqual(cases);
    expect(sealCases(cases, "same-inorder")).toEqual(cases);
  });

  it("ships no hidden answer text for a sealed problem", () => {
    const e = testcases.get("two-sum")!;
    const payload = JSON.stringify(sealCases(e.cases, e.compare));
    const visible = new Set(e.cases.filter((c) => !c.hidden).map((c) => JSON.stringify(c.expected)));
    const hidden = e.cases.filter((c) => c.hidden && !visible.has(JSON.stringify(c.expected)));
    expect(hidden.length).toBeGreaterThan(0);
    for (const h of hidden) expect(payload).not.toContain(`"expected":${JSON.stringify(h.expected)}`);
    expect(payload).toContain("expectedHash");
  });
});
