import { topicById } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { subtopics } from "@/lib/content";
import { toLocalDate } from "@/lib/domain/dates";
import { assessFeasibility, theoryCost, type Feasibility } from "@/lib/domain/feasibility";
import {
  INTAKE_VERSION,
  intakeStepSchema,
  mergeRatings,
  missingSteps,
  type IntakeState,
  type IntakeStep,
  type IntakeStepInput,
} from "@/lib/domain/planner-intake";
import { validatePlannerWindow } from "@/lib/domain/planner-profile";
import { loadPersonalisation } from "./intake-weights";
import { logPlanChange } from "./plan-log";
import { loadPlanInputs, todayIn } from "./plan";
import { PLANNER_INTAKE_ID, PlannerIntake, type PlannerIntakeDoc } from "@/lib/models/planner";
import { savePlanner } from "./planner";
import { getSettings } from "./settings";

const isStep = (v: string): v is IntakeStep => v === "goals" || v === "ratings" || v === "availability";

function toState(doc: PlannerIntakeDoc | null, fallback: Awaited<ReturnType<typeof getSettings>>): IntakeState {
  const hours = doc?.availability?.hoursByDow;
  return {
    goals: {
      targetRole: doc?.goals?.targetRole || fallback.profile.targetRole,
      targetCompany: doc?.goals?.targetCompany ?? fallback.profile.targetCompany,
      level: doc?.goals?.level ?? "fresher",
      focusNotes: doc?.goals?.focusNotes ?? "",
    },
    interviewDate: doc?.interviewDate ?? fallback.endDate,
    ratings: (doc?.topicRatings ?? []).map((r) => ({
      topicId: r.topicId,
      rating: r.rating,
      wantToLearn: !!r.wantToLearn,
      tier: r.tier ?? "must",
      diagnosticScore: r.diagnosticScore ?? null,
    })),
    availability: {
      hoursByDow: hours?.length === 7 ? [...hours] : [...(fallback.hoursByDow ?? [])],
      overrides: (doc?.availability?.overrides ?? []).map((o) => ({ from: o.from ?? "", to: o.to ?? "", hours: o.hours ?? 0 })),
    },
    stepsDone: (doc?.stepsDone ?? []).filter(isStep),
    completedAt: doc?.completedAt ?? null,
  };
}

/** The saved intake. Before the first save it is seeded from Settings, so goals and hours show what is already planned. */
export async function getIntake(): Promise<IntakeState> {
  await connectDb();
  const [doc, settings] = await Promise.all([PlannerIntake.findById(PLANNER_INTAKE_ID).lean(), getSettings()]);
  return toState(doc, settings);
}

/** Saves one wizard step. Safe to call repeatedly: a half-finished wizard survives a reload. */
export async function saveIntakeStep(raw: unknown, now = new Date()): Promise<IntakeState> {
  const input: IntakeStepInput = intakeStepSchema.parse(raw);
  const settings = await getSettings();
  const today = toLocalDate(now, settings.timezone);
  await connectDb();

  const set: Record<string, unknown> = { intakeVersion: INTAKE_VERSION };
  if (input.step === "goals") {
    const problem = validatePlannerWindow({ endDate: input.interviewDate }, settings, today);
    if (problem) throw new Error(problem);
    set.goals = { targetRole: input.targetRole, targetCompany: input.targetCompany, level: input.level, focusNotes: input.focusNotes };
    set.interviewDate = input.interviewDate;
  } else if (input.step === "ratings") {
    const unknown = input.ratings.find((r) => !topicById.has(r.topicId));
    if (unknown) throw new Error(`Unknown topic: ${unknown.topicId}`);
    const saved = await PlannerIntake.findById(PLANNER_INTAKE_ID, { topicRatings: 1 }).lean();
    const kept = mergeRatings(
      (saved?.topicRatings ?? []).map((r) => ({ topicId: r.topicId, rating: r.rating, wantToLearn: !!r.wantToLearn, tier: r.tier ?? "must", diagnosticScore: r.diagnosticScore ?? null })),
      input.ratings,
    );
    set.topicRatings = kept.map((r) => ({ ...r, ratedAt: now }));
  } else {
    set.availability = { hoursByDow: input.hoursByDow, overrides: input.overrides };
  }

  await PlannerIntake.updateOne(
    { _id: PLANNER_INTAKE_ID },
    { $set: set, $addToSet: { stepsDone: input.step }, $setOnInsert: { _id: PLANNER_INTAKE_ID } },
    { upsert: true },
  );
  return getIntake();
}

/**
 * Finishes the intake. Needs every step saved, then hands the shared fields (role, company, hours, interview date) to
 * `savePlanner`, so the existing plan, calendar and change log all see them.
 */
export async function completeIntake(now = new Date()): Promise<IntakeState> {
  const state = await getIntake();
  const missing = missingSteps(state.stepsDone);
  if (missing.length) throw new Error(`Finish these steps first: ${missing.join(", ")}`);
  if (!state.interviewDate) throw new Error("Set an interview date first");
  const settings = await getSettings();
  await savePlanner(
    {
      targetRole: state.goals.targetRole,
      targetCompany: state.goals.targetCompany,
      preferredLanguage: settings.profile.preferredLanguage,
      priorities: settings.profile.priorities,
      endDate: state.interviewDate,
      hoursByDow: state.availability.hoursByDow,
    },
    now,
  );
  await connectDb();
  await PlannerIntake.updateOne({ _id: PLANNER_INTAKE_ID }, { $set: { completedAt: now } });
  const tiers = { must: 0, nice: 0, skip: 0 };
  for (const r of state.ratings) tiers[r.tier]++;
  await logPlanChange(
    {
      type: "intake",
      summary: `Intake completed: ${state.ratings.length} topics rated (${tiers.must} must-have, ${tiers.nice} nice-to-have, ${tiers.skip} skipped). Weak and wanted topics get more time from now on.`,
      after: { ...tiers, level: state.goals.level },
      dedupeKey: `intake:${now.toISOString().slice(0, 10)}`,
    },
    todayIn(settings, now),
  );
  return getIntake();
}

export interface FeasibilityView extends Feasibility {
  today: string;
  endDate: string;
  /** Minutes of unfinished theory per topic, at its current weight. */
  openMinutes: Map<string, number>;
}

/** Whether the work left fits the time left, from today's real progress, costs and the intake's weights. */
export async function getFeasibility(now = new Date(), opts: { draft?: boolean } = {}): Promise<FeasibilityView> {
  const saved = await getSettings();
  const today = todayIn(saved, now);
  const inputs = await loadPlanInputs();
  // The wizard previews the answers it has so far: its hours, date and ratings stand in for the saved ones.
  const intake = opts.draft ? await getIntake() : null;
  const settings = intake ? { ...saved, hoursByDow: intake.availability.hoursByDow, endDate: intake.interviewDate ?? saved.endDate } : saved;
  const personal = opts.draft ? await loadPersonalisation({ draft: true }) : inputs.personal;
  const tierOf = (topicId: string) => personal.weights.get(topicId)?.tier ?? "must";
  const stateById = new Map(inputs.subtopics.map((x) => [x.id, x]));
  const topics = subtopics.map((t) => {
    const state = stateById.get(t.id);
    return { id: t.id, topicId: t.topicId, done: !!state?.done, weight: personal.weights.get(t.topicId)?.weight ?? 1, tier: tierOf(t.topicId) };
  });
  const open = new Map<string, number>();
  for (const t of topics) if (!t.done && t.weight > 0) open.set(t.topicId, (open.get(t.topicId) ?? 0) + theoryCost(t.weight, inputs.costs));
  const result = assessFeasibility({
    from: today,
    settings,
    overrides: personal.overrides,
    costs: inputs.costs,
    dsaPool: inputs.problems.filter((p) => p.track === "main" && !p.solved).map((p) => p.difficulty ?? "Medium"),
    jsLeft: inputs.problems.filter((p) => p.track === "js" && !p.solved).length,
    sqlLeft: inputs.problems.filter((p) => p.track === "sql" && !p.solved).length,
    subtopics: topics,
  });
  return { ...result, today, endDate: settings.endDate, openMinutes: open };
}
