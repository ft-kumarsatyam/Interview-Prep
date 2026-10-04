import { companyById, problems, subtopics, systemDesign, tierById, tracks } from "@/lib/content";
import { connectDb } from "@/lib/db";
import {
  blueprintGaps,
  buildBlueprint,
  isPriority,
  isTierId,
  type Blueprint,
  type BlueprintInput,
  type Gap,
  type PoolProblem,
  type TargetPriority,
  type TierId,
  type TierProfile,
} from "@/lib/domain/companies";
import { SubtopicProgress, ProblemProgress } from "@/lib/models/progress";
import { Target, type TargetDoc } from "@/lib/models/targets";
import { getDesignOverview } from "./designs";

export const MAX_TARGETS = 8;

export interface TargetDto {
  id: string;
  companyId: string | null;
  name: string;
  tier: TierId;
  priority: TargetPriority;
  interviewDate: string | null;
  notes: string;
  pinnedDsa: string[];
  pinnedDesign: string[];
}

const toDto = (d: TargetDoc & { _id: unknown }): TargetDto => ({
  id: String(d._id),
  companyId: d.companyId ?? null,
  name: d.name,
  tier: d.tier as TierId,
  priority: (d.priority as TargetPriority) ?? "target",
  interviewDate: d.interviewDate ?? null,
  notes: d.notes ?? "",
  pinnedDsa: d.pinnedDsa ?? [],
  pinnedDesign: d.pinnedDesign ?? [],
});

const PRIORITY_ORDER = { dream: 0, target: 1, safe: 2 } as const;

export async function listTargets(): Promise<TargetDto[]> {
  await connectDb();
  const docs = await Target.find({}).sort({ createdAt: 1 }).lean();
  return docs.map(toDto).toSorted((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

export async function getTarget(id: string): Promise<TargetDto | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  await connectDb();
  const d = await Target.findById(id).lean();
  return d ? toDto(d) : null;
}

export type AddTargetInput = { companyId?: string | null; name?: string; tier?: TierId; priority?: TargetPriority; interviewDate?: string | null };

/** Adds a company from the catalogue (its tier comes with it) or a custom name with a tier. */
export async function addTarget(input: AddTargetInput): Promise<TargetDto> {
  const catalogued = input.companyId ? companyById.get(input.companyId) : undefined;
  if (input.companyId && !catalogued) throw new Error("Unknown company");
  const name = (catalogued?.name ?? input.name ?? "").trim();
  const tier = input.tier ?? catalogued?.tier;
  if (!name) throw new Error("Enter a company name");
  if (!tier || !isTierId(tier)) throw new Error("Pick the kind of company");
  const priority = input.priority ?? "target";
  if (!isPriority(priority)) throw new Error("Unknown priority");
  await connectDb();
  const existing = await Target.find({}, { name: 1 }).lean();
  if (existing.length >= MAX_TARGETS) throw new Error(`Up to ${MAX_TARGETS} targets. Remove one first.`);
  if (existing.some((t) => t.name.toLowerCase() === name.toLowerCase())) throw new Error(`${name} is already a target`);
  const doc = await Target.create({ companyId: catalogued?.id ?? null, name, tier, priority, interviewDate: input.interviewDate ?? null });
  return toDto(doc.toObject());
}

export type UpdateTargetInput = { tier?: TierId; priority?: TargetPriority; interviewDate?: string | null; notes?: string };

export async function updateTarget(id: string, patch: UpdateTargetInput): Promise<void> {
  await connectDb();
  const set: Record<string, unknown> = {};
  if (patch.tier !== undefined) set.tier = patch.tier;
  if (patch.priority !== undefined) set.priority = patch.priority;
  if (patch.interviewDate !== undefined) set.interviewDate = patch.interviewDate;
  if (patch.notes !== undefined) set.notes = patch.notes;
  if (Object.keys(set).length === 0) return;
  await Target.updateOne({ _id: id }, { $set: set });
}

export async function removeTarget(id: string): Promise<void> {
  await connectDb();
  await Target.deleteOne({ _id: id });
}

export type PinKind = "dsa" | "design";

export async function setPinned(id: string, kind: PinKind, ref: string, pinned: boolean): Promise<void> {
  await connectDb();
  const field = kind === "dsa" ? "pinnedDsa" : "pinnedDesign";
  if (pinned) {
    const valid = kind === "dsa" ? problems.some((p) => p.slug === ref && p.track === "main") : systemDesign.cases.some((c) => c.slug === ref);
    if (!valid) throw new Error("Unknown item");
    await Target.updateOne({ _id: id }, { $addToSet: { [field]: ref } });
  } else await Target.updateOne({ _id: id }, { $pull: { [field]: ref } });
}

/* ----------------------------------- readiness ----------------------------------- */

type PrepContext = Omit<BlueprintInput, "profile" | "pinnedDsa" | "pinnedDesign">;

const POOL: PoolProblem[] = problems
  .filter((p) => p.track === "main")
  .map((p) => ({ slug: p.slug, title: p.title, difficulty: p.difficulty, pattern: p.pattern, tier: p.tier, order: p.order }));

/** Your real progress, shaped for the blueprint. Shared by every target. */
export async function loadPrepContext(): Promise<PrepContext> {
  await connectDb();
  const [solvedRows, doneRows, designs] = await Promise.all([ProblemProgress.find({ status: "solved" }, { slug: 1 }).lean(), SubtopicProgress.find({}, { subtopicId: 1 }).lean(), getDesignOverview()]);
  const done = new Set(doneRows.map((r) => r.subtopicId));
  return {
    pool: POOL,
    solved: new Set(solvedRows.map((r) => r.slug)),
    cases: systemDesign.cases.map((c) => ({ slug: c.slug, title: c.title })),
    designStatus: Object.fromEntries(Object.values(designs).map((d) => [d.slug, d.status])),
    tracks: tracks.map((t) => {
      const inTrack = subtopics.filter((s) => s.track === t.id).toSorted((a, b) => a.position - b.position);
      const next = inTrack.find((s) => !done.has(s.id));
      return {
        id: t.id,
        name: t.name,
        total: inTrack.length,
        ticked: inTrack.filter((s) => done.has(s.id)).length,
        next: next ? { id: next.id, title: next.title, topicId: next.topicId, topicTitle: next.topicTitle } : null,
      };
    }),
  };
}

const inputFor = (ctx: PrepContext, profile: TierProfile, t: Pick<TargetDto, "pinnedDsa" | "pinnedDesign">): BlueprintInput => ({ ...ctx, profile, pinnedDsa: t.pinnedDsa, pinnedDesign: t.pinnedDesign });

export interface TargetSummary extends TargetDto {
  tierName: string;
  overall: number;
  areas: Blueprint["areas"];
}

export async function getTargetsOverview(): Promise<TargetSummary[]> {
  const [targets, ctx] = await Promise.all([listTargets(), loadPrepContext()]);
  return targets.map((t) => {
    const profile = tierById.get(t.tier)!;
    const bp = buildBlueprint(inputFor(ctx, profile, t));
    return { ...t, tierName: profile.name, overall: bp.overall, areas: bp.areas };
  });
}

export async function getTargetDetail(id: string): Promise<{ target: TargetDto; profile: TierProfile; blueprint: Blueprint; gaps: Gap[] } | null> {
  const target = await getTarget(id);
  if (!target) return null;
  const ctx = await loadPrepContext();
  const profile = tierById.get(target.tier)!;
  const input = inputFor(ctx, profile, target);
  const blueprint = buildBlueprint(input);
  return { target, profile, blueprint, gaps: blueprintGaps(blueprint, input, { company: target.name, priority: target.priority }) };
}

const TOTAL_GAP_CAP = 24;

/** Gaps across every target for the backlog, merged by item so a problem two companies want appears once. */
export async function loadCompanyGaps(): Promise<Gap[]> {
  const targets = await listTargets();
  if (targets.length === 0) return [];
  const ctx = await loadPrepContext();
  const merged = new Map<string, Gap & { companies: string[] }>();
  for (const t of targets) {
    const profile = tierById.get(t.tier)!;
    const input = inputFor(ctx, profile, t);
    for (const g of blueprintGaps(buildBlueprint(input), input, { company: t.name, priority: t.priority })) {
      const prev = merged.get(g.key);
      if (prev) {
        prev.boost = Math.max(prev.boost, g.boost);
        if (!prev.companies.includes(t.name)) prev.companies.push(t.name);
      } else merged.set(g.key, { ...g, companies: [t.name] });
    }
  }
  return [...merged.values()]
    .toSorted((a, b) => b.boost - a.boost)
    .slice(0, TOTAL_GAP_CAP)
    .map(({ companies, ...g }) => ({ ...g, note: `${companies.join(", ")} · ${g.note.split(" · ").slice(1).join(" · ")}` }));
}
