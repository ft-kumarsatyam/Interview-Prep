import { orderedTopics, problems, subtopicId } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { Problem, Topic } from "@/lib/models/content";
import { Settings, SETTINGS_ID } from "@/lib/models/system";

export interface SeedResult {
  problems: { inserted: number; updated: number; removed: number };
  topics: { inserted: number; updated: number; removed: number };
  settingsCreated: boolean;
}

/**
 * Idempotent: upserts problems and topics from data/*.json and creates the
 * settings document if missing. Never touches progress collections.
 */
export async function seedContent(): Promise<SeedResult> {
  await connectDb();

  const pr = await Problem.bulkWrite(problems.map((p) => ({ updateOne: { filter: { slug: p.slug }, update: { $set: p }, upsert: true } })));
  const staleProblems = await Problem.deleteMany({ slug: { $nin: problems.map((p) => p.slug) } });

  const topicDocs = orderedTopics().map((t, position) => ({
    topicId: t.id,
    track: t.track,
    week: t.week,
    level: t.level,
    title: t.title,
    position,
    resources: t.resources,
    subtopics: t.subtopics.map((title, i) => ({ id: subtopicId(t.id, i), title })),
  }));
  const tr = await Topic.bulkWrite(topicDocs.map((t) => ({ updateOne: { filter: { topicId: t.topicId }, update: { $set: t }, upsert: true } })));
  const staleTopics = await Topic.deleteMany({ topicId: { $nin: topicDocs.map((t) => t.topicId) } });

  const settings = await Settings.updateOne({ _id: SETTINGS_ID }, { $setOnInsert: { _id: SETTINGS_ID } }, { upsert: true });
  await Promise.all([Problem.syncIndexes(), Topic.syncIndexes()]);

  return {
    problems: { inserted: pr.upsertedCount, updated: pr.modifiedCount, removed: staleProblems.deletedCount },
    topics: { inserted: tr.upsertedCount, updated: tr.modifiedCount, removed: staleTopics.deletedCount },
    settingsCreated: settings.upsertedCount > 0,
  };
}
