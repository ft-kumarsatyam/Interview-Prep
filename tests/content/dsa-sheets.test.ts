import { describe, expect, it } from "vitest";
import { dsaSheets, problemBySlug } from "@/core/content";

describe("data/dsa-sheets.json", () => {
  it("ships the well-known sheets with sensible sizes", () => {
    const sizes = Object.fromEntries(dsaSheets.map((s) => [s.id, s.items.length]));
    expect(sizes["blind75"]).toBeGreaterThanOrEqual(65);
    expect(sizes["neetcode150"]).toBeGreaterThanOrEqual(140);
    expect(sizes["neetcode-all"]).toBeGreaterThanOrEqual(400);
    expect(sizes["striver-sde"]).toBeGreaterThanOrEqual(100);
  });

  it.each(dsaSheets.map((s) => [s.id, s] as const))("%s only lists known, unique, free main-track problems", (_id, sheet) => {
    const seen = new Set<string>();
    for (const item of sheet.items) {
      const p = problemBySlug.get(item.slug);
      expect(p, `${sheet.id}: unknown slug ${item.slug}`).toBeDefined();
      expect(p?.track, `${sheet.id}: ${item.slug} is not in the main track`).toBe("main");
      expect(seen.has(item.slug), `${sheet.id}: duplicate ${item.slug}`).toBe(false);
      seen.add(item.slug);
      expect(item.section.length).toBeGreaterThan(0);
      if (item.video) expect(item.video).toMatch(/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//);
    }
  });

  it("has unique sheet ids", () => {
    expect(new Set(dsaSheets.map((s) => s.id)).size).toBe(dsaSheets.length);
  });
});
