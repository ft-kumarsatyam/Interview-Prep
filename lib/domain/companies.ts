/**
 * Company targeting: a tier profile (typical rounds, DSA pattern and difficulty mix, design cases, subject
 * weights) decides what a prep set looks like; your progress decides readiness and the gaps. Pure.
 * The sets are generated from the problems, cases and syllabus you already have, then you pin your own.
 */
import type { BacklogItem } from "./backlog-items";

export const TIER_IDS = ["big-tech", "large-product", "mid-tier", "startup", "service-mnc", "quant-fintech", "open-source", "ai-data"] as const;
export type TierId = (typeof TIER_IDS)[number];
export const PRIORITIES = ["dream", "target", "safe"] as const;
export type TargetPriority = (typeof PRIORITIES)[number];

export type Difficulty = "Easy" | "Medium" | "Hard";
const DIFFICULTIES: readonly Difficulty[] = ["Easy", "Medium", "Hard"];

export interface TierProfile {
  id: TierId;
  name: string;
  short: string;
  blurb: string;
  rounds: Array<{ name: string; focus: string }>;
  dsa: { size: number; mix: Record<Difficulty, number>; patterns: Record<string, number> };
  designCases: string[];
  /** Area weights: "dsa-problems", "design-cases", then syllabus track ids. 0 leaves an area out. */
  weights: Record<string, number>;
}

export interface Company {
  id: string;
  name: string;
  tier: TierId;
  /** Where it hires: "India", "US", "Remote", "Global"... Display and filtering only. */
  region?: string;
  sector?: string;
}

export const isTierId = (v: unknown): v is TierId => typeof v === "string" && (TIER_IDS as readonly string[]).includes(v);
export const isPriority = (v: unknown): v is TargetPriority => typeof v === "string" && (PRIORITIES as readonly string[]).includes(v);

export const PRIORITY_LABEL: Record<TargetPriority, string> = { dream: "Dream", target: "Target", safe: "Safe" };
/** How much a target's gaps outrank ordinary backlog. */
export const PRIORITY_BOOST: Record<TargetPriority, number> = { dream: 12, target: 8, safe: 3 };
const PIN_BOOST = 5;

/* --------------------------------- the DSA set --------------------------------- */

export interface PoolProblem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  pattern: string;
  tier: "core" | "extended";
  order: number;
}

/** Counts per difficulty that add up to `size`, following the mix (largest remainder). */
export function quotas(size: number, mix: Record<Difficulty, number>): Record<Difficulty, number> {
  const total = DIFFICULTIES.reduce((n, d) => n + mix[d], 0) || 1;
  const raw = DIFFICULTIES.map((d) => ({ d, exact: (size * mix[d]) / total }));
  const out = Object.fromEntries(raw.map((r) => [r.d, Math.floor(r.exact)])) as Record<Difficulty, number>;
  let left = size - DIFFICULTIES.reduce((n, d) => n + out[d], 0);
  for (const r of raw.toSorted((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)))) {
    if (left <= 0) break;
    out[r.d]++;
    left--;
  }
  return out;
}

/**
 * The prep set for a profile: for each difficulty, take problems from the heavily weighted patterns first
 * (a weighted round-robin so no pattern floods the set), core problems before extended ones. Deterministic.
 */
export function selectDsaSet(pool: readonly PoolProblem[], profile: TierProfile): PoolProblem[] {
  const want = quotas(profile.dsa.size, profile.dsa.mix);
  const chosen: PoolProblem[] = [];
  const taken = new Set<string>();

  const pickFrom = (difficulty: Difficulty, count: number) => {
    const byPattern = new Map<string, PoolProblem[]>();
    for (const p of pool) {
      if (p.difficulty !== difficulty || taken.has(p.slug) || (profile.dsa.patterns[p.pattern] ?? 0) <= 0) continue;
      (byPattern.get(p.pattern) ?? byPattern.set(p.pattern, []).get(p.pattern)!).push(p);
    }
    for (const list of byPattern.values()) list.sort((a, b) => (a.tier === b.tier ? a.order - b.order : a.tier === "core" ? -1 : 1));
    const counts = new Map<string, number>();
    let got = 0;
    while (got < count) {
      let best: string | null = null;
      let bestRatio = Infinity;
      for (const [pattern, list] of byPattern) {
        if (list.length === 0) continue;
        const ratio = ((counts.get(pattern) ?? 0) + 1) / profile.dsa.patterns[pattern]!;
        if (ratio < bestRatio || (ratio === bestRatio && pattern < (best ?? "~"))) {
          best = pattern;
          bestRatio = ratio;
        }
      }
      if (best === null) break;
      const p = byPattern.get(best)!.shift()!;
      chosen.push(p);
      taken.add(p.slug);
      counts.set(best, (counts.get(best) ?? 0) + 1);
      got++;
    }
    return got;
  };

  let shortfall = 0;
  for (const d of DIFFICULTIES) shortfall += want[d] - pickFrom(d, want[d]);
  // A difficulty with too few problems hands its share to the others, medium first.
  for (const d of ["Medium", "Easy", "Hard"] as const) {
    if (shortfall <= 0) break;
    shortfall -= pickFrom(d, shortfall);
  }
  return chosen;
}

/* --------------------------------- the blueprint --------------------------------- */

export type DesignStatus = "new" | "studying" | "practised" | "mastered";

export interface BlueprintInput {
  profile: TierProfile;
  pool: readonly PoolProblem[];
  solved: ReadonlySet<string>;
  /** Every case in the catalogue, so pinned ones outside the tier's list still resolve. */
  cases: ReadonlyArray<{ slug: string; title: string }>;
  designStatus: Readonly<Record<string, DesignStatus>>;
  tracks: ReadonlyArray<{ id: string; name: string; total: number; ticked: number; next: { id: string; title: string; topicId: string; topicTitle: string } | null }>;
  pinnedDsa: readonly string[];
  pinnedDesign: readonly string[];
}

export interface BlueprintProblem extends PoolProblem {
  done: boolean;
  pinned: boolean;
}
export interface BlueprintCase {
  slug: string;
  title: string;
  status: DesignStatus;
  done: boolean;
  pinned: boolean;
}
export interface BlueprintArea {
  id: string;
  label: string;
  weight: number;
  done: number;
  total: number;
  pct: number;
}
export interface Blueprint {
  problems: BlueprintProblem[];
  cases: BlueprintCase[];
  /** Readiness per area, only for areas the tier cares about. */
  areas: BlueprintArea[];
  /** 0-100, weighted by the tier's area weights. */
  overall: number;
  byDifficulty: Record<Difficulty, { done: number; total: number }>;
}

const pct = (done: number, total: number) => (total <= 0 ? 0 : Math.round((100 * done) / total));
const isDone = (s: DesignStatus) => s === "practised" || s === "mastered";

export function buildBlueprint(input: BlueprintInput): Blueprint {
  const { profile } = input;
  const bySlug = new Map(input.pool.map((p) => [p.slug, p]));
  const pinnedDsa = new Set(input.pinnedDsa);
  const set = selectDsaSet(input.pool, profile);
  const slugs = new Set(set.map((p) => p.slug));
  // Pins join the set even when the tier wouldn't have picked them.
  const extra = input.pinnedDsa.flatMap((s) => (slugs.has(s) || !bySlug.has(s) ? [] : [bySlug.get(s)!]));
  const problems: BlueprintProblem[] = [...extra, ...set].map((p) => ({ ...p, done: input.solved.has(p.slug), pinned: pinnedDsa.has(p.slug) }));

  const caseTitle = new Map(input.cases.map((c) => [c.slug, c.title]));
  const pinnedDesign = new Set(input.pinnedDesign);
  const caseSlugs = [...input.pinnedDesign.filter((s) => caseTitle.has(s) && !profile.designCases.includes(s)), ...profile.designCases.filter((s) => caseTitle.has(s))];
  const cases: BlueprintCase[] = caseSlugs.map((slug) => {
    const status = input.designStatus[slug] ?? "new";
    return { slug, title: caseTitle.get(slug)!, status, done: isDone(status), pinned: pinnedDesign.has(slug) };
  });

  const byDifficulty = Object.fromEntries(DIFFICULTIES.map((d) => [d, { done: 0, total: 0 }])) as Blueprint["byDifficulty"];
  for (const p of problems) {
    byDifficulty[p.difficulty].total++;
    if (p.done) byDifficulty[p.difficulty].done++;
  }

  const areas: BlueprintArea[] = [];
  const addArea = (id: string, label: string, done: number, total: number) => {
    const weight = profile.weights[id] ?? 0;
    if (weight > 0 && total > 0) areas.push({ id, label, weight, done, total, pct: pct(done, total) });
  };
  addArea("dsa-problems", "DSA problems", problems.filter((p) => p.done).length, problems.length);
  addArea("design-cases", "System design cases", cases.filter((c) => c.done).length, cases.length);
  for (const t of input.tracks) addArea(t.id, t.name, t.ticked, t.total);

  const weightSum = areas.reduce((n, a) => n + a.weight, 0);
  const overall = weightSum === 0 ? 0 : Math.round(areas.reduce((n, a) => n + a.weight * a.pct, 0) / weightSum);
  return { problems, cases, areas, overall, byDifficulty };
}

/* ------------------------------------- gaps ------------------------------------- */

export interface Gap {
  key: string;
  title: string;
  note: string;
  path: string;
  minutes: number;
  boost: number;
}

const DSA_MINUTES: Record<Difficulty, number> = { Easy: 20, Medium: 35, Hard: 55 };
const GAPS_DSA = 4;
const GAPS_DESIGN = 2;
const GAPS_SUBJECTS = 2;

/**
 * What to do next for a target: its pinned items first, then the next unsolved problems (heaviest patterns
 * first), unfinished design cases, and the next unticked subtopic of the two subjects furthest behind.
 */
export function blueprintGaps(bp: Blueprint, input: BlueprintInput, ctx: { company: string; priority: TargetPriority }): Gap[] {
  const boost = PRIORITY_BOOST[ctx.priority];
  const out: Gap[] = [];
  const dsaGap = (p: BlueprintProblem): Gap => ({ key: `dsa:${p.slug}`, title: p.title, note: `${ctx.company} · ${p.difficulty}`, path: `/dsa/${p.slug}`, minutes: DSA_MINUTES[p.difficulty], boost: boost + (p.pinned ? PIN_BOOST : 0) });
  const caseGap = (c: BlueprintCase): Gap => ({ key: `design:${c.slug}`, title: c.title, note: `${ctx.company} · system design`, path: `/design/${c.slug}`, minutes: 45, boost: boost + (c.pinned ? PIN_BOOST : 0) });

  const openProblems = bp.problems.filter((p) => !p.done);
  const patternWeight = (p: BlueprintProblem) => input.profile.dsa.patterns[p.pattern] ?? 0;
  out.push(...openProblems.filter((p) => p.pinned).map(dsaGap));
  out.push(...bp.cases.filter((c) => !c.done && c.pinned).map(caseGap));
  out.push(
    ...openProblems
      .filter((p) => !p.pinned)
      .toSorted((a, b) => patternWeight(b) - patternWeight(a) || (a.tier === b.tier ? a.order - b.order : a.tier === "core" ? -1 : 1))
      .slice(0, GAPS_DSA)
      .map(dsaGap),
  );
  out.push(...bp.cases.filter((c) => !c.done && !c.pinned).slice(0, GAPS_DESIGN).map(caseGap));

  const trackById = new Map(input.tracks.map((t) => [t.id, t]));
  const behind = bp.areas
    .filter((a) => trackById.has(a.id) && trackById.get(a.id)!.next)
    .toSorted((a, b) => b.weight * (100 - b.pct) - a.weight * (100 - a.pct))
    .slice(0, GAPS_SUBJECTS);
  for (const a of behind) {
    const next = trackById.get(a.id)!.next!;
    out.push({ key: `sub:${next.id}`, title: next.title, note: `${ctx.company} · ${next.topicTitle}`, path: `/learn/${next.topicId}`, minutes: 25, boost });
  }
  return out;
}

/** The tier to plan around: the highest-priority target's, the earliest added winning ties. */
export function primaryTier(targets: ReadonlyArray<{ tier: TierId; priority: TargetPriority }>): TierId | null {
  const order = new Map(PRIORITIES.map((p, i) => [p, i]));
  return targets.toSorted((a, b) => order.get(a.priority)! - order.get(b.priority)!)[0]?.tier ?? null;
}

/** The ordinary backlog key a company gap stands for: `company:dsa:x` is `dsa:x`, `company:sub:t:0` is `theory:t:0`. */
export function underlyingKey(companyKey: string): string {
  const ref = companyKey.replace(/^company:/, "");
  return ref.startsWith("sub:") ? `theory:${ref.slice(4)}` : ref;
}

/**
 * A company gap for something already owed (the same problem, case or subtopic) doesn't become a second
 * backlog row: it boosts the existing one and names the company on it.
 */
export function mergeCompanyItems(base: readonly BacklogItem[], company: readonly BacklogItem[]): BacklogItem[] {
  const merged = base.map((i) => ({ ...i }));
  const byKey = new Map(merged.map((i) => [i.key, i]));
  const extra: BacklogItem[] = [];
  for (const c of company) {
    const hit = byKey.get(underlyingKey(c.key));
    if (!hit) {
      extra.push(c);
      continue;
    }
    hit.boost = Math.max(hit.boost ?? 0, c.boost ?? 0);
    const name = (c.note ?? "").split(" · ")[0];
    if (name && !(hit.note ?? "").includes(name)) hit.note = [hit.note, name].filter(Boolean).join(" · ");
  }
  return [...merged, ...extra];
}

/* ------------------------------- browsing the catalogue ------------------------------- */

export interface CatalogueFilter {
  query?: string;
  tier?: TierId | "all";
  region?: string | "all";
}

/** Companies matching a search (name or sector), a tier and a region; sorted by name. Pure. */
export function filterCompanies(companies: readonly Company[], f: CatalogueFilter): Company[] {
  const q = (f.query ?? "").trim().toLowerCase();
  return companies
    .filter((c) => (!f.tier || f.tier === "all" || c.tier === f.tier) && (!f.region || f.region === "all" || c.region === f.region))
    .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.sector ?? "").toLowerCase().includes(q))
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

/** Distinct regions in the catalogue, most common first. */
export function catalogueRegions(companies: readonly Company[]): string[] {
  const n = new Map<string, number>();
  for (const c of companies) if (c.region) n.set(c.region, (n.get(c.region) ?? 0) + 1);
  return [...n].toSorted((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([r]) => r);
}
