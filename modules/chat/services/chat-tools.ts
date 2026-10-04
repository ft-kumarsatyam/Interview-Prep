import { courses } from "@/core/courses";
import { getEmbedder } from "@/core/llm/embeddings";
import { APP_GUIDE } from "@/modules/chat/domain/app-guide";
import type { ToolResult } from "@/modules/chat/domain/chat-prompt";
import { compactJson, TOOLS, type ToolId, type ToolPlan } from "@/modules/chat/domain/chat-tools";
import { searchPassages } from "@/modules/ai/services/retrieval";
import { getAllDoneKeys } from "@/modules/course/services/progress";
import { getReviewQueue } from "@/modules/dsa/services/problems";
import { listJobs } from "@/modules/jobs/services/jobs";
import { listMocks } from "@/modules/mock/services/mock";
import { ensureToday } from "@/modules/planner/services/plan";
import { getDashboard } from "@/modules/progress/services/dashboard";
import { getStats } from "@/modules/progress/services/stats";
import { getStreakInsights } from "@/modules/progress/services/streak-insights";
import { listQuizHistory } from "@/modules/quiz/services/quiz";
import { getMistakesOverview } from "@/modules/quiz/services/practice";
import { listRoadmaps } from "@/modules/roadmap/services/roadmap";
import { getSettings } from "@/modules/settings/services/settings";
import { getTargetsOverview } from "@/modules/targets/services/targets";

/**
 * Runs the assistant's read-only tools. Every tool returns a projection of an existing service's data,
 * chosen field by field where the data is personal (jobs: status, company and dates only), and the
 * result is compacted (personal keys dropped, size capped) before it can reach a prompt. Nothing here
 * reads resume or profile text, and nothing writes.
 */
const RUNNERS: Record<ToolId, (query?: string) => Promise<unknown>> = {
  async today() {
    const d = await getDashboard();
    return {
      today: d.today,
      dayKind: d.plan.kind,
      targets: { dsa: d.plan.dsaTarget, theory: d.plan.theoryTarget },
      day: d.day,
      streak: { current: d.streak, best: d.best, freezeTokens: d.freezeTokens },
      problems: d.problems,
      theory: d.theory,
      bonus: d.bonus,
      pace: d.pace,
      mainSolved: d.solvedMain,
    };
  },
  async streak() {
    const s = await ensureToday();
    return { today: s.today, current: s.streak, best: s.best, freezeTokens: s.freezeTokens, insights: await getStreakInsights(s.today, s.freezeTokens) };
  },
  async stats() {
    const s = await getStats();
    return { today: s.today, quizPassPct: s.passPct, totals: s.totals, problemTracks: s.problemTracks, syllabusTracks: s.syllabusTracks, recentQuizzes: s.quizzes.slice(-10), leetcode: s.leetcode.stats ? { solved: s.leetcode.stats, trackedSolved: s.leetcode.trackedSolved, trackedTotal: s.leetcode.trackedTotal } : null };
  },
  async reviews() {
    const s = await ensureToday();
    const queue = await getReviewQueue(s.today);
    return { today: s.today, due: queue.length, items: queue.slice(0, 20) };
  },
  async quizzes() {
    return listQuizHistory(15);
  },
  async mistakes() {
    return getMistakesOverview(10);
  },
  async notes(query) {
    const found = await searchPassages(query ?? "", { k: 4, embedder: getEmbedder() });
    return found.passages.map((p) => ({ title: p.title, ref: p.ref, text: p.text.slice(0, 900) }));
  },
  async courses() {
    const done = await getAllDoneKeys();
    return courses.map((c) => {
      const lessons = c.chapters.flatMap((ch) => ch.lessons);
      return { id: c.id, title: c.title, lessonsDone: lessons.filter((l) => done.has(`${c.id}/${l.id}`)).length, lessonsTotal: lessons.length };
    });
  },
  async roadmaps() {
    const list = await listRoadmaps();
    return list.map((r) => ({ id: r.roadmap.id, title: r.roadmap.title, joinedOn: r.joinedOn, progress: r.progress }));
  },
  async jobs() {
    const jobs = await listJobs();
    return {
      total: jobs.length,
      jobs: jobs.slice(0, 30).map((j) => ({ company: j.company, title: j.title, status: j.status, location: j.location, appliedOn: j.appliedOn, followUpOn: j.followUpOn, interviewOn: j.interviewOn, interviewRound: j.interviewRound, target: j.targetName, updatedAt: j.updatedAt })),
    };
  },
  async mocks() {
    return listMocks(10);
  },
  async targets() {
    const list = await getTargetsOverview();
    return list.map((t) => ({ name: t.name, tier: t.tierName, priority: t.priority, readiness: t.overall, areas: t.areas }));
  },
  async settings() {
    const s = await getSettings();
    return {
      startDate: s.startDate,
      endDate: s.endDate,
      timezone: s.timezone,
      quizPassPct: s.quizPassPct,
      topicMasteryPct: s.topicMasteryPct,
      dailyDsa: { min: s.minDailyDsa, max: s.maxDailyDsa, saturdayMax: s.maxSaturdayDsa },
      maxDailyTheory: s.maxDailyTheory,
      revisionWeeks: s.revisionWeeks,
      restDays: s.restDays,
      hoursByDow: s.hoursByDow ?? null,
      mockSchedule: s.mockSchedule,
      backlogBudget: s.backlogBudget,
      roastLevel: s.roastLevel,
      mail: s.mail,
      leetcodeLinked: !!s.leetcodeUsername,
      paidAi: { enabled: s.llmPaid.enabled, dailyCap: s.llmPaid.dailyCap },
    };
  },
  async "app-guide"() {
    return APP_GUIDE;
  },
};

/** Runs the planned tools in parallel. A failing tool becomes a short note instead of failing the turn. */
export async function runTools(plan: ToolPlan): Promise<ToolResult[]> {
  return Promise.all(
    plan.map(async (t): Promise<ToolResult> => {
      try {
        const value = await RUNNERS[t.name](t.query);
        const data = typeof value === "string" ? value.slice(0, TOOLS[t.name].maxChars) : compactJson(value, TOOLS[t.name].maxChars);
        return { name: t.name, data };
      } catch {
        return { name: t.name, data: '{"error":"this data could not be loaded right now"}' };
      }
    }),
  );
}
