/**
 * DSA problem catalogue (main + extra). Does not load testcases, sheets, notes or web content.
 */
import problemsJson from "@/data/dsa-problems.json";
import extraProblemsJson from "@/data/dsa-extra-problems.json";
import { extraCatalogueSchema, type AuthoredStatement } from "@/modules/dsa/domain/extra-problems";
import type { ContentProblem } from "@/core/content/types";

export const problems = problemsJson as ContentProblem[];
const extraCatalogue = extraCatalogueSchema.parse(extraProblemsJson).problems;

export const extraProblems: ContentProblem[] = extraCatalogue.map((p, i) => ({
  slug: p.slug,
  title: p.title,
  ...(p.leetcodeId ? { leetcodeId: p.leetcodeId } : {}),
  difficulty: p.difficulty,
  pattern: p.pattern,
  track: "main",
  tier: "extended",
  url: p.url ?? "",
  order: 100_000 + i,
  catalog: "extra",
}));

export const authoredStatementBySlug: ReadonlyMap<string, AuthoredStatement> = new Map(
  extraCatalogue.flatMap((p) => (p.source === "authored" && p.statementMd ? [[p.slug, { statementMd: p.statementMd, constraints: p.constraints ?? [] }] as const] : [])),
);

export const problemBySlug: ReadonlyMap<string, ContentProblem> = new Map([...problems, ...extraProblems].map((p) => [p.slug, p]));
export const mainProblemCount = problems.filter((p) => p.track === "main").length;
