import { describe, expect, it } from "vitest";
import companiesJson from "@/data/companies.json";
import problemsJson from "@/data/dsa-problems.json";
import systemDesignJson from "@/data/system-design.json";
import syllabusJson from "@/data/syllabus.json";
import type { BacklogItem } from "@/lib/domain/backlog-items";
import {
  TIER_IDS,
  blueprintGaps,
  buildBlueprint,
  isPriority,
  isTierId,
  filterCompanies,
  catalogueRegions,
  mergeCompanyItems,
  underlyingKey,
  primaryTier,
  quotas,
  selectDsaSet,
  type BlueprintInput,
  type Company,
  type PoolProblem,
  type TierProfile,
} from "@/lib/domain/companies";

const tiers = companiesJson.tiers as unknown as TierProfile[];
const companies = companiesJson.companies as Company[];
const pool: PoolProblem[] = (problemsJson as Array<PoolProblem & { track: string }>)
  .filter((p) => p.track === "main")
  .map((p) => ({ slug: p.slug, title: p.title, difficulty: p.difficulty, pattern: p.pattern, tier: p.tier, order: p.order }));
const tier = (id: string) => tiers.find((t) => t.id === id)!;

describe("data/companies.json", () => {
  it("has a profile for every tier id, and every company points at a real tier", () => {
    expect(tiers.map((t) => t.id).toSorted()).toEqual([...TIER_IDS].toSorted());
    for (const c of companies) expect(isTierId(c.tier), c.name).toBe(true);
    expect(new Set(companies.map((c) => c.id)).size).toBe(companies.length);
  });

  it("references only real design cases, DSA patterns and syllabus tracks", () => {
    const cases = new Set(systemDesignJson.cases.map((c) => c.slug));
    const patterns = new Set(pool.map((p) => p.pattern));
    const areas = new Set(["dsa-problems", "design-cases", ...syllabusJson.tracks.map((t) => t.id)]);
    for (const t of tiers) {
      for (const s of t.designCases) expect(cases.has(s), `${t.id}:${s}`).toBe(true);
      for (const p of Object.keys(t.dsa.patterns)) expect(patterns.has(p), `${t.id}:${p}`).toBe(true);
      for (const a of Object.keys(t.weights)) expect(areas.has(a), `${t.id}:${a}`).toBe(true);
      expect(Object.values(t.dsa.mix).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });

  it("escalates: harder mix and more design for bigger tiers", () => {
    expect(tier("big-tech").dsa.mix.Hard).toBeGreaterThan(tier("mid-tier").dsa.mix.Hard);
    expect(tier("mid-tier").dsa.mix.Hard).toBeGreaterThan(tier("service-mnc").dsa.mix.Hard);
    expect(tier("big-tech").designCases.length).toBeGreaterThan(tier("mid-tier").designCases.length);
    expect(tier("service-mnc").weights.oop).toBeGreaterThan(tier("big-tech").weights.oop);
  });
});

describe("quotas and the DSA set", () => {
  it("quotas always add up to the size", () => {
    for (const size of [1, 7, 60, 90, 150]) {
      const q = quotas(size, { Easy: 20, Medium: 65, Hard: 15 });
      expect(q.Easy + q.Medium + q.Hard).toBe(size);
    }
    expect(quotas(100, { Easy: 10, Medium: 55, Hard: 35 })).toEqual({ Easy: 10, Medium: 55, Hard: 35 });
  });

  it.each(TIER_IDS)("%s: right size, follows its difficulty mix, no duplicates, only weighted patterns", (id) => {
    const t = tier(id);
    const set = selectDsaSet(pool, t);
    expect(set).toHaveLength(t.dsa.size);
    expect(new Set(set.map((p) => p.slug)).size).toBe(set.length);
    const q = quotas(t.dsa.size, t.dsa.mix);
    for (const d of ["Easy", "Medium", "Hard"] as const) expect(set.filter((p) => p.difficulty === d).length).toBe(q[d]);
    for (const p of set) expect(t.dsa.patterns[p.pattern] ?? 0).toBeGreaterThan(0);
  });

  it("is deterministic and favours the patterns a tier weights most", () => {
    const a = selectDsaSet(pool, tier("big-tech")).map((p) => p.slug);
    expect(selectDsaSet(pool, tier("big-tech")).map((p) => p.slug)).toEqual(a);
    const count = (id: string, pattern: string) => selectDsaSet(pool, tier(id)).filter((p) => p.pattern === pattern).length;
    expect(count("big-tech", "Advanced Graphs")).toBeGreaterThan(count("mid-tier", "Advanced Graphs"));
    expect(count("service-mnc", "Advanced Graphs")).toBe(0);
  });

  it("hands a short difficulty's share to the others instead of returning a short set", () => {
    const tiny: PoolProblem[] = Array.from({ length: 10 }, (_, i) => ({ slug: `m${i}`, title: `M${i}`, difficulty: "Medium", pattern: "Trees", tier: "core", order: i }));
    const profile: TierProfile = { ...tier("big-tech"), dsa: { size: 6, mix: { Easy: 0, Medium: 50, Hard: 50 }, patterns: { Trees: 3 } } };
    expect(selectDsaSet(tiny, profile)).toHaveLength(6);
  });

  it("takes core problems before extended ones within a pattern", () => {
    const mixed: PoolProblem[] = [
      { slug: "ext", title: "Ext", difficulty: "Medium", pattern: "Trees", tier: "extended", order: 1 },
      { slug: "core", title: "Core", difficulty: "Medium", pattern: "Trees", tier: "core", order: 9 },
    ];
    const profile: TierProfile = { ...tier("big-tech"), dsa: { size: 1, mix: { Easy: 0, Medium: 100, Hard: 0 }, patterns: { Trees: 5 } } };
    expect(selectDsaSet(mixed, profile).map((p) => p.slug)).toEqual(["core"]);
  });
});

describe("blueprint and gaps", () => {
  const baseInput = (over: Partial<BlueprintInput> = {}): BlueprintInput => ({
    profile: tier("mid-tier"),
    pool,
    solved: new Set(),
    cases: systemDesignJson.cases.map((c) => ({ slug: c.slug, title: c.title })),
    designStatus: {},
    tracks: [
      { id: "dbms", name: "DBMS & SQL", total: 77, ticked: 0, next: { id: "sql-basics:0", title: "SELECT basics", topicId: "sql-basics", topicTitle: "SQL" } },
      { id: "oop", name: "OOP", total: 29, ticked: 29, next: null },
      { id: "js", name: "JavaScript", total: 57, ticked: 0, next: { id: "js-basics:0", title: "Types", topicId: "js-basics", topicTitle: "JS basics" } },
    ],
    pinnedDsa: [],
    pinnedDesign: [],
    ...over,
  });

  it("starts at 0, rises with progress, and only counts areas the tier weights", () => {
    const zero = buildBlueprint(baseInput());
    expect(zero.overall).toBeLessThan(40); // oop is fully ticked, the rest is empty
    expect(zero.areas.find((a) => a.id === "oop")?.pct).toBe(100);
    const solved = new Set(selectDsaSet(pool, tier("mid-tier")).map((p) => p.slug));
    const more = buildBlueprint(baseInput({ solved, designStatus: Object.fromEntries(tier("mid-tier").designCases.map((s) => [s, "practised" as const])) }));
    expect(more.overall).toBeGreaterThan(zero.overall);
    expect(more.areas.find((a) => a.id === "dsa-problems")?.pct).toBe(100);
    expect(more.areas.find((a) => a.id === "design-cases")?.pct).toBe(100);
    const none = buildBlueprint(baseInput({ profile: { ...tier("mid-tier"), weights: {} } }));
    expect(none.areas).toEqual([]);
    expect(none.overall).toBe(0);
  });

  it("adds pinned problems and cases even when the tier wouldn't pick them", () => {
    const set = new Set(selectDsaSet(pool, tier("service-mnc")).map((p) => p.slug));
    const outside = pool.find((p) => !set.has(p.slug))!;
    const bp = buildBlueprint(baseInput({ profile: tier("service-mnc"), pinnedDsa: [outside.slug, "no-such-problem"], pinnedDesign: ["stock-exchange", "nope"] }));
    expect(bp.problems[0]).toMatchObject({ slug: outside.slug, pinned: true });
    expect(bp.problems).toHaveLength(tier("service-mnc").dsa.size + 1);
    expect(bp.cases[0]).toMatchObject({ slug: "stock-exchange", pinned: true });
    expect(bp.cases.find((c) => c.slug === "nope")).toBeUndefined();
  });

  it("makes gaps: pins first, then DSA, design and the subjects furthest behind, boosted by priority", () => {
    const input = baseInput({ pinnedDsa: ["two-sum"] });
    const bp = buildBlueprint(input);
    const gaps = blueprintGaps(bp, input, { company: "Swiggy", priority: "dream" });
    expect(gaps[0]).toMatchObject({ key: "dsa:two-sum", boost: 12 + 5 });
    expect(gaps.filter((g) => g.key.startsWith("dsa:")).length).toBeLessThanOrEqual(5);
    expect(gaps.filter((g) => g.key.startsWith("design:")).length).toBeGreaterThan(0);
    const subjects = gaps.filter((g) => g.key.startsWith("sub:")).map((g) => g.key);
    expect(subjects).toContain("sub:sql-basics:0");
    expect(subjects).not.toContain("sub:oop:0"); // fully ticked, nothing next
    expect(gaps.every((g) => g.note.startsWith("Swiggy"))).toBe(true);
    expect(blueprintGaps(bp, input, { company: "X", priority: "safe" }).at(-1)!.boost).toBe(3);
  });

  it("has no gaps once everything is done", () => {
    const set = selectDsaSet(pool, tier("startup"));
    const input = baseInput({
      profile: tier("startup"),
      solved: new Set(set.map((p) => p.slug)),
      designStatus: Object.fromEntries(tier("startup").designCases.map((s) => [s, "mastered" as const])),
      tracks: [{ id: "js", name: "JS", total: 5, ticked: 5, next: null }],
    });
    expect(blueprintGaps(buildBlueprint(input), input, { company: "X", priority: "target" })).toEqual([]);
  });
});

describe("helpers", () => {
  it("validates ids and picks the primary tier by priority", () => {
    expect(isPriority("dream")).toBe(true);
    expect(isPriority("meh")).toBe(false);
    expect(primaryTier([])).toBeNull();
    expect(primaryTier([{ tier: "startup", priority: "safe" }, { tier: "big-tech", priority: "dream" }, { tier: "mid-tier", priority: "target" }])).toBe("big-tech");
  });

  it("maps a company gap to the ordinary item it stands for", () => {
    expect(underlyingKey("company:dsa:two-sum")).toBe("dsa:two-sum");
    expect(underlyingKey("company:design:chat")).toBe("design:chat");
    expect(underlyingKey("company:sub:hld-framework:2")).toBe("theory:hld-framework:2");
  });

  it("merges a company gap into the item it duplicates instead of listing it twice", () => {
    const base: BacklogItem[] = [
      { key: "dsa:two-sum", kind: "dsa", title: "Two Sum", note: "Easy", path: "/dsa/two-sum", minutes: 20, rank: 0 },
      { key: "theory:t:0", kind: "theory", title: "A", path: "/learn/t", minutes: 25, rank: 0 },
      { key: "theory:t:1", kind: "theory", title: "B", path: "/learn/t", minutes: 25, rank: 1 },
    ];
    const company: BacklogItem[] = [
      { key: "company:dsa:two-sum", kind: "company", title: "Two Sum", note: "Google · Easy", path: "/dsa/two-sum", minutes: 20, rank: 0, boost: 12 },
      { key: "company:dsa:3sum", kind: "company", title: "3Sum", note: "Google · Medium", path: "/dsa/3sum", minutes: 35, rank: 1, boost: 12 },
      { key: "company:sub:t:1", kind: "company", title: "B", note: "Uber · T", path: "/learn/t", minutes: 25, rank: 2, boost: 8 },
    ];
    const merged = mergeCompanyItems(base, company);
    expect(merged.map((i) => i.key)).toEqual(["dsa:two-sum", "theory:t:0", "theory:t:1", "company:dsa:3sum"]);
    expect(merged[0]).toMatchObject({ boost: 12, note: "Easy · Google" });
    // Two subtopics share a topic page, and only the one the company named is boosted.
    expect(merged[1]!.boost).toBeUndefined();
    expect(merged[2]).toMatchObject({ boost: 8, note: "Uber" });
    expect(base[0]!.boost).toBeUndefined();
  });
});

describe("browsing the catalogue", () => {
  it("every company has a region and sector, and every tier has companies", () => {
    for (const c of companies) {
      expect(c.region, c.name).toBeTruthy();
      expect(c.sector, c.name).toBeTruthy();
    }
    for (const id of TIER_IDS) expect(companies.some((c) => c.tier === id), id).toBe(true);
  });

  it("filters by search text, tier and region, sorted by name", () => {
    expect(filterCompanies(companies, { query: "open-source" }).length).toBeGreaterThan(0);
    const oss = filterCompanies(companies, { tier: "open-source" });
    expect(oss.every((c) => c.tier === "open-source")).toBe(true);
    expect(oss.map((c) => c.name)).toEqual(oss.map((c) => c.name).toSorted((a, b) => a.localeCompare(b)));
    expect(filterCompanies(companies, { query: "GOOGLE" }).some((c) => c.id === "google")).toBe(true);
    expect(filterCompanies(companies, { tier: "all", region: "all" })).toHaveLength(companies.length);
    expect(filterCompanies(companies, { region: "India" }).every((c) => c.region === "India")).toBe(true);
  });

  it("lists regions most common first", () => {
    const regions = catalogueRegions(companies);
    expect(new Set(regions).size).toBe(regions.length);
    expect(regions).toContain("India");
  });
});
