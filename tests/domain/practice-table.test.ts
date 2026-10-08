import { describe, expect, it } from "vitest";
import { companyDataset, dsaSheets, externalDsaSheets, problems } from "@/core/content";
import { parseDsaView } from "@/modules/dsa/components/dsa-view-state";
import {
  buildPracticeRows,
  DEFAULT_TABLE_FILTERS,
  filterRows,
  levelOf,
  levelProgress,
  parseTableFilters,
  pinFirst,
  rowResources,
  sortRows,
  tableFiltersToPatch,
  topicOptions,
} from "@/modules/dsa/domain/practice-table";

const rows = buildPracticeRows(problems, companyDataset, rowResources(dsaSheets, externalDsaSheets));
const none = { solved: new Set<string>(), bookmarks: new Set<string>() };

describe("practice table", () => {
  it("maps difficulty to Basic, Core and Pro", () => {
    expect(levelOf({ difficulty: "Easy" })).toBe("Basic");
    expect(levelOf({ difficulty: "Medium" })).toBe("Core");
    expect(levelOf({ difficulty: "Hard" })).toBe("Pro");
  });

  it("builds one numbered row per main-track problem with company and topic tags", () => {
    expect(rows.length).toBe(problems.filter((p) => p.track === "main").length);
    expect(rows.map((r) => r.number)).toEqual(rows.map((_, i) => i + 1));
    const twoSum = rows.find((r) => r.slug === "two-sum");
    expect(twoSum?.companies).toContain("Amazon");
    expect(twoSum?.topics).toContain("Hash Table");
    expect(rows.some((r) => r.video)).toBe(true);
  });

  it("filters by search, level, status, company and topic", () => {
    expect(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, q: "two sum" }, none).some((r) => r.slug === "two-sum")).toBe(true);
    expect(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, level: "Pro" }, none).every((r) => r.level === "Pro")).toBe(true);
    expect(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, status: "solved" }, { ...none, solved: new Set(["two-sum"]) }).map((r) => r.slug)).toEqual(["two-sum"]);
    expect(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, status: "bookmarked" }, { ...none, bookmarks: new Set(["3sum"]) }).map((r) => r.slug)).toEqual(["3sum"]);
    expect(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, company: "Google" }, none).every((r) => r.companies.includes("Google"))).toBe(true);
    expect(filterRows(rows, { ...DEFAULT_TABLE_FILTERS, topic: "Graph Theory" }, none).length).toBeGreaterThan(0);
  });

  it("sorts by frequency, shuffles deterministically and pins the POTD", () => {
    const byFreq = sortRows(rows, "frequency");
    expect(byFreq[0].asked).toBeGreaterThanOrEqual(byFreq[1].asked);
    expect(sortRows(rows, "shuffle", 7).map((r) => r.slug)).toEqual(sortRows(rows, "shuffle", 7).map((r) => r.slug));
    expect(sortRows(rows, "shuffle", 7).map((r) => r.slug)).not.toEqual(sortRows(rows, "order").map((r) => r.slug));
    expect(pinFirst(rows, "3sum")[0].slug).toBe("3sum");
    expect(pinFirst(rows, null)).toEqual(rows);
  });

  it("summarises progress per level", () => {
    const progress = levelProgress(rows, new Set(["two-sum"]));
    expect(progress.solved).toBe(1);
    expect(progress.byLevel.Basic.solved).toBe(1);
    expect(progress.byLevel.Basic.total + progress.byLevel.Core.total + progress.byLevel.Pro.total).toBe(rows.length);
  });

  it("round-trips filters through t-prefixed URL keys", () => {
    const f = parseTableFilters({ tq: "sum", tlevel: "Core", tsort: "frequency", tco: "Amazon", bogus: "x" });
    expect(f).toMatchObject({ q: "sum", level: "Core", sort: "frequency", company: "Amazon", status: "all" });
    expect(tableFiltersToPatch(f)).toEqual({ tq: "sum", tlevel: "Core", tstatus: null, tco: "Amazon", ttopic: null, tsort: "frequency" });
    expect(parseTableFilters({ tlevel: "Expert" }).level).toBe("all");
  });

  it("offers the common topics first", () => {
    expect(topicOptions(rows, 5)).toHaveLength(5);
    expect(topicOptions(rows, 3)).toContain("Array");
  });
});

describe("dsa view state", () => {
  it("opens the by-topic browser for old filter links and the table otherwise", () => {
    expect(parseDsaView({}).tab).toBe("practice");
    expect(parseDsaView({ pattern: "Trees" }).tab).toBe("topics");
    expect(parseDsaView({ track: "sql" }).tab).toBe("topics");
    expect(parseDsaView({ tab: "sheets", pattern: "Trees" }).tab).toBe("sheets");
  });
});
