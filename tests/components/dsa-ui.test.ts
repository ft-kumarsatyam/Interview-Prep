import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EdgeCasesPanel } from "@/components/dsa/edge-cases-panel";
import { HintReveal } from "@/components/dsa/hint-reveal";
import { TestCasePanel } from "@/components/dsa/test-case-panel";
import type { HintLevel } from "@/lib/domain/dsa-runner";

const hints: HintLevel[] = [
  { level: 1, kind: "nudge", text: "think about lookups" },
  { level: 2, kind: "approach", text: "use a map" },
  { level: 3, kind: "pseudocode", text: "for x in nums" },
];
const cases = [
  { input: [[1]], expected: 1, hidden: false },
  { input: [[0, 0]], expected: 0, hidden: false, edge: "zeros" as const, note: "Zero is falsy." },
  { input: [[9]], expected: 9, hidden: true, edge: "single" as const },
];

describe("DSA runner panels", () => {
  it("starts the hint ladder closed, offering only the first step", () => {
    const html = renderToStaticMarkup(createElement(HintReveal, { hints }));
    expect(html).toContain("Show a nudge");
    expect(html).not.toContain("think about lookups");
  });

  it("lists visible edge cases with their reason, and only counts hidden ones", () => {
    const html = renderToStaticMarkup(createElement(EdgeCasesPanel, { cases, results: null, busy: false, onRun: () => {} }));
    expect(html).toContain("Zeros");
    expect(html).toContain("Zero is falsy.");
    expect(html).toContain("Run all edges");
    expect(html).toContain("1 more are hidden");
    expect(html).not.toContain("[9]");
  });

  it("tags edge cases in the case list but never reveals a hidden one", () => {
    const html = renderToStaticMarkup(createElement(TestCasePanel, { cases, results: null }));
    expect(html).toContain("Zeros");
    expect(html).toContain("Hidden case 3");
    expect(html).not.toContain("[9]");
    expect(html).not.toContain("Single element");
  });
});
