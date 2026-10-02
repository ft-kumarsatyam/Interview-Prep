/**
 * Idempotent seed: upserts problems and topics from data/*.json and creates the
 * settings document if missing. Never touches progress collections.
 * Usage: npm run seed   (reads MONGODB_URI from .env.local)
 */
import mongoose from "mongoose";
import { orderedTopics, problems, subtopicId } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { Problem, Topic } from "@/lib/models/content";
import { Settings, SETTINGS_ID } from "@/lib/models/system";

async function main() {
  await connectDb();

  const problemOps = problems.map((p) => ({
    updateOne: { filter: { slug: p.slug }, update: { $set: p }, upsert: true },
  }));
  const pr = await Problem.bulkWrite(problemOps);
  const staleProblems = await Problem.deleteMany({ slug: { $nin: problems.map((p) => p.slug) } });
  console.log(`problems: ${pr.upsertedCount} new, ${pr.modifiedCount} updated, ${staleProblems.deletedCount} removed`);

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
  const tr = await Topic.bulkWrite(
    topicDocs.map((t) => ({ updateOne: { filter: { topicId: t.topicId }, update: { $set: t }, upsert: true } })),
  );
  const staleTopics = await Topic.deleteMany({ topicId: { $nin: topicDocs.map((t) => t.topicId) } });
  console.log(`topics: ${tr.upsertedCount} new, ${tr.modifiedCount} updated, ${staleTopics.deletedCount} removed`);

  const settings = await Settings.updateOne({ _id: SETTINGS_ID }, { $setOnInsert: { _id: SETTINGS_ID } }, { upsert: true });
  console.log(settings.upsertedCount ? "settings: created with defaults" : "settings: already present (unchanged)");

  await Promise.all([Problem.syncIndexes(), Topic.syncIndexes()]);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
