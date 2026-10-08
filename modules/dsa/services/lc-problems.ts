import { problemBySlug } from "@/core/content";
import { connectDb } from "@/core/db";
import { leetcodeQuestions, type LcQuestionFetcher } from "@/modules/dsa/lib/leetcode/question";
import { leetcodeHtmlToMarkdown } from "@/modules/dsa/lib/leetcode/statement";
import { LcProblemCache, STATEMENT_FORMAT } from "@/core/models/lc";

const DAY_MS = 86_400_000;
/** How long each outcome is remembered. A failure is remembered only briefly, so an outage heals itself. */
export const LC_TTL_MS = { ok: 60 * DAY_MS, premium: 30 * DAY_MS, not_found: 30 * DAY_MS, error: 3_600_000 } as const;
const MAX_HINTS = 10;
const MAX_HINT_CHARS = 800;

export type LcProblemStatus = keyof typeof LC_TTL_MS;

export interface LcProblemView {
  status: LcProblemStatus;
  title: string | null;
  /** Safe markdown (see lib/leetcode/statement.ts). */
  contentMd: string | null;
  hints: string[];
  examples: string | null;
  jsSnippet: string | null;
  topicTags: string[];
  fetchedAt: Date | null;
}

const empty = (status: LcProblemStatus, fetchedAt: Date | null = null): LcProblemView => ({
  status,
  title: null,
  contentMd: null,
  hints: [],
  examples: null,
  jsSnippet: null,
  topicTags: [],
  fetchedAt,
});

/**
 * The statement, official hints and examples for a problem, fetched lazily from LeetCode's public GraphQL on
 * first view and then served from the cache. Premium or missing problems and outages degrade to a status the
 * page can explain instead of throwing. Only slugs of problems in this app are ever requested.
 */
export async function getLeetCodeProblem(slug: string, deps: { fetcher?: LcQuestionFetcher; now?: Date } = {}): Promise<LcProblemView> {
  // Problems written for PrepOS have no LeetCode page, so their slug is never sent there.
  if (problemBySlug.get(slug)?.leetcodeId === undefined) return empty("not_found");
  await connectDb();
  const now = deps.now ?? new Date();

  const hit = await LcProblemCache.findOne({ _id: slug, expiresAt: { $gt: now }, format: STATEMENT_FORMAT }).lean();
  if (hit) {
    return {
      status: hit.status,
      title: hit.title ?? null,
      contentMd: hit.contentMd ?? null,
      hints: hit.hints ?? [],
      examples: hit.examples ?? null,
      jsSnippet: hit.jsSnippet ?? null,
      topicTags: hit.topicTags ?? [],
      fetchedAt: hit.fetchedAt,
    };
  }

  let view: LcProblemView;
  let questionId: string | null = null;
  try {
    const q = await (deps.fetcher ?? leetcodeQuestions).question(slug);
    if (!q) view = empty("not_found", now);
    else if (q.isPaidOnly && !q.contentHtml) view = { ...empty("premium", now), title: q.title, topicTags: q.topicTags };
    else {
      questionId = q.questionId;
      view = {
        status: "ok",
        title: q.title,
        contentMd: q.contentHtml ? leetcodeHtmlToMarkdown(q.contentHtml) : null,
        hints: q.hints.slice(0, MAX_HINTS).map((h) => leetcodeHtmlToMarkdown(h).slice(0, MAX_HINT_CHARS)).filter(Boolean),
        examples: q.exampleTestcases,
        jsSnippet: q.jsSnippet,
        topicTags: q.topicTags,
        fetchedAt: now,
      };
    }
  } catch {
    view = empty("error", now);
  }

  await LcProblemCache.updateOne(
    { _id: slug },
    {
      $set: {
        status: view.status,
        title: view.title,
        contentMd: view.contentMd,
        format: STATEMENT_FORMAT,
        hints: view.hints,
        examples: view.examples,
        jsSnippet: view.jsSnippet,
        questionId,
        topicTags: view.topicTags,
        fetchedAt: now,
        expiresAt: new Date(now.getTime() + LC_TTL_MS[view.status]),
      },
    },
    { upsert: true },
  );
  return view;
}
