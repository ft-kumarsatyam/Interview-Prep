import { problems, topics } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { buildChecklist, buildUnreachableChecklist, type SetupChecklist, type SetupInput } from "@/lib/domain/setup";
import { env } from "@/lib/env";
import type { LeetCodeClient } from "@/lib/leetcode/client";
import { describeProviders, resolveProviders } from "@/lib/llm/providers";
import { Problem, Topic } from "@/lib/models/content";
import { pingDb } from "./health";
import { lookupLeetCodeStats } from "./leetcode-sync";
import { newsSources } from "./news";
import { getSettings } from "./settings";

const LIVE_CHECK_TIMEOUT_MS = 3_000;

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
  const health = await pingDb();
  if (!health.ok) return buildUnreachableChecklist(health.error);
  const s = await getSettings();
  await connectDb();
  const [problemCount, topicCount] = await Promise.all([Problem.estimatedDocumentCount(), Topic.estimatedDocumentCount()]);

  let profileFound: boolean | null = null;
  let solved: number | null = null;
  if (opts.live && s.leetcodeUsername) {
    // Cached for 15 minutes, 3 s and no retry live so an unreachable LeetCode can't hold the page.
    const { stats, reachable } = await lookupLeetCodeStats(s.leetcodeUsername, { ...(opts.client ? { client: opts.client } : {}), now, timeoutMs: LIVE_CHECK_TIMEOUT_MS, retries: 0 });
    // Unreachable and never cached: say nothing rather than claim the profile is missing.
    if (stats) {
      profileFound = true;
      solved = stats.solved.All;
    } else if (reachable) {
      profileFound = false;
    }
  }

  return buildChecklist({
    now,
    content: { problems: problemCount, expectedProblems: problems.length, topics: topicCount, expectedTopics: topics.length },
    secrets: { authSecretLength: e.AUTH_SECRET.length, cronSecretLength: e.CRON_SECRET?.length ?? 0 },
    leetcode: { username: s.leetcodeUsername, lastSyncAt: s.leetcodeLastSyncAt, lastError: s.leetcodeLastError, profileFound, solved },
    jobs: { lastMorningAt: s.lastMorningRunAt, lastEveningAt: s.lastEveningRunAt },
    news: { lastFetchAt: s.newsLastFetchAt, failed: s.newsLastFailed.length, feeds: newsSources(s.googleNewsQueries).length },
    notify: {
      telegram: !!(e.TELEGRAM_BOT_TOKEN && e.TELEGRAM_CHAT_ID), email: !!(e.NOTIFY_EMAIL && ((e.BREVO_API_KEY && e.BREVO_SENDER_EMAIL) || e.RESEND_API_KEY)),
      whatsapp: !!(e.WHAPI_TOKEN && e.WHATSAPP_TO),
    },
    llm: llmStatus(e),
    backup: { lastExportAt: s.lastExportAt },
    session: { remember: opts.remember },
    planner: { completed: !!s.plannerSetupAt },
  });
}

function llmStatus(e: ReturnType<typeof env>): SetupInput["llm"] {
  const defs = resolveProviders(e);
  const free = defs.filter((d) => !d.paid).map((d) => d.label);
  const paid = describeProviders(e).find((p) => p.id === "meta");
  return {
    configured: free.length > 0,
    provider: free[0] ?? null,
    free,
    paid: { label: "Meta Llama (paid)", ready: !!paid?.configured, missing: paid?.missing ?? [] },
  };
}
