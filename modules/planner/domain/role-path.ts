/**
 * Role paths (data/roles.json): a role says what to study first and what runs side by side
 * ("language practice + DSA together", "LLD before HLD"). Pure: it turns a role into a week for
 * each topic. Without a role the plan keeps the syllabus weeks, so choosing one is opt-in.
 */
import { z } from "zod";

export const LANE_KINDS = ["language", "dsa", "backend", "db", "oop", "lld", "hld", "cs", "ai", "behavioral"] as const;
export const MAX_PLAN_WEEK = 24;

const weekSpan = z
  .tuple([z.number().int().min(1).max(MAX_PLAN_WEEK), z.number().int().min(1).max(MAX_PLAN_WEEK)])
  .refine(([a, b]) => a <= b, "a lane can't end before it starts");

export const roleLaneSchema = z.object({
  label: z.string().min(2).max(60),
  kind: z.enum(LANE_KINDS),
  weeks: weekSpan,
  /** Topic ids in study order. They are spread evenly over the lane's weeks. */
  topics: z.array(z.string().min(1)).min(1),
});

export const roleSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(2).max(60),
  blurb: z.string().min(10).max(200),
  audience: z.string().min(2).max(80),
  phases: z
    .array(z.object({ title: z.string().min(2).max(80), outcome: z.string().min(5).max(160), lanes: z.array(roleLaneSchema).min(1) }))
    .min(1),
  /** Lane-kind pairs [a, b]: every topic of `a` is scheduled no later than any topic of `b`. */
  before: z.array(z.tuple([z.enum(LANE_KINDS), z.enum(LANE_KINDS)])),
  /** Lane-kind pairs whose week ranges must overlap (they run side by side). */
  together: z.array(z.tuple([z.enum(LANE_KINDS), z.enum(LANE_KINDS)])),
});

export const rolesFileSchema = z.object({ roles: z.array(roleSchema).min(1) });

export type RoleLane = z.infer<typeof roleLaneSchema>;
export type RoleDef = z.infer<typeof roleSchema>;

/** The week each topic is studied in under this role. Topic i of n in a lane takes week a + floor(i * span / n). */
export function roleWeekMap(role: RoleDef): Map<string, number> {
  const weeks = new Map<string, number>();
  for (const phase of role.phases) {
    for (const lane of phase.lanes) {
      const [from, to] = lane.weeks;
      const span = to - from + 1;
      lane.topics.forEach((id, i) => weeks.set(id, from + Math.floor((i * span) / lane.topics.length)));
    }
  }
  return weeks;
}

/** Problems with a role against the syllabus; empty when it is sound. */
export function roleProblems(role: RoleDef, topicIds: readonly string[]): string[] {
  const problems: string[] = [];
  const known = new Set(topicIds);
  const seen = new Set<string>();
  for (const phase of role.phases) {
    for (const lane of phase.lanes) {
      for (const id of lane.topics) {
        if (!known.has(id)) problems.push(`${id}: no such topic`);
        if (seen.has(id)) problems.push(`${id}: in more than one lane`);
        seen.add(id);
      }
    }
  }
  for (const id of topicIds) if (!seen.has(id)) problems.push(`${id}: not placed in any lane`);

  const weeks = roleWeekMap(role);
  const lanes = role.phases.flatMap((p) => p.lanes);
  const kindWeeks = (kind: string) => lanes.filter((l) => l.kind === kind).flatMap((l) => l.topics.map((id) => weeks.get(id) ?? 0));
  for (const [a, b] of role.before) {
    const wa = kindWeeks(a);
    const wb = kindWeeks(b);
    if (wa.length && wb.length && Math.max(...wa) > Math.min(...wb)) problems.push(`${a} must come before ${b}`);
  }
  const range = (kind: string) => {
    const w = kindWeeks(kind);
    return w.length ? ([Math.min(...w), Math.max(...w)] as const) : null;
  };
  for (const [a, b] of role.together) {
    const ra = range(a);
    const rb = range(b);
    if (ra && rb && (ra[1] < rb[0] || rb[1] < ra[0])) problems.push(`${a} and ${b} must run side by side`);
  }
  return problems;
}

export interface PathPhaseView {
  title: string;
  outcome: string;
  fromWeek: number;
  toWeek: number;
  lanes: Array<{ label: string; kind: RoleLane["kind"]; fromWeek: number; toWeek: number; topicCount: number }>;
}

/** The role as a timeline: phases in start order, each with the lanes that run side by side. */
export function rolePathView(role: RoleDef): PathPhaseView[] {
  return role.phases
    .map((p) => {
      const lanes = p.lanes
        .map((l) => ({ label: l.label, kind: l.kind, fromWeek: l.weeks[0], toWeek: l.weeks[1], topicCount: l.topics.length }))
        .toSorted((a, b) => a.fromWeek - b.fromWeek || a.toWeek - b.toWeek);
      return { title: p.title, outcome: p.outcome, fromWeek: Math.min(...lanes.map((l) => l.fromWeek)), toWeek: Math.max(...lanes.map((l) => l.toWeek)), lanes };
    })
    .toSorted((a, b) => a.fromWeek - b.fromWeek);
}

/** A subtopic's week and position under a role; unchanged when no role (or an unplaced topic) applies. */
export function rolePlacement(weeks: ReadonlyMap<string, number> | null, topicId: string, week: number, position: number): { week: number; position: number } {
  const w = weeks?.get(topicId);
  return w === undefined ? { week, position } : { week: w, position: w * 100_000 + position };
}
