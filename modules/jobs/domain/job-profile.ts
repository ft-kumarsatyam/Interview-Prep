/**
 * Job-search profiles: several named searches ("Backend, Bengaluru", "Remote fintech") instead of one global
 * preference set. A profile is the same preferences the scorer already understands plus the filters a person
 * actually uses: years of experience, words a job must (or must not) mention. Pure and deterministic.
 */
import { z } from "zod";
import { jobPrefsSchema, matchPosting, type JobPrefs, type Match, type MatchContext, type ScorablePosting } from "@/modules/jobs/domain/job-match";

export const MAX_PROFILES = 8;
const list = (maxLen: number, maxItems: number) => z.array(z.string().trim().min(1).max(maxLen)).max(maxItems).default([]);

export const jobProfileSchema = jobPrefsSchema.extend({
  name: z.string().trim().min(1, "Give the profile a name").max(40),
  /** Your years of experience. Jobs that ask for clearly more are hidden. Null means no experience filter. */
  experienceYears: z.number().min(0).max(40).nullable().default(null),
  /** Every one of these must appear in the title, team or skills of the job. */
  mustKeywords: list(40, 10),
  /** None of these may appear. */
  excludeKeywords: list(40, 10),
  enabled: z.boolean().default(true),
});
export type JobProfile = z.infer<typeof jobProfileSchema>;
export type JobProfileInput = z.input<typeof jobProfileSchema>;

/** How many more years than yours a job may ask for before it is hidden. */
export const EXPERIENCE_SLACK = 1;

const WORD_NUM = "(\\d{1,2})";
const RANGE = new RegExp(`\\b${WORD_NUM}\\s*(?:-|–|to)\\s*${WORD_NUM}\\+?\\s*(?:years?|yrs?)\\b`, "i");
const SINGLE = new RegExp(`\\b${WORD_NUM}\\s*\\+?\\s*(?:years?|yrs?)\\b(?:\\s+of)?(?:\\s+(?:relevant|professional|hands[- ]on|industry|work|software|engineering|backend|development|experience))`, "i");
const MINIMUM = new RegExp(`(?:minimum|at least|min\\.?)\\s*(?:of\\s*)?${WORD_NUM}\\s*\\+?\\s*(?:years?|yrs?)\\b`, "i");

/** The minimum years of experience a posting asks for, or null when it doesn't say ("3-5 years" -> 3, "5+ years of experience" -> 5). */
export function requiredYears(text: string): number | null {
  const range = RANGE.exec(text);
  if (range) {
    const lo = Number(range[1]);
    if (lo <= 40) return lo;
  }
  for (const re of [MINIMUM, SINGLE]) {
    const m = re.exec(text);
    if (m) {
      const n = Number(m[1]);
      if (n <= 40) return n;
    }
  }
  return null;
}

/** A job ("Senior" titles) that asks for far more than you have, from its years or its title. */
export function experienceFit(profile: Pick<JobProfile, "experienceYears">, yearsMin: number | null): boolean {
  if (profile.experienceYears === null || yearsMin === null) return true;
  return yearsMin <= profile.experienceYears + EXPERIENCE_SLACK;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#. ]+/g, " ").replace(/\s+/g, " ").trim();

export interface ProfilePosting extends ScorablePosting {
  department?: string;
  /** Minimum years the description asks for, stored at sync time. */
  yearsMin?: number | null;
}

/** Why a posting is filtered out by the profile's hard rules, or null when it passes. */
export function profileRejection(p: ProfilePosting, profile: JobProfile): string | null {
  const hay = ` ${norm([p.title, p.department ?? "", ...p.terms].join(" "))} `;
  const has = (k: string) => hay.includes(` ${norm(k)} `) || hay.includes(norm(k));
  for (const k of profile.excludeKeywords) if (norm(k) && has(k)) return `Mentions “${k}”, which you excluded`;
  for (const k of profile.mustKeywords) if (norm(k) && !has(k)) return `Doesn't mention “${k}”`;
  if (!experienceFit(profile, p.yearsMin ?? null)) return `Asks for ${p.yearsMin}+ years, you have ${profile.experienceYears}`;
  return null;
}

/** Scores a posting for one profile: the usual match with the profile as the preferences, then the profile's hard filters. */
export function matchProfile(p: ProfilePosting, ctx: Omit<MatchContext, "prefs">, profile: JobProfile): Match {
  const rejection = profileRejection(p, profile);
  if (rejection) return { score: 0, reasons: [rejection], matched: [], missing: [], excluded: true };
  const prefs: JobPrefs = profile;
  const m = matchPosting(p, { ...ctx, prefs });
  if (m.excluded) return m;
  const extra: string[] = [];
  if (profile.mustKeywords.length) extra.push(`Has ${profile.mustKeywords.join(", ")}`);
  if (profile.experienceYears !== null && p.yearsMin != null) extra.push(`Asks for ${p.yearsMin}+ years`);
  return { ...m, reasons: [...m.reasons, ...extra] };
}

/** The best score across the profiles that accept a posting (alerts use this), or null when none does. */
export function bestProfileMatch(p: ProfilePosting, ctx: Omit<MatchContext, "prefs">, profiles: readonly JobProfile[]): { profile: JobProfile; match: Match } | null {
  let best: { profile: JobProfile; match: Match } | null = null;
  for (const profile of profiles) {
    if (!profile.enabled) continue;
    const match = matchProfile(p, ctx, profile);
    if (match.excluded || match.score < profile.minScore) continue;
    if (!best || match.score > best.match.score) best = { profile, match };
  }
  return best;
}
