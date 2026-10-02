import { problems, topics } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { buildChecklist, type SetupChecklist } from "@/lib/domain/setup";
import { env } from "@/lib/env";
import { leetcodeClient, type LeetCodeClient } from "@/lib/leetcode/client";
import { Problem, Topic } from "@/lib/models/content";
import { newsSources } from "./news";
import { getSettings } from "./settings";

export interface SetupOptions {
  /** Check the LeetCode profile over the network (Setup page only; the dashboard skips it). */
  live?: boolean;
  remember: boolean;
  now?: Date;
  client?: LeetCodeClient;
}

export async function getSetupChecklist(opts: SetupOptions): Promise<SetupChecklist> {
  const now = opts.now ?? new Date();
  const e = env();
  const s = await getSettings();
  await connectDb();
  const [problemCount, topicCount] = await Promise.all([Problem.estimatedDocumentCount(), Topic.estimatedDocumentCount()]);

  let profileFound: boolean | null = null;
  let solved: number | null = null;
  if (opts.live && s.leetcodeUsername) {
    try {
      const stats = await (opts.client ?? leetcodeClient).stats(s.leetcodeUsername);
      profileFound = stats !== null;
      solved = stats?.solved.All ?? null;
    } catch {
      // LeetCode unreachable: say nothing rather than claim the profile is missing.
    }
  }

  return buildChecklist({
    now,
    content: { problems: problemCount, expectedProblems: problems.length, topics: topicCount, expectedTopics: topics.length },
    secrets: { authSecretLength: e.AUTH_SECRET.length, cronSecretLength: e.CRON_SECRET?.length ?? 0 },
    leetcode: { username: s.leetcodeUsername, lastSyncAt: s.leetcodeLastSyncAt, lastError: s.leetcodeLastError, profileFound, solved },
    jobs: { lastMorningAt: s.lastMorningRunAt, lastEveningAt: s.lastEveningRunAt },
    news: { lastFetchAt: s.newsLastFetchAt, failed: s.newsLastFailed.length, feeds: newsSources(s.googleNewsQueries).length },
    notify: { telegram: !!(e.TELEGRAM_BOT_TOKEN && e.TELEGRAM_CHAT_ID), email: !!(e.RESEND_API_KEY && e.NOTIFY_EMAIL) },
    llm: { configured: !!e.LLM_API_KEY, provider: e.LLM_API_KEY ? (e.LLM_PROVIDER ?? "gemini") : null },
    backup: { lastExportAt: s.lastExportAt },
    session: { remember: opts.remember },
  });
}
