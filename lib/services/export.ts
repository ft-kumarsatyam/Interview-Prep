import { connectDb } from "@/lib/db";
import { DailyPlan, DayLog, Quiz } from "@/lib/models/day";
import { Design, Mastery, PracticeAttempt, Snippet } from "@/lib/models/learning";
import { ProblemProgress, SubtopicProgress } from "@/lib/models/progress";
import { Article, Notification, Settings } from "@/lib/models/system";

export const EXPORT_VERSION = 1;

/**
 * Everything you created, keyed by collection. Content (problems, topics) is
 * omitted because it's rebuilt from data/*.json; only articles you read or
 * bookmarked are kept since the rest expire anyway.
 */
export async function exportBackup(now = new Date()) {
  await connectDb();
  const [settings, problemprogress, subtopicprogress, dailyplans, daylogs, quizzes, masteries, practiceattempts, snippets, notifications, articles, designs] =
    await Promise.all([
      Settings.find().lean(),
      ProblemProgress.find().lean(),
      SubtopicProgress.find().lean(),
      DailyPlan.find().sort({ date: 1 }).lean(),
      DayLog.find().sort({ date: 1 }).lean(),
      Quiz.find().sort({ date: 1 }).lean(),
      Mastery.find().lean(),
      PracticeAttempt.find().sort({ createdAt: 1 }).lean(),
      Snippet.find().lean(),
      Notification.find().sort({ createdAt: 1 }).lean(),
      Article.find({ $or: [{ read: true }, { bookmarked: true }] }, { content: 0 }).lean(),
      Design.find().lean(),
    ]);
  return {
    app: "PrepOS",
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    collections: { settings, problemprogress, subtopicprogress, dailyplans, daylogs, quizzes, masteries, practiceattempts, snippets, notifications, articles, designs },
  };
}
