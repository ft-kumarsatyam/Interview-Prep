import { mainProblemCount, orderedTopics, problemBySlug, problems, subtopicId, subtopics, tracks } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { idealSolvedBy } from "@/lib/domain/pace";
import {
  coverage,
  cumulativeVsIdeal,
  difficultyByWeek,
  quizTrend,
  solvesPerDay,
  topicMastery,
  type SolveRow,
} from "@/lib/domain/stats";
import type { LeetCodeStats } from "@/lib/leetcode/client";
import { DayLog, Quiz } from "@/lib/models/day";
import { Mastery } from "@/lib/models/learning";
import { ProblemProgress, SubtopicProgress } from "@/lib/models/progress";
import { getLeetCodeStats } from "./leetcode-sync";
import { todayIn } from "./plan";
import { getSettings } from "./settings";

export const RADAR_TRACK = "js";

export interface StatsData {
  today: string;
  passPct: number;
  totals: { solved: number; mainSolved: number; mainTotal: number; daysComplete: number; quizzesPassed: number; mastered: number };
  perDay: ReturnType<typeof solvesPerDay>;
  cumulative: ReturnType<typeof cumulativeVsIdeal>;
  difficulty: ReturnType<typeof difficultyByWeek>;
  quizzes: ReturnType<typeof quizTrend>;
  problemTracks: ReturnType<typeof coverage>;
  syllabusTracks: ReturnType<typeof coverage>;
  radar: ReturnType<typeof topicMastery>;
  leetcode: { username: string | null; stats: LeetCodeStats | null; trackedSolved: number; trackedTotal: number };
}

export async function getStats(now = new Date()): Promise<StatsData> {
  await connectDb();
  const s = await getSettings();
  const today = todayIn(s, now);
  const [progress, ticked, quizDocs, masteryDocs, daysComplete, lc] = await Promise.all([
    ProblemProgress.find({ status: "solved" }, { slug: 1, solveDates: 1 }).lean(),
    SubtopicProgress.find({}, { subtopicId: 1 }).lean(),
    Quiz.find({}, { date: 1, kind: 1, bestPct: 1, passed: 1, attempts: { $slice: 1 } }).lean(),
    Mastery.find({}, { ref: 1, score: 1, attempts: 1, masteredOn: 1 }).lean(),
    DayLog.countDocuments({ complete: true }),
    getLeetCodeStats(),
  ]);

  const rows: SolveRow[] = progress.flatMap((p) => {
    const c = problemBySlug.get(p.slug);
    return c ? [{ slug: p.slug, difficulty: c.difficulty, main: c.track === "main", solveDates: p.solveDates ?? [] }] : [];
  });
  const solvedSlugs = new Set(rows.map((r) => r.slug));
  const doneSubtopics = new Set(ticked.map((t) => t.subtopicId));
  const scores = new Map(masteryDocs.filter((m) => (m.attempts ?? 0) > 0).map((m) => [m.ref, m.score ?? 0]));
  const mastered = new Set(masteryDocs.flatMap((m) => (m.masteredOn ? [m.ref] : [])));

  const problemTrackLabels: Record<string, string> = { main: "DSA (main)", js: "JavaScript (30 Days)", sql: "SQL 50" };
  const radarTopics = orderedTopics()
    .filter((t) => t.track === RADAR_TRACK)
    .map((t) => ({ id: t.id, title: t.title, subtopicIds: t.subtopics.map((_, i) => subtopicId(t.id, i)) }));

  return {
    today,
    passPct: s.quizPassPct,
    totals: {
      solved: rows.length,
      mainSolved: rows.filter((r) => r.main).length,
      mainTotal: mainProblemCount,
      daysComplete,
      quizzesPassed: quizDocs.filter((q) => q.passed).length,
      mastered: mastered.size,
    },
    perDay: solvesPerDay(rows, today, 30),
    cumulative: cumulativeVsIdeal(rows, s.startDate, s.endDate, today, (d) => idealSolvedBy(d, mainProblemCount, s)),
    difficulty: difficultyByWeek(rows, s.startDate, today),
    quizzes: quizTrend(
      quizDocs.map((q) => ({ date: q.date, kind: q.kind as "daily" | "weekly", bestPct: q.bestPct ?? 0, attempted: (q.attempts?.length ?? 0) > 0 })),
    ),
    problemTracks: coverage(
      (["main", "js", "sql"] as const).map((key) => ({
        key,
        label: problemTrackLabels[key],
        ids: problems.filter((p) => p.track === key).map((p) => p.slug),
      })),
      solvedSlugs,
    ),
    syllabusTracks: coverage(
      tracks.map((t) => ({ key: t.id, label: t.name, ids: subtopics.filter((x) => x.track === t.id).map((x) => x.id) })),
      doneSubtopics,
    ),
    radar: topicMastery(radarTopics, scores, mastered),
    leetcode: { username: s.leetcodeUsername, stats: lc, trackedSolved: rows.length, trackedTotal: problems.length },
  };
}
