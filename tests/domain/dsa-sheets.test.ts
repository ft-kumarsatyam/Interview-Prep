import { describe, expect, it } from "vitest";
import type { ContentProblem, ContentSheet } from "@/core/content";
import { nextInSheet, sheetProgress, sheetSections, sheetVideos } from "@/modules/dsa/domain/dsa-sheets";

const prob = (slug: string) => ({ slug, title: slug, order: 1 }) as ContentProblem;
const bySlug = new Map(["a", "b", "c", "d"].map((s) => [s, prob(s)]));
const sheet = {
  id: "x",
  items: [
    { slug: "c", section: "Two", video: "https://youtu.be/1" },
    { slug: "a", section: "One" },
    { slug: "b", section: "Two" },
    { slug: "missing", section: "Two" },
  ],
} as ContentSheet;

describe("sheetSections", () => {
  it("groups by section in the author's order and skips unknown slugs", () => {
    const out = sheetSections(sheet, bySlug);
    expect(out.map((s) => s.section)).toEqual(["Two", "One"]);
    expect(out[0]?.problems.map((p) => p.slug)).toEqual(["c", "b"]);
  });
  it("applies the keep filter and drops emptied sections", () => {
    expect(sheetSections(sheet, bySlug, (p) => p.slug === "a").map((s) => s.section)).toEqual(["One"]);
  });
});

describe("sheetVideos / nextInSheet / sheetProgress", () => {
  it("maps only items that have a video", () => {
    expect(sheetVideos(sheet)).toEqual({ c: "https://youtu.be/1" });
  });
  it("returns the first unsolved problem in sheet order", () => {
    expect(nextInSheet(sheet, bySlug, (s) => s === "c")?.slug).toBe("a");
    expect(nextInSheet(sheet, bySlug, () => true)).toBeUndefined();
  });
  it("counts solved items", () => {
    expect(sheetProgress(sheet, (s) => s === "a" || s === "b")).toEqual({ solved: 2, total: 4 });
  });
});
