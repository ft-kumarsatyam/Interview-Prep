import { z } from "zod";

/**
 * Problems that live outside data/dsa-problems.json: questions written for PrepOS (ladder rows, takeUforward-only
 * items) and LeetCode problems a sheet needs that the seeded list doesn't carry. They open at /dsa/[slug] like any
 * other problem but never join the plan, the problem of the day or the main-track totals.
 */
export const extraProblemSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().trim().min(1).max(160),
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    pattern: z.string().trim().min(1).max(80),
    source: z.enum(["authored", "leetcode"]),
    leetcodeId: z.number().int().positive().optional(),
    url: z.url().optional(),
    statementMd: z.string().trim().min(20).max(6000).optional(),
    constraints: z.array(z.string().trim().min(1).max(240)).max(12).optional(),
  })
  .superRefine((p, ctx) => {
    if (p.source === "authored" && !p.statementMd) ctx.addIssue({ code: "custom", message: `${p.slug}: an authored problem needs statementMd` });
    if (p.source === "leetcode" && (!p.leetcodeId || !p.url?.startsWith("https://leetcode.com/problems/"))) {
      ctx.addIssue({ code: "custom", message: `${p.slug}: a LeetCode-backed problem needs leetcodeId and a leetcode.com url` });
    }
  });

export type ExtraProblem = z.infer<typeof extraProblemSchema>;

export const extraCatalogueSchema = z.object({
  generatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  problems: z.array(extraProblemSchema),
});

export interface AuthoredStatement {
  statementMd: string;
  constraints: string[];
}

/** Slugs that appear twice in the extras, or that collide with a seeded problem. */
export function extraSlugClashes(extras: readonly Pick<ExtraProblem, "slug">[], seededSlugs: ReadonlySet<string>): string[] {
  const seen = new Set<string>();
  const clashes = new Set<string>();
  for (const { slug } of extras) {
    if (seen.has(slug) || seededSlugs.has(slug)) clashes.add(slug);
    seen.add(slug);
  }
  return [...clashes];
}

/** "Input: nums = [1,2], k = 3" for an authored problem's examples, built from its visible test cases. */
export function formatExampleInput(params: readonly string[], input: readonly unknown[]): string {
  return params.map((name, i) => `${name} = ${JSON.stringify(input[i])}`).join(", ");
}
