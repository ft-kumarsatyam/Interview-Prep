import { z } from "zod";
import { diffDays, isDateStr, type DateStr } from "./dates";
import type { PlanSettings } from "./plan-config";

export const PRIORITIES = [
  { id: "dsa", label: "DSA" },
  { id: "backend", label: "Backend" },
  { id: "js-ts", label: "JavaScript / TypeScript" },
  { id: "sql", label: "SQL & databases" },
  { id: "system-design", label: "System design" },
  { id: "lld", label: "Low-level design" },
  { id: "core-cs", label: "Core CS (OS, DBMS, networks)" },
  { id: "mock-interviews", label: "Mock interviews" },
  { id: "aptitude", label: "Aptitude & reasoning" },
] as const;
export type PriorityId = (typeof PRIORITIES)[number]["id"];
const PRIORITY_IDS = PRIORITIES.map((p) => p.id) as [PriorityId, ...PriorityId[]];

export const LANGUAGES = ["javascript", "typescript", "python"] as const;

export interface PlannerProfile {
  targetRole: string;
  targetCompany: string;
  preferredLanguage: (typeof LANGUAGES)[number];
  priorities: PriorityId[];
}

export const DEFAULT_PROFILE: PlannerProfile = {
  targetRole: "Backend engineer",
  targetCompany: "",
  preferredLanguage: "javascript",
  priorities: ["dsa", "backend", "system-design", "sql"],
};

export const plannerInputSchema = z
  .object({
    targetRole: z.string().trim().max(80),
    targetCompany: z.string().trim().max(80),
    preferredLanguage: z.enum(LANGUAGES),
    priorities: z.array(z.enum(PRIORITY_IDS)).min(1, "Pick at least one focus area").max(PRIORITIES.length),
    /** The interview date: the plan's end. */
    endDate: z.string().refine(isDateStr, "Use YYYY-MM-DD"),
    /** Study hours per day of week, Sunday first. */
    hoursByDow: z.array(z.coerce.number().min(0).max(12)).length(7),
  })
  .transform((v) => ({ ...v, priorities: [...new Set(v.priorities)] }));

export type PlannerInput = z.infer<typeof plannerInputSchema>;

/** The one rule for how long a plan may be: the interview date comes after the start and within 400 days of it. Returns an error message, or null. */
export function validatePlanSpan(startDate: DateStr, endDate: DateStr): string | null {
  if (endDate <= startDate) return "The interview date must be after the plan start";
  if (diffDays(endDate, startDate) > 400) return "Keep the plan under 400 days";
  return null;
}

/** The planner's rule for an interview date: a valid span (see `validatePlanSpan`) that is still in the future. Returns an error message, or null. */
export function validatePlannerWindow(input: Pick<PlannerInput, "endDate">, settings: Pick<PlanSettings, "startDate">, today: DateStr): string | null {
  const span = validatePlanSpan(settings.startDate, input.endDate);
  if (span) return span;
  if (input.endDate <= today) return "The interview date must be in the future";
  return null;
}

/** Weekly capacity in hours, from the per-day hours. */
export const weeklyHours = (hoursByDow: readonly number[]): number => Math.round(hoursByDow.reduce((a, b) => a + b, 0) * 10) / 10;
