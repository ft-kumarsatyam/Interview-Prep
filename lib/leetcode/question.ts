import { z } from "zod";
import { query } from "./client";

/** One problem as LeetCode's public GraphQL describes it. */
export interface LcQuestion {
  questionId: string;
  title: string;
  difficulty: string;
  isPaidOnly: boolean;
  /** Statement HTML. Null for premium problems. Untrusted: sanitised before it is stored or shown. */
  contentHtml: string | null;
  hints: string[];
  /** Example inputs, one argument per line (no expected outputs). */
  exampleTestcases: string | null;
  jsSnippet: string | null;
  topicTags: string[];
}

/** Port so the service can be tested with a fake. Returns null when LeetCode has no such problem. */
export interface LcQuestionFetcher {
  question(slug: string): Promise<LcQuestion | null>;
}

const questionSchema = z.object({
  data: z.object({
    question: z
      .object({
        questionId: z.string().max(20),
        title: z.string().max(200),
        difficulty: z.string().max(20),
        isPaidOnly: z.boolean(),
        content: z.string().max(200_000).nullable(),
        hints: z.array(z.string().max(2000)).max(20),
        exampleTestcases: z.string().max(10_000).nullable(),
        codeSnippets: z.array(z.object({ langSlug: z.string(), code: z.string().max(20_000) })).nullable(),
        topicTags: z.array(z.object({ name: z.string().max(80) })).max(30),
      })
      .nullable(),
  }),
});

const QUERY =
  "query q($titleSlug: String!) { question(titleSlug: $titleSlug) { questionId title content isPaidOnly difficulty hints exampleTestcases codeSnippets { langSlug code } topicTags { name } } }";

/** Slugs are lowercase words and hyphens. Anything else never reaches LeetCode. */
export const isLeetCodeSlug = (slug: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 120;

export const leetcodeQuestions: LcQuestionFetcher = {
  async question(slug) {
    if (!isLeetCodeSlug(slug)) return null;
    const json = await query({ query: QUERY, variables: { titleSlug: slug } });
    const parsed = questionSchema.safeParse(json);
    if (!parsed.success) throw new Error("Unexpected LeetCode response");
    const q = parsed.data.data.question;
    if (!q) return null;
    return {
      questionId: q.questionId,
      title: q.title,
      difficulty: q.difficulty,
      isPaidOnly: q.isPaidOnly,
      contentHtml: q.content,
      hints: q.hints,
      exampleTestcases: q.exampleTestcases,
      jsSnippet: q.codeSnippets?.find((s) => s.langSlug === "javascript")?.code ?? null,
      topicTags: q.topicTags.map((t) => t.name),
    };
  },
};
