import { describe, expect, it } from "vitest";
import { companyDataset, dsaSheets, popularDsaSheets, problemBySlug, problems, systemDesign, topicById } from "@/core/content";
import { designSheetRows, LLD_CASES } from "@/modules/design/domain/design-sheet";
import { DB_CHALLENGES } from "@/modules/dsa/domain/db-lab";
import { contentSheetAsExternal, ESSENTIAL_PATTERNS, PACKAGE_TIERS, packageSheet, patternSheet, sheetCardGroups } from "@/modules/dsa/domain/sheet-hub";
import { sqlSheetRows } from "@/modules/dsa/domain/sql-sheet";
import { hubQuestion, hubSheet, hubSheets } from "@/modules/dsa/services/sheet-catalogue";

describe("sheet hub", () => {
  it("turns a PrepOS list into a browsable sheet that opens every row in-app", () => {
    const blind = contentSheetAsExternal(dsaSheets.find((s) => s.id === "blind75")!, problemBySlug, "2026-01-01");
    expect(blind.questions.length).toBeGreaterThan(60);
    expect(blind.questions.every((q) => q.localSlug && q.id.startsWith("blind75-"))).toBe(true);
    expect(blind.sections).toContain("Arrays & Hashing");
  });

  it("summarises sheets as grouped cards with difficulty counts and completed rows", () => {
    const blind = contentSheetAsExternal(dsaSheets.find((s) => s.id === "blind75")!, problemBySlug, "2026-01-01");
    const pattern = patternSheet(problemBySlug, "2026-01-01");
    const groups = sheetCardGroups([{ sheet: pattern, group: "Pattern and ladder sheets" }, { sheet: blind, group: "Popular sheets" }], { [blind.questions[0]!.id]: "completed" });
    expect(groups.map((g) => g.title)).toEqual(["Popular sheets", "Pattern and ladder sheets"]);
    const card = groups[0]!.cards[0]!;
    expect(card).toMatchObject({ href: "/dsa/sheets/blind75", total: blind.questions.length, completed: 1, topics: blind.sections.length });
    expect(card.byDifficulty.Easy + card.byDifficulty.Medium + card.byDifficulty.Hard).toBe(card.total);
  });

  it("fills every essential pattern with at least four PrepOS problems", () => {
    const sheet = patternSheet(problemBySlug, "2026-01-01");
    expect(sheet.sections).toHaveLength(ESSENTIAL_PATTERNS.length);
    for (const section of sheet.sections) expect(sheet.questions.filter((q) => q.section === section).length, section).toBeGreaterThanOrEqual(4);
  });

  it("groups package tiers by company and respects each tier's difficulties", () => {
    const sheet = packageSheet(problems, companyDataset, "2026-01-01");
    expect(sheet.sections).toEqual(PACKAGE_TIERS.map((t) => t.name));
    for (const tier of PACKAGE_TIERS) {
      const rows = sheet.questions.filter((q) => q.section === tier.name);
      expect(rows.length, tier.name).toBeGreaterThanOrEqual(20);
      expect(rows.every((q) => tier.difficulties.includes(q.difficulty))).toBe(true);
      expect(rows.every((q) => q.companies.every((c) => tier.companies.includes(c.company)))).toBe(true);
    }
  });

  it("imports the four public sheets with their sources", () => {
    expect(popularDsaSheets.map((s) => s.id)).toEqual(["love-babbar-450", "apna-college-375", "arsh-goyal", "fraz-250"]);
    for (const sheet of popularDsaSheets) {
      expect(sheet.questions.length, sheet.id).toBeGreaterThanOrEqual(250);
      expect(sheet.sourceUrl).toMatch(/^https:\/\//);
      expect(sheet.questions.every((q) => q.links.some((l) => l.scope === "item"))).toBe(true);
      expect(sheet.questions.filter((q) => q.localSlug).every((q) => problemBySlug.has(q.localSlug!))).toBe(true);
    }
  });

  it("keeps every hub sheet and row id unique, so a tick lands on exactly one row", () => {
    const sheetIds = hubSheets.map((e) => e.sheet.id);
    expect(new Set(sheetIds).size).toBe(sheetIds.length);
    const rowIds = hubSheets.flatMap((e) => e.sheet.questions.map((q) => q.id));
    expect(new Set(rowIds).size).toBe(rowIds.length);
    expect(hubSheet("fraz-250")?.group).toBe("Popular sheets");
    expect(hubQuestion("fraz-001")?.sheetId).toBe("fraz-250");
  });
});

describe("system design and SQL sheets", () => {
  it("lists every HLD case and LLD question with an in-app link and status", () => {
    const rows = designSheetRows(systemDesign.cases, { "url-shortener": "practised" }, new Set(["lld-method:2"]));
    expect(rows).toHaveLength(systemDesign.cases.length + LLD_CASES.length);
    expect(rows.find((r) => r.id === "url-shortener")).toMatchObject({ kind: "HLD", status: "done", href: "/design/url-shortener" });
    expect(rows.find((r) => r.id === "parking-lot")).toMatchObject({ kind: "LLD", status: "done", href: "/learn/lld-method" });
    expect(rows.find((r) => r.id === "elevator")?.status).toBe("todo");
    for (const c of LLD_CASES) {
      const [topicId, index] = c.subtopic.split(":");
      expect(topicById.get(topicId)?.subtopics[Number(index)], c.subtopic).toBeDefined();
    }
  });

  it("collects about 110 SQL questions, easy first", () => {
    const rows = sqlSheetRows(problems, DB_CHALLENGES);
    expect(rows.length).toBeGreaterThanOrEqual(100);
    expect(rows[0].difficulty).toBe("Easy");
    expect(rows.at(-1)?.difficulty).toBe("Hard");
    expect(rows.find((r) => r.source === "DB Lab")?.href).toMatch(/^\/playground\/db\?challenge=sql-/);
  });
});
