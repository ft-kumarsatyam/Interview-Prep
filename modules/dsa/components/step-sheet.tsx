import type { ContentProblem } from "@/core/content";
import { groupByStep, STEP_ORDER } from "@/modules/dsa/domain/dsa-sheet";
import type { ProblemGroup } from "@/modules/dsa/components/problem-row";

/** Step-ordered, tick-mark progress sheet — a takeuforward/AlgoMaster-style alternative to the plain pattern accordion. */
export function stepGroups(problems: readonly ContentProblem[]): ProblemGroup[] {
  return groupByStep(problems).map((g) => ({
    key: `step:${g.step}`,
    label: g.step,
    prefix: Number.isFinite(g.rank) ? `Step ${g.rank + 1}/${STEP_ORDER.length}` : undefined,
    items: g.problems,
  }));
}

export function patternGroups(problems: readonly ContentProblem[], keyPrefix: string): ProblemGroup[] {
  const groups = new Map<string, ContentProblem[]>();
  for (const p of problems) groups.set(p.pattern, [...(groups.get(p.pattern) ?? []), p]);
  return [...groups].map(([pattern, items]) => ({ key: `${keyPrefix}:${pattern}`, label: pattern, items }));
}
