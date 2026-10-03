import { aptitudeTopicById } from "./topics";

export interface SessionRecord {
  topicId: string;
  total: number;
  correct: number;
  totalMs: number;
  /** ISO timestamp, newest first when sorted by the caller. */
  at: string;
}

export type TopicStatus = "new" | "practising" | "mastered";

export interface TopicStats {
  attempted: number;
  correct: number;
  accuracy: number | null;
  /** Average seconds per answered question across the recent window. */
  avgSec: number | null;
  sessions: number;
  status: TopicStatus;
  speed: "fast" | "ok" | "slow" | null;
}

/** A topic is mastered once the latest 20 answers hit 80% accuracy. */
export const MASTERY_WINDOW = 20;
export const MASTERY_ACCURACY = 0.8;

export const EMPTY_STATS: TopicStats = { attempted: 0, correct: 0, accuracy: null, avgSec: null, sessions: 0, status: "new", speed: null };

/** Rolls sessions (newest first) up to the first `MASTERY_WINDOW` questions, always taking whole sessions. */
export function topicStats(topicId: string, sessionsNewestFirst: readonly SessionRecord[]): TopicStats {
  const mine = sessionsNewestFirst.filter((s) => s.topicId === topicId && s.total > 0);
  if (mine.length === 0) return EMPTY_STATS;
  let attempted = 0;
  let correct = 0;
  let totalMs = 0;
  for (const s of mine) {
    attempted += s.total;
    correct += s.correct;
    totalMs += s.totalMs;
    if (attempted >= MASTERY_WINDOW) break;
  }
  const accuracy = correct / attempted;
  const avgSec = totalMs / attempted / 1000;
  const target = aptitudeTopicById.get(topicId)?.targetSec ?? 40;
  const mastered = attempted >= MASTERY_WINDOW && accuracy >= MASTERY_ACCURACY;
  return {
    attempted,
    correct,
    accuracy,
    avgSec,
    sessions: mine.length,
    status: mastered ? "mastered" : "practising",
    speed: avgSec <= target ? "fast" : avgSec <= target * 1.5 ? "ok" : "slow",
  };
}

/** Whole-number percent for display. */
export const percent = (n: number | null): string => (n === null ? "–" : `${Math.round(n * 100)}%`);

export interface RunAnswer {
  topic: string;
  /** Hand-written questions only (bankKey). */
  key?: string;
  /** Chosen option index, or null when skipped or timed out. */
  choice: number | null;
  answerIndex: number;
  ms: number;
}

export interface RunSummary {
  total: number;
  answered: number;
  correct: number;
  accuracy: number;
  avgSec: number;
  /** Answers given faster than the topic target. */
  withinTarget: number;
  /** Topics sorted weakest first (lowest accuracy, then slowest). */
  perTopic: Array<{ topic: string; total: number; correct: number; avgSec: number }>;
}

export function summarizeRun(answers: readonly RunAnswer[]): RunSummary {
  const topics = new Map<string, { total: number; correct: number; ms: number }>();
  let correct = 0;
  let answered = 0;
  let ms = 0;
  let withinTarget = 0;
  for (const a of answers) {
    const ok = a.choice !== null && a.choice === a.answerIndex;
    if (a.choice !== null) answered++;
    if (ok) correct++;
    ms += a.ms;
    const target = (aptitudeTopicById.get(a.topic)?.targetSec ?? 40) * 1000;
    if (ok && a.ms <= target) withinTarget++;
    const t = topics.get(a.topic) ?? { total: 0, correct: 0, ms: 0 };
    t.total++;
    t.ms += a.ms;
    if (ok) t.correct++;
    topics.set(a.topic, t);
  }
  const total = answers.length;
  return {
    total,
    answered,
    correct,
    accuracy: total === 0 ? 0 : correct / total,
    avgSec: total === 0 ? 0 : ms / total / 1000,
    withinTarget,
    perTopic: [...topics]
      .map(([topic, t]) => ({ topic, total: t.total, correct: t.correct, avgSec: t.ms / t.total / 1000 }))
      .sort((x, y) => x.correct / x.total - y.correct / y.total || y.avgSec - x.avgSec),
  };
}
