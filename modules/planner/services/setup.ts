import { Job } from "@/core/models/jobs";
import { JobPrefsDoc } from "@/core/models/job-postings";
import { hasBaseResume } from "@/modules/resume/services/resume";
import { problems, topics } from "@/core/content";
import { connectDb } from "@/core/db";
import { buildChecklist, buildUnreachableChecklist, type SetupChecklist, type SetupInput } from "@/modules/planner/domain/setup";
import { env } from "@/core/env";
import type { LeetCodeClient } from "@/modules/dsa/lib/leetcode/client";
import { describeProviders, resolveProviders } from "@/core/llm/providers";
import { Problem, Topic } from "@/core/models/content";
import { pingDb } from "@/core/services/health";
import { lookupLeetCodeStats } from "@/modules/dsa/services/leetcode-sync";
import { newsSources } from "@/modules/news/services/news";
import { getSettings } from "@/modules/settings/services/settings";

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

  const [hasResume, prefsSaved, jobsTracked] = await Promise.all([hasBaseResume(), JobPrefsDoc.exists({ _id: "prefs" }), Job.estimatedDocumentCount()]);
  const jobSearch = { hasResume, prefsSaved: !!prefsSaved, jobsTracked };

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
    jobSearch,
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
