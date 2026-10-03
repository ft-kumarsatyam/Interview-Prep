import type { ContentProblem } from "@/lib/content";

const EXTRA_TOPICS = ["Strings", "Math", "Bit Manipulation", "Matrix", "Greedy", "Simulation", "Design", "Recursion", "Prefix Sums", "Intervals"];

/** Topic suggestions for generating or pasting a problem: the sheet's patterns plus a few common extras. */
export function problemTopics(problems: readonly Pick<ContentProblem, "pattern" | "track">[]): string[] {
  const patterns = [...new Set(problems.filter((p) => p.track === "main").map((p) => p.pattern))];
  return [...patterns, ...EXTRA_TOPICS.filter((t) => !patterns.includes(t))];
}
