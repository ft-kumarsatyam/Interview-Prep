import { problemBySlug, type Difficulty } from "@/core/content";
import { addDays, type DateStr } from "@/core/domain/dates";
import { ProblemProgress } from "@/core/models/progress";
import { finishImpact, pickAhead, type FinishImpact } from "@/modules/dsa/domain/problem-of-day";
import { pace } from "@/modules/planner/domain/pace";
import { projectDays, type ProblemState } from "@/modules/planner/domain/planner";
import { ensureToday, loadPlanInputs } from "@/modules/planner/services/plan";

export interface AheadPick {
  slug: string;
  title: string;
  difficulty: Difficulty;
  pattern: string;
  core: boolean;
  solvedToday: boolean;
}

export interface ProblemOfDay {
  today: DateStr;
  /** Null once every main-track problem is solved. */
  pick: AheadPick | null;
  /** The problems right after it, for a day with spare time. */
  upNext: AheadPick[];
  impact: FinishImpact | null;
  todayDsa: { solved: number; target: number };
  /** Main-track problems ahead of (positive) or behind the ideal pace. */
  paceDelta: number;
  mainLeft: number;
}

const toPick = (slug: string, solvedToday: ReadonlySet<string>): AheadPick | null => {
  const p = problemBySlug.get(slug);
  return p ? { slug, title: p.title, difficulty: p.difficulty, pattern: p.pattern, core: p.tier === "core", solvedToday: solvedToday.has(slug) } : null;
};

/** Today's problem of the day and what solving it does to the projected calendar. */
export async function getProblemOfDay(): Promise<ProblemOfDay> {
  const state = await ensureToday();
  const s = state.settings;
  const [inputs, firstToday] = await Promise.all([
    loadPlanInputs(),
    ProblemProgress.find({ status: "solved", firstSolvedOn: state.today }, { slug: 1 }).lean(),
  ]);
  const solvedToday = new Set(firstToday.map((r) => r.slug));
  const [first, ...rest] = pickAhead({ problems: inputs.problems, solvedToday, todayPlan: state.plan });

  const mainSolved = inputs.problems.filter((p) => p.track === "main" && p.solved).length;
  const mainTotal = inputs.problems.filter((p) => p.track === "main").length;
  const base = {
    today: state.today,
    todayDsa: { solved: state.day.dsaSolved, target: state.day.dsaTarget },
    paceDelta: pace(state.today, mainSolved, mainTotal, s).delta,
    mainLeft: mainTotal - mainSolved,
  };
  if (!first) return { ...base, pick: null, upNext: [], impact: null };

  const from = addDays(state.today, 1);
  const project = (list: ProblemState[]) =>
    from > s.endDate ? [] : projectDays({ from, to: s.endDate, settings: s, problems: list, reviews: inputs.reviews, subtopics: inputs.subtopics, overrides: inputs.overrides, costs: inputs.costs, seed: state.plan });
  const withSolved = (solved: boolean) => inputs.problems.map((p) => (p.slug === first ? { ...p, solved } : p));

  return {
    ...base,
    pick: toPick(first, solvedToday),
    upNext: rest.flatMap((slug) => toPick(slug, solvedToday) ?? []),
    impact: finishImpact(first, project(withSolved(false)), project(withSolved(true))),
  };
}
