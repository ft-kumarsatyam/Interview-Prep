import { topicById } from "@/core/content";
import { connectDb } from "@/core/db";
import { mondayOf } from "@/modules/mock/domain/mock";
import { applyRebalance, buildRebalance, describeAction, rebalanceChange, type RebalanceAction } from "@/modules/planner/domain/rebalance";
import { type TopicRating } from "@/modules/planner/domain/planner-intake";
import { PLANNER_INTAKE_ID, PlannerIntake } from "@/core/models/planner";
import { loadPersonalisation } from "@/modules/planner/services/intake-weights";
import { notify } from "@/modules/notifications/services/notifications";
import { todayIn } from "@/modules/planner/services/plan";
import { logPlanChange } from "@/modules/planner/services/plan-log";
import { getFeasibility } from "@/modules/planner/services/planner-intake";
import { getSettings } from "@/modules/settings/services/settings";

export type ProposalStatus = "pending" | "applied" | "dismissed";

export interface RebalanceProposal {
  weekKey: string;
  status: ProposalStatus;
  actions: RebalanceAction[];
  lines: string[];
  createdOn: string;
}

const title = (id: string) => topicById.get(id)?.title ?? id;

function readProposal(raw: unknown): RebalanceProposal | null {
  const p = raw as Partial<RebalanceProposal> | null;
  return p && typeof p.weekKey === "string" && Array.isArray(p.actions) ? (p as RebalanceProposal) : null;
}

export async function getProposal(): Promise<RebalanceProposal | null> {
  await connectDb();
  const doc = await PlannerIntake.findById(PLANNER_INTAKE_ID, { proposal: 1 }).lean();
  return readProposal(doc?.proposal);
}

/**
 * Looks at this week's evidence and time left and stores a suggestion for you to approve. At most one per Mon-Sun week,
 * and only after the intake is finished; nothing about the plan changes until you apply it. Safe to call from a cron or from a page.
 */
export async function proposeRebalance(now = new Date()): Promise<RebalanceProposal | null> {
  const settings = await getSettings();
  const weekKey = mondayOf(todayIn(settings, now));
  const existing = await getProposal();
  if (existing?.weekKey === weekKey) return existing;

  const personal = await loadPersonalisation();
  if (!personal.completed || personal.ratings.length === 0) return null;
  const feasibility = await getFeasibility(now);
  const measured = new Set(personal.ratings.filter((r) => r.diagnosticScore !== null).map((r) => r.topicId));
  // Practice mastery counts as evidence too: a topic's strength differs from its self-rating only when something measured it.
  for (const r of personal.ratings) {
    const w = personal.weights.get(r.topicId);
    if (w && Math.abs(w.strength - (r.rating - 1) * 25) > 0.5) measured.add(r.topicId);
  }
  const actions = buildRebalance({ ratings: personal.ratings, weights: personal.weights, openMinutes: feasibility.openMinutes, measured, feasibility });
  if (actions.length === 0) return null;

  const proposal: RebalanceProposal = { weekKey, status: "pending", actions, lines: actions.map((a) => describeAction(a, title)), createdOn: todayIn(settings, now) };
  await connectDb();
  const claimed = await PlannerIntake.updateOne({ _id: PLANNER_INTAKE_ID, "proposal.weekKey": { $ne: weekKey } }, { $set: { proposal } });
  if (claimed.modifiedCount === 0) return getProposal();
  await notify(
    { kind: "plan", title: "Planner suggestion for this week", body: `${actions.length} change${actions.length === 1 ? "" : "s"} suggested to fit your progress and time left. Review it on the Planner page.`, dedupeKey: `rebalance:${weekKey}` },
    { push: false },
  );
  return proposal;
}

async function resolve(status: Exclude<ProposalStatus, "pending">, now: Date): Promise<RebalanceProposal> {
  const proposal = await getProposal();
  if (!proposal || proposal.status !== "pending") throw new Error("There is no suggestion waiting");
  await connectDb();
  // Compare-and-set on the status, so applying twice (a double click) changes things once.
  const claimed = await PlannerIntake.updateOne({ _id: PLANNER_INTAKE_ID, "proposal.status": "pending", "proposal.weekKey": proposal.weekKey }, { $set: { "proposal.status": status } });
  if (claimed.modifiedCount === 0) throw new Error("That suggestion was already handled");
  if (status === "applied") {
    const doc = await PlannerIntake.findById(PLANNER_INTAKE_ID, { topicRatings: 1 }).lean();
    const ratings: TopicRating[] = (doc?.topicRatings ?? []).map((r) => ({ topicId: r.topicId, rating: r.rating, wantToLearn: !!r.wantToLearn, tier: r.tier ?? "must", diagnosticScore: r.diagnosticScore ?? null }));
    const next = applyRebalance(ratings, proposal.actions);
    await PlannerIntake.updateOne({ _id: PLANNER_INTAKE_ID }, { $set: { topicRatings: next.map((r) => ({ ...r, ratedAt: now })) } });
    const settings = await getSettings();
    await logPlanChange(rebalanceChange(proposal.weekKey, proposal.actions, proposal.lines), todayIn(settings, now));
  }
  return { ...proposal, status };
}

export const applyProposal = (now = new Date()) => resolve("applied", now);
export const dismissProposal = (now = new Date()) => resolve("dismissed", now);
