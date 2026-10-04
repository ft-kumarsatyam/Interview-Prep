/**
 * Matching discovered jobs to what you are looking for. Deterministic and explainable: every point comes
 * from something you can see (the title, your preferences, your resume's skills, the place, the company,
 * how fresh it is), and the reasons are returned with the score. No model is involved. Pure.
 */
import { z } from "zod";
import { spellingsOf } from "@/modules/jobs/domain/ats";

export const LEVELS = ["any", "entry", "mid", "senior"] as const;
export type JobLevel = (typeof LEVELS)[number];
export const LEVEL_LABEL: Record<JobLevel, string> = { any: "Any level", entry: "Entry / graduate", mid: "Mid level", senior: "Senior and above" };

const list = (maxLen: number, maxItems: number) => z.array(z.string().trim().min(1).max(maxLen)).max(maxItems).default([]);
export const jobPrefsSchema = z.object({
  roles: list(60, 8),
  locations: list(60, 8),
  remoteOk: z.boolean().default(true),
  level: z.enum(LEVELS).default("any"),
  tiers: list(40, 8),
  excludeCompanies: list(80, 20),
  /** Only postings at or above this score trigger an alert. */
  minScore: z.number().int().min(0).max(100).default(60),
});
export type JobPrefs = z.infer<typeof jobPrefsSchema>;
export const DEFAULT_PREFS: JobPrefs = jobPrefsSchema.parse({});

/** Splits a "one, per, line" or comma list into clean, de-duplicated items. */
export function splitList(raw: string, maxItems = 20): string[] {
  return [...new Set(raw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean))].slice(0, maxItems);
}

const ENTRY = /\b(intern|internship|graduate|new grad|fresher|entry[- ]level|junior|jr\.?|trainee|apprentice|associate|sde[- ]?1|sde i\b|engineer i\b|level 1)\b/i;
const SENIOR = /\b(senior|sr\.?|staff|principal|lead|head of|manager|director|vp|architect|distinguished|sde[- ]?3|sde iii|engineer iii|iv)\b/i;

export function levelOf(title: string): Exclude<JobLevel, "any"> {
  if (SENIOR.test(title)) return "senior";
  if (ENTRY.test(title)) return "entry";
  return "mid";
}

const ORDER: Record<Exclude<JobLevel, "any">, number> = { entry: 0, mid: 1, senior: 2 };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#. ]+/g, " ").replace(/\s+/g, " ").trim();
const STOP = new Set(["and", "or", "the", "of", "in", "for", "a", "an", "to", "engineer", "developer", "software"]);

/** How well the title fits one role you typed ("backend", "full stack developer"): the share of its meaningful words found in the title, with the generic ones counting less. */
export function roleFit(title: string, role: string): number {
  const t = norm(title);
  const words = norm(role).split(" ").filter(Boolean);
  if (words.length === 0) return 0;
  if (t.includes(norm(role))) return 1;
  const strong = words.filter((w) => !STOP.has(w));
  const weak = words.filter((w) => STOP.has(w));
  const has = (w: string) => new RegExp(`\\b${w.replace(/[.+#]/g, "\\$&")}`).test(t);
  const sCount = strong.filter(has).length;
  const wCount = weak.filter(has).length;
  if (strong.length === 0) return wCount / words.length;
  if (sCount === 0) return 0;
  return Math.min(1, (sCount + 0.4 * wCount) / (strong.length + 0.4 * weak.length));
}

export interface ScorablePosting {
  title: string;
  company: string;
  location: string;
  remote: boolean | null;
  postedAt: string | Date | null;
  tier: string;
  /** Canonical skill terms found in the title and description (computed when the posting is stored). */
  terms: readonly string[];
}

export interface MatchContext {
  prefs: JobPrefs;
  /** Canonical terms your resume mentions; null when no resume is saved yet. */
  resumeTerms: ReadonlySet<string> | null;
  /** Companies you target (names), for the boost. */
  targetNames: readonly string[];
  now: Date;
}

export interface Match {
  /** 0-100. */
  score: number;
  reasons: string[];
  /** Skills the job mentions that your resume also has. */
  matched: string[];
  /** Skills the job mentions that your resume lacks. */
  missing: string[];
  excluded: boolean;
}

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const ageDays = (p: ScorablePosting["postedAt"], now: Date) => (p ? Math.max(0, (now.getTime() - new Date(p).getTime()) / 86_400_000) : null);

export function matchPosting(p: ScorablePosting, ctx: MatchContext): Match {
  const { prefs } = ctx;
  const reasons: string[] = [];
  if (prefs.excludeCompanies.some((c) => key(c) && key(p.company).includes(key(c)))) return { score: 0, reasons: ["Company is on your exclude list"], matched: [], missing: [], excluded: true };

  let score = 0;

  // Title fit (35)
  if (prefs.roles.length === 0) score += 17;
  else {
    const best = Math.max(...prefs.roles.map((r) => roleFit(p.title, r)));
    score += Math.round(35 * best);
    if (best >= 0.99) reasons.push("Title matches a role you want");
    else if (best >= 0.5) reasons.push("Title partly matches a role you want");
    else reasons.push("Title doesn't match your roles");
  }

  // Skills (25)
  const matched = ctx.resumeTerms ? p.terms.filter((t) => ctx.resumeTerms!.has(t)) : [];
  const missing = ctx.resumeTerms ? p.terms.filter((t) => !ctx.resumeTerms!.has(t)) : [];
  if (!ctx.resumeTerms) score += 12;
  else if (p.terms.length < 3) score += 12;
  else {
    score += Math.round(25 * (matched.length / p.terms.length));
    reasons.push(`Your resume covers ${matched.length} of ${p.terms.length} skills it mentions`);
  }

  // Place (15)
  const loc = norm(p.location);
  const inPlace = prefs.locations.some((l) => loc.includes(norm(l)));
  if (p.remote === true && prefs.remoteOk) {
    score += 15;
    reasons.push("Remote");
  } else if (prefs.locations.length === 0) score += 10;
  else if (inPlace) {
    score += 15;
    reasons.push("In a place you want");
  } else reasons.push("Not in your places");

  // Level (10)
  if (prefs.level === "any") score += 7;
  else {
    const gap = Math.abs(ORDER[levelOf(p.title)] - ORDER[prefs.level]);
    score += gap === 0 ? 10 : gap === 1 ? 4 : 0;
    if (gap === 0) reasons.push("Right level");
    else if (gap > 1) reasons.push("Level is far from yours");
  }

  // Company (10)
  const target = ctx.targetNames.some((n) => key(n) && (key(p.company).includes(key(n)) || key(n).includes(key(p.company))));
  if (target) {
    score += 10;
    reasons.push("A company you are targeting");
  } else if (prefs.tiers.length === 0 || prefs.tiers.includes(p.tier)) score += 5;

  // Freshness (5)
  const age = ageDays(p.postedAt, ctx.now);
  if (age !== null) {
    if (age <= 3) {
      score += 5;
      reasons.push("Posted in the last 3 days");
    } else if (age <= 14) score += 3;
    else if (age <= 30) score += 1;
  }

  return { score: Math.max(0, Math.min(100, score)), reasons, matched, missing, excluded: false };
}

/* ------------------------------ showing a job description ------------------------------ */

export interface Segment {
  text: string;
  mark?: "have" | "lack";
}

/**
 * Splits a job description into plain and highlighted pieces: skills your resume has are marked "have",
 * the ones it lacks "lack". Rendered as React text nodes (never HTML), so a hostile description can't inject anything.
 */
export function highlightSegments(text: string, have: ReadonlySet<string>, lack: ReadonlySet<string>): Segment[] {
  const spell = new Map<string, "have" | "lack">();
  for (const t of have) for (const s of spellingsOf(t)) spell.set(s.toLowerCase(), "have");
  for (const t of lack) for (const s of spellingsOf(t)) if (!spell.has(s.toLowerCase())) spell.set(s.toLowerCase(), "lack");
  if (spell.size === 0) return [{ text }];
  const alt = [...spell.keys()].toSorted((a, b) => b.length - a.length).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(?<![\\w+#.])(${alt.join("|")})(?![\\w+#]|\\.\\w)`, "gi");
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: text.slice(last, i) });
    out.push({ text: m[0], mark: spell.get(m[0].toLowerCase()) ?? "lack" });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
