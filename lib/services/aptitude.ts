import { aptitudeBank } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { buildMockQuestions, buildTopicQuestions, type AptitudeQuestion, type DrillOptions } from "@/lib/domain/aptitude";
import { topicStats, type SessionRecord, type TopicStats } from "@/lib/domain/aptitude/progress";
import { APTITUDE_TOPICS, aptitudeTopicById, type AptitudeCategoryId } from "@/lib/domain/aptitude/topics";
import type { DateStr } from "@/lib/domain/dates";
import { buildHistory, seenSets, type AnswerEvent } from "@/lib/domain/question-history";
import type { Difficulty } from "@/lib/quiz/question";
import { AptitudeSession } from "@/lib/models/learning";
import { todayIn } from "./plan";
import { getSettings } from "./settings";

export const DRILL_SIZE = 10;
export const MOCK_SIZE = 20;
/** Sessions read when computing stats: plenty for a 20-answer window per topic. */
const SESSION_LIMIT = 600;

export interface AnswerResult {
  topic: string;
  correct: boolean;
  /** Milliseconds from first seeing the question to answering it. */
  ms: number;
  /** Hand-written questions only (bankKey). */
  key?: string;
}

export function newSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

export function drillQuestions(topicId: string, seed: number, opts: DrillOptions = {}, count = DRILL_SIZE): AptitudeQuestion[] {
  return buildTopicQuestions(topicId, count, seed, aptitudeBank, opts);
}

export function mockQuestions(category: AptitudeCategoryId, seed: number, opts: DrillOptions = {}, count = MOCK_SIZE): AptitudeQuestion[] {
  return buildMockQuestions(category, count, seed, aptitudeBank, opts);
}

/** Which hand-written questions you've answered (and which you last got wrong), to rotate the next drill. */
export async function bankHistory(topicIds?: readonly string[], difficulty?: Difficulty | null): Promise<DrillOptions> {
  await connectDb();
  const filter = topicIds ? { topicId: { $in: [...topicIds] } } : {};
  const rows = await AptitudeSession.find({ ...filter, $or: [{ "rightKeys.0": { $exists: true } }, { "wrongKeys.0": { $exists: true } }] }, { rightKeys: 1, wrongKeys: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .limit(SESSION_LIMIT)
    .lean();
  const events: AnswerEvent[] = rows.flatMap((r) => {
    const at = (r.createdAt as Date | undefined)?.getTime() ?? 0;
    return [...(r.rightKeys ?? []).map((id) => ({ id, correct: true, at })), ...(r.wrongKeys ?? []).map((id) => ({ id, correct: false, at }))];
  });
  return { ...seenSets(buildHistory(events)), difficulty: difficulty ?? null };
}

async function recentSessions(): Promise<SessionRecord[]> {
  await connectDb();
  const rows = await AptitudeSession.find().sort({ createdAt: -1 }).limit(SESSION_LIMIT).lean();
  return rows.map((r) => ({
    topicId: r.topicId,
    total: r.total,
    correct: r.correct,
    totalMs: r.totalMs,
    at: (r.createdAt as Date | undefined)?.toISOString() ?? "",
  }));
}

/** Rolls the answers up per topic and stores one row each. Unknown topics are ignored. */
export async function recordAptitudeResults(
  results: readonly AnswerResult[],
  mode: "topic" | "mock",
  now = new Date(),
): Promise<{ saved: number; date: DateStr }> {
  const settings = await getSettings();
  const date = todayIn(settings, now);
  const byTopic = new Map<string, { total: number; correct: number; totalMs: number; rightKeys: string[]; wrongKeys: string[] }>();
  for (const r of results) {
    if (!aptitudeTopicById.has(r.topic)) continue;
    const acc = byTopic.get(r.topic) ?? { total: 0, correct: 0, totalMs: 0, rightKeys: [], wrongKeys: [] };
    acc.total += 1;
    acc.correct += r.correct ? 1 : 0;
    acc.totalMs += Math.max(0, Math.round(r.ms));
    if (r.key?.startsWith(`${r.topic}:`)) (r.correct ? acc.rightKeys : acc.wrongKeys).push(r.key);
    byTopic.set(r.topic, acc);
  }
  if (byTopic.size === 0) return { saved: 0, date };
  await connectDb();
  await AptitudeSession.insertMany([...byTopic].map(([topicId, v]) => ({ topicId, mode, date, ...v })));
  return { saved: byTopic.size, date };
}

export interface AptitudeOverview {
  stats: Record<string, TopicStats>;
  today: { answered: number; correct: number };
  totalAnswered: number;
}

export async function getAptitudeOverview(now = new Date()): Promise<AptitudeOverview> {
  const [sessions, settings] = await Promise.all([recentSessions(), getSettings()]);
  const today = todayIn(settings, now);
  await connectDb();
  const todayRows = await AptitudeSession.find({ date: today }, { total: 1, correct: 1 }).lean();
  return {
    stats: Object.fromEntries(APTITUDE_TOPICS.map((t) => [t.id, topicStats(t.id, sessions)])),
    today: { answered: todayRows.reduce((n, r) => n + r.total, 0), correct: todayRows.reduce((n, r) => n + r.correct, 0) },
    totalAnswered: sessions.reduce((n, s) => n + s.total, 0),
  };
}

export async function getTopicHistory(topicId: string, limit = 8): Promise<Array<SessionRecord & { mode: "topic" | "mock"; date: string }>> {
  await connectDb();
  const rows = await AptitudeSession.find({ topicId }).sort({ createdAt: -1 }).limit(limit).lean();
  return rows.map((r) => ({
    topicId: r.topicId,
    total: r.total,
    correct: r.correct,
    totalMs: r.totalMs,
    at: (r.createdAt as Date | undefined)?.toISOString() ?? "",
    mode: r.mode,
    date: r.date,
  }));
}
