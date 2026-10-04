import { problems, type ContentProblem } from "@/core/content";

/** Same-pattern problems in plan order (core before extended), for prev/next navigation. */
export function siblingsOf(problem: ContentProblem): ContentProblem[] {
  return problems
    .filter((p) => p.track === problem.track && p.pattern === problem.pattern)
    .toSorted((a, b) => (a.tier === b.tier ? a.order - b.order : a.tier === "core" ? -1 : 1));
}
