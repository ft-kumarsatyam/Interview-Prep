import { z } from "zod";
import { ASK_SUBJECTS, checkGeminiLink, isAskSubject } from "./ask-subjects";
import { isDateStr, type DateStr } from "./dates";
import { validatePlanSpan } from "./planner-profile";

const date = z.string().refine(isDateStr, "Use YYYY-MM-DD");
const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export const MAX_NEWS_QUERIES = 12;
export const MAX_REST_DAYS = 60;

export const settingsInputSchema = z
  .object({
    startDate: date,
    endDate: date,
    quizPassPct: int(40, 100),
    topicMasteryPct: int(50, 100),
    minDailyDsa: int(0, 10),
    maxDailyDsa: int(1, 15),
    maxSaturdayDsa: int(0, 15),
    maxDailyTheory: int(1, 10),
    revisionWeeks: int(0, 8),
    restDays: z.array(date).max(MAX_REST_DAYS),
    /** Subject id -> Gemini project link (blank removes it). Only https links on Google AI hosts. */
    geminiLinks: z
      .record(z.string(), z.string().max(500))
      .optional()
      .superRefine((links, ctx) => {
        for (const [subject, value] of Object.entries(links ?? {})) {
          if (!isAskSubject(subject)) ctx.addIssue({ code: "custom", path: [subject], message: `Unknown subject (use ${ASK_SUBJECTS.map((s) => s.id).join(", ")})` });
          else {
            const check = checkGeminiLink(value);
            if (!check.ok) ctx.addIssue({ code: "custom", path: [subject], message: check.error });
          }
        }
      }),
    llmPaidEnabled: z.boolean().optional(),
    llmPaidDailyCap: int(0, 200).optional(),
    llmPaidRequireConfirm: z.boolean().optional(),
    /** Weekly mock days, 0 = Sunday … 6 = Saturday. Never affect the streak. */
    mockDsaWeekday: int(0, 6).optional(),
    mockHldWeekday: int(0, 6).optional(),
    /** Study hours per day of week, Sunday first. 0 = nothing planned beyond the fixed blocks. */
    hoursByDow: z.array(z.coerce.number().min(0).max(12)).length(7).optional(),
    /** Null resets to the defaults in data/news-sources.json. */
    googleNewsQueries: z.array(z.string().trim().min(2).max(80)).max(MAX_NEWS_QUERIES).nullable(),
    leetcodeUsername: z
      .string()
      .trim()
      .transform((v) => v.replace(/^@/, ""))
      .refine((v) => v === "" || /^[\w-]{1,40}$/.test(v), "Letters, digits, _ and - only")
      .transform((v) => v || null),
  })
  .superRefine((s, ctx) => {
    // The same span rule the planner uses; the "must be in the future" half lives where the date is edited (the Planner).
    const problem = validatePlanSpan(s.startDate, s.endDate);
    if (problem) ctx.addIssue({ code: "custom", path: ["endDate"], message: problem });
  })
  .refine((s) => s.minDailyDsa <= s.maxDailyDsa, { path: ["minDailyDsa"], message: "Min can't exceed max" });

export type SettingsInput = z.infer<typeof settingsInputSchema>;

/**
 * Rest days on or before today are frozen: those days are already planned or
 * settled, so changing them would rewrite the streak. Only future days move.
 */
export function mergeRestDays(existing: readonly DateStr[], requested: readonly DateStr[], today: DateStr): DateStr[] {
  const locked = existing.filter((d) => d <= today);
  const future = requested.filter((d) => d > today);
  return [...new Set([...locked, ...future])].toSorted();
}

/** Keyword list equal to the defaults is stored as null so future default changes still apply. */
export function normaliseQueries(queries: readonly string[] | null, defaults: readonly string[]): string[] | null {
  if (!queries) return null;
  const unique = [...new Set(queries.map((q) => q.trim()).filter(Boolean))];
  if (unique.length === 0) return null;
  const same = unique.length === defaults.length && unique.every((q, i) => q === defaults[i]);
  return same ? null : unique;
}

/**
 * Settings are saved a section at a time, so one invalid field can't block unrelated changes.
 * Cross-field rules (start < end, min <= max) only ever involve fields inside one section.
 */
export const SETTINGS_SECTION_KEYS = {
  plan: ["startDate", "endDate", "revisionWeeks", "restDays", "hoursByDow"],
  targets: ["quizPassPct", "topicMasteryPct", "minDailyDsa", "maxDailyDsa", "maxSaturdayDsa", "maxDailyTheory", "mockDsaWeekday", "mockHldWeekday"],
  integrations: ["leetcodeUsername", "googleNewsQueries", "geminiLinks"],
  ai: ["llmPaidEnabled", "llmPaidDailyCap", "llmPaidRequireConfirm"],
} as const satisfies Record<string, readonly (keyof SettingsInput)[]>;

export type SettingsSectionId = keyof typeof SETTINGS_SECTION_KEYS;
export const SETTINGS_SECTION_IDS = Object.keys(SETTINGS_SECTION_KEYS) as SettingsSectionId[];

export const SETTINGS_SECTION_LABEL: Record<SettingsSectionId, string> = {
  plan: "Plan window and hours",
  targets: "Daily targets and mocks",
  integrations: "LeetCode, news and Gemini",
  ai: "Paid AI fallback",
};

/** The section a validation path (e.g. "geminiLinks.dsa", "hoursByDow.3") belongs to. */
export function sectionOfPath(path: string): SettingsSectionId | undefined {
  const key = path.split(".")[0];
  return SETTINGS_SECTION_IDS.find((id) => (SETTINGS_SECTION_KEYS[id] as readonly string[]).includes(key));
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Sections where at least one field differs. */
export function changedSections(next: Readonly<Record<string, unknown>>, base: Readonly<Record<string, unknown>>): SettingsSectionId[] {
  return SETTINGS_SECTION_IDS.filter((id) => (SETTINGS_SECTION_KEYS[id] as readonly string[]).some((k) => !same(next[k], base[k])));
}

/** `base` with only the given sections' fields replaced by `next`'s. */
export function mergeSections<T extends Record<string, unknown>>(base: T, next: Readonly<Record<string, unknown>>, sections: readonly SettingsSectionId[]): T {
  const out: Record<string, unknown> = { ...base };
  for (const id of sections) for (const k of SETTINGS_SECTION_KEYS[id]) if (k in next) out[k] = next[k];
  return out as T;
}
