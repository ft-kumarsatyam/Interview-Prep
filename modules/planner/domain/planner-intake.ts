import { z } from "zod";
import { isDateStr } from "@/core/domain/dates";

export const LEVELS = ["fresher", "1-3y", "3y+"] as const;
export type Level = (typeof LEVELS)[number];

export const TIERS = ["must", "nice", "skip"] as const;
export type Tier = (typeof TIERS)[number];

export const INTAKE_STEPS = ["goals", "ratings", "availability"] as const;
export type IntakeStep = (typeof INTAKE_STEPS)[number];

export const INTAKE_VERSION = 1;
const MAX_OVERRIDES = 20;

const dateStr = z.string().refine(isDateStr, "Use YYYY-MM-DD");

export const topicRatingSchema = z.object({
  topicId: z.string().trim().min(1).max(80),
  rating: z.number().int().min(1).max(5),
  wantToLearn: z.boolean().default(false),
  tier: z.enum(TIERS).default("must"),
  /** 0-100, set by the diagnostic quiz. Never entered by hand. */
  diagnosticScore: z.number().min(0).max(100).nullable().default(null),
});
export type TopicRating = z.infer<typeof topicRatingSchema>;

export const availabilityOverrideSchema = z
  .object({ from: dateStr, to: dateStr, hours: z.coerce.number().min(0.5).max(12) })
  .refine((o) => o.from <= o.to, "The end of a range can't be before its start");
export type AvailabilityOverride = z.infer<typeof availabilityOverrideSchema>;

const goalsStep = z.object({
  step: z.literal("goals"),
  targetRole: z.string().trim().min(1, "Enter a target role").max(80),
  /** A role path from data/roles.json that orders the plan; empty keeps the standard order. */
  roleId: z.string().trim().max(40).default(""),
  targetCompany: z.string().trim().max(80),
  level: z.enum(LEVELS),
  focusNotes: z.string().trim().max(300),
  interviewDate: dateStr,
});

const ratingsStep = z.object({
  step: z.literal("ratings"),
  ratings: z
    .array(topicRatingSchema.omit({ diagnosticScore: true }))
    .max(500)
    .refine((rs) => new Set(rs.map((r) => r.topicId)).size === rs.length, "Each topic can be rated once"),
});

const availabilityStep = z.object({
  step: z.literal("availability"),
  /** Study hours per day of week, Sunday first. Rest days stay in Settings. */
  hoursByDow: z.array(z.coerce.number().min(0).max(12)).length(7),
  overrides: z
    .array(availabilityOverrideSchema)
    .max(MAX_OVERRIDES)
    .refine(
      (os) => os.every((a, i) => os.every((b, j) => i === j || a.to < b.from || b.to < a.from)),
      "Date ranges can't overlap",
    ),
});

export const intakeStepSchema = z.discriminatedUnion("step", [goalsStep, ratingsStep, availabilityStep]);
export type IntakeStepInput = z.infer<typeof intakeStepSchema>;

export interface IntakeState {
  goals: { targetRole: string; roleId: string; targetCompany: string; level: Level; focusNotes: string };
  interviewDate: string | null;
  ratings: TopicRating[];
  availability: { hoursByDow: number[]; overrides: AvailabilityOverride[] };
  stepsDone: IntakeStep[];
  completedAt: Date | null;
}

const BASE_WEIGHT: Record<number, number> = { 1: 1.5, 2: 1.25, 3: 1, 4: 0.75, 5: 0.5 };
const NICE_FACTOR = 0.6;
const WANT_FACTOR = 1.25;

/** How much study time a topic gets relative to a neutral one (1). Skipped topics get none; weaker or wanted topics get more. */
export function ratingToWeight(rating: number, tier: Tier, wantToLearn = false): number {
  if (tier === "skip") return 0;
  const base = BASE_WEIGHT[Math.min(5, Math.max(1, Math.round(rating)))] ?? 1;
  const w = base * (tier === "nice" ? NICE_FACTOR : 1) * (wantToLearn ? WANT_FACTOR : 1);
  return Math.round(w * 1000) / 1000;
}

export const missingSteps = (done: readonly IntakeStep[]): IntakeStep[] => INTAKE_STEPS.filter((s) => !done.includes(s));
export const isIntakeComplete = (s: Pick<IntakeState, "stepsDone" | "completedAt">): boolean => !!s.completedAt && missingSteps(s.stepsDone).length === 0;

/** Merges a step's diagnostic scores back into ratings. A rating that was edited keeps its score only if the topic is unchanged. */
export function mergeRatings(saved: readonly TopicRating[], incoming: readonly Omit<TopicRating, "diagnosticScore">[]): TopicRating[] {
  const score = new Map(saved.map((r) => [r.topicId, r.diagnosticScore]));
  return incoming.map((r) => ({ ...r, diagnosticScore: score.get(r.topicId) ?? null }));
}
