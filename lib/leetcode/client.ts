import { z } from "zod";
import { fetchWithPolicy } from "@/lib/http";

const ENDPOINT = "https://leetcode.com/graphql";
const TIMEOUT_MS = 8000;

export interface AcSubmission {
  id: string;
  titleSlug: string;
  /** Unix seconds. */
  timestamp: number;
}

export interface LeetCodeStats {
  username: string;
  solved: Record<"All" | "Easy" | "Medium" | "Hard", number>;
  total: Record<"All" | "Easy" | "Medium" | "Hard", number>;
}

/** Port for LeetCode access so services can be tested with a fake. */
export interface LeetCodeClient {
  recentAccepted(username: string, limit?: number): Promise<AcSubmission[]>;
  /** `timeoutMs` bounds each attempt (default 8 s) and `retries` the extra attempts (default 1). */
  stats(username: string, opts?: { timeoutMs?: number; retries?: number }): Promise<LeetCodeStats | null>;
}

const recentSchema = z.object({
  data: z.object({
    recentAcSubmissionList: z
      .array(z.object({ id: z.string(), titleSlug: z.string().max(200), timestamp: z.coerce.number().int().positive() }))
      .nullable(),
  }),
});

const countSchema = z.array(z.object({ difficulty: z.enum(["All", "Easy", "Medium", "Hard"]), count: z.number().int().nonnegative() }));
const statsSchema = z.object({
  data: z.object({
    matchedUser: z.object({ username: z.string(), submitStatsGlobal: z.object({ acSubmissionNum: countSchema }) }).nullable(),
    allQuestionsCount: countSchema,
  }),
});

export async function query(body: { query: string; variables: Record<string, unknown> }, opts: { timeoutMs?: number; retries?: number } = {}): Promise<unknown> {
  // A GraphQL read: safe to repeat even though it is a POST.
  const res = await fetchWithPolicy(ENDPOINT, {
    method: "POST",
    retryNonIdempotent: true,
    timeoutMs: opts.timeoutMs ?? TIMEOUT_MS,
    retries: opts.retries ?? 1,
    headers: { "Content-Type": "application/json", Referer: "https://leetcode.com", "User-Agent": "PrepOS/1.0" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`LeetCode responded ${res.status}`);
  return res.json();
}

const toRecord = (rows: z.infer<typeof countSchema>) =>
  Object.fromEntries((["All", "Easy", "Medium", "Hard"] as const).map((d) => [d, rows.find((r) => r.difficulty === d)?.count ?? 0])) as LeetCodeStats["solved"];

/** Public, unauthenticated GraphQL. Only the ~20 most recent accepted submissions are visible. */
export const leetcodeClient: LeetCodeClient = {
  async recentAccepted(username, limit = 20) {
    const json = await query({
      query: "query recentAc($username: String!, $limit: Int!) { recentAcSubmissionList(username: $username, limit: $limit) { id titleSlug timestamp } }",
      variables: { username, limit },
    });
    const parsed = recentSchema.safeParse(json);
    if (!parsed.success) throw new Error("Unexpected LeetCode response (is the username correct?)");
    return parsed.data.data.recentAcSubmissionList ?? [];
  },
  async stats(username, opts) {
    const json = await query({
      query:
        "query userStats($username: String!) { matchedUser(username: $username) { username submitStatsGlobal { acSubmissionNum { difficulty count } } } allQuestionsCount { difficulty count } }",
      variables: { username },
    }, opts);
    const parsed = statsSchema.safeParse(json);
    if (!parsed.success || !parsed.data.data.matchedUser) return null;
    const { matchedUser, allQuestionsCount } = parsed.data.data;
    return {
      username: matchedUser.username,
      solved: toRecord(matchedUser.submitStatsGlobal.acSubmissionNum),
      total: toRecord(allQuestionsCount),
    };
  },
};
