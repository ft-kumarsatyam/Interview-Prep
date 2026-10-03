import { z } from "zod";
import { ASK_SUBJECTS, checkGeminiLink, isAskSubject } from "./ask-subjects";
import { diffDays, isDateStr, type DateStr } from "./dates";

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
  .refine((s) => s.startDate < s.endDate, { path: ["endDate"], message: "End date must be after the start date" })
  .refine((s) => diffDays(s.endDate, s.startDate) <= 400, { path: ["endDate"], message: "Keep the plan under 400 days" })
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
