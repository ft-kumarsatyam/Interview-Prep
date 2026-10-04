import { describe, expect, it } from "vitest";
import { filterSnippets, formatTags, parseTags, tagCounts } from "@/modules/dsa/lib/playground/tags";
import { transpileTs } from "@/modules/dsa/lib/playground/ts-check";

describe("transpileTs", () => {
  it("strips types so the result is runnable JavaScript", async () => {
    const { js, errors } = await transpileTs("interface P { n: number }\nconst p: P = { n: 1 };\nenum E { A, B }\nconsole.log(p.n, E.B as number);");
    expect(errors).toEqual([]);
    expect(js).not.toContain("interface");
    expect(js).not.toContain(": P");
    expect(js).toContain("E[E[\"B\"] = 1]");
  });

  it("reports syntax errors with a line and column", async () => {
    const { errors } = await transpileTs("const a = 1;\nconst b = ;\n");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/^Line 2:\d+ /);
  });

  it("does not claim to type check", async () => {
    const { errors } = await transpileTs('const n: number = "not a number";');
    expect(errors).toEqual([]);
  });
});

describe("snippet tags", () => {
  it("parses commas, spaces and #, dedupes case-insensitively, and caps the count", () => {
    expect(parseTags("js-async, #closures  JS-Async")).toEqual(["js-async", "closures"]);
    expect(parseTags("")).toEqual([]);
    expect(parseTags("a b c d e f g h i j")).toHaveLength(8);
    expect(formatTags(["a", "b"])).toBe("a, b");
  });

  const snippets = [
    { title: "Debounce", tag: "js-async", code: "const debounce = () => {}" },
    { title: "LRU", tag: "dsa, design", code: "class LRU {}" },
    { title: "Untagged old snippet", tag: "", code: "console.log(1)" },
  ];

  it("counts tags, most used first, including the legacy single tag", () => {
    expect(tagCounts([...snippets, { title: "x", tag: "DSA", code: "" }])).toEqual([
      { tag: "dsa", count: 2 },
      { tag: "design", count: 1 },
      { tag: "js-async", count: 1 },
    ]);
  });

  it("searches title, tags and code", () => {
    expect(filterSnippets(snippets, "debounce", null).map((s) => s.title)).toEqual(["Debounce"]);
    expect(filterSnippets(snippets, "DESIGN", null).map((s) => s.title)).toEqual(["LRU"]);
    expect(filterSnippets(snippets, "console", null).map((s) => s.title)).toEqual(["Untagged old snippet"]);
  });

  it("narrows to one tag and still applies the search", () => {
    expect(filterSnippets(snippets, "", "dsa").map((s) => s.title)).toEqual(["LRU"]);
    expect(filterSnippets(snippets, "debounce", "dsa")).toEqual([]);
    expect(filterSnippets(snippets, "", null)).toHaveLength(3);
  });
});
