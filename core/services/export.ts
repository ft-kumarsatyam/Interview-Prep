import { connectDb } from "@/core/db";
import { CustomProblem, CustomSolve } from "@/core/models/content";
import { DailyPlan, DayLog, Quiz } from "@/core/models/day";
import { MockSession } from "@/core/models/mock";
import { PlanChange, StudySession } from "@/core/models/planner";
import { AptitudeSession, Design, Mastery, PracticeAnswer, PracticeAttempt, Snippet } from "@/core/models/learning";
import { ProblemProgress, SubtopicProgress } from "@/core/models/progress";
import { Job } from "@/core/models/jobs";
import { CourseLessonProgress } from "@/core/models/course";
import { RoadmapEnrollment, RoadmapNodeProgress } from "@/core/models/roadmap";
import { WebInterviewProgress, WebLessonProgress, WebProjectProgress } from "@/core/models/webdev";
import { Resume } from "@/core/models/resume";
import { Article, Notification, Settings } from "@/core/models/system";

export const EXPORT_VERSION = 1;

/**
 * Everything you created, keyed by collection. Content (problems, topics) is
 * omitted because it's rebuilt from data/*.json; only articles you read or
 * bookmarked are kept since the rest expire anyway.
 */
export async function exportBackup(now = new Date()) {
  await connectDb();
  const [settings, problemprogress, subtopicprogress, dailyplans, daylogs, quizzes, masteries, practiceattempts, snippets, notifications, articles, designs, practiceanswers, customproblems, customsolves, mocksessions, aptitudesessions, planchanges, studysessions, resumes, jobs, weblessonprogress, webprojectprogress, webinterviewprogress, courselessonprogress, roadmapenrollments, roadmapnodeprogress] =
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
      PracticeAnswer.find().lean(),
      CustomProblem.find().lean(),
      CustomSolve.find().sort({ date: 1 }).lean(),
      MockSession.find().sort({ startedAt: 1 }).lean(),
      AptitudeSession.find().sort({ createdAt: 1 }).lean(),
      PlanChange.find().sort({ createdAt: 1 }).lean(),
      StudySession.find().sort({ createdAt: 1 }).lean(),
      Resume.find().sort({ createdAt: 1 }).lean(),
      Job.find().sort({ createdAt: 1 }).lean(),
      WebLessonProgress.find().lean(),
      WebProjectProgress.find().lean(),
      WebInterviewProgress.find().lean(),
      CourseLessonProgress.find().lean(),
      RoadmapEnrollment.find().lean(),
      RoadmapNodeProgress.find().lean(),
    ]);
  return {
    app: "PrepOS",
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    collections: { settings, problemprogress, subtopicprogress, dailyplans, daylogs, quizzes, masteries, practiceattempts, snippets, notifications, articles, designs, practiceanswers, customproblems, customsolves, mocksessions, aptitudesessions, planchanges, studysessions, resumes, jobs, weblessonprogress, webprojectprogress, webinterviewprogress, courselessonprogress, roadmapenrollments, roadmapnodeprogress },
  };
}
