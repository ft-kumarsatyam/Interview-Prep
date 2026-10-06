import { courses } from "@/core/courses";
import { problemBySlug, subtopicById } from "@/core/content";
import { connectDb } from "@/core/db";
import { ProblemProgress, SubtopicProgress } from "@/core/models/progress";
import { getDoneByCourse } from "@/modules/course/services/progress";
import { nextCourseLesson } from "@/modules/course/domain/course";
import { getPracticeCatalog } from "@/modules/practice/services/catalog";
import { recommend } from "@/modules/practice/domain/catalog";
import { getSettings } from "@/modules/settings/services/settings";
import { getRoadmapState } from "@/modules/roadmap/services/roadmap";
import { roadmapById } from "@/core/roadmaps";
import { ensureToday, type TodayState } from "@/modules/planner/services/plan";
import { buildStudyQueue, type StudyFlowItem } from "@/modules/study-flow/domain/study-flow";

export interface StudyFlow {
  items: StudyFlowItem[];
  next: StudyFlowItem | null;
}

const problemMinutes = (slug: string): number => {
  const difficulty = problemBySlug.get(slug)?.difficulty;
  return difficulty === "Hard" ? 55 : difficulty === "Easy" ? 20 : 35;
};

/** Builds the one actionable queue used by the dashboard and planner surfaces. */
export async function getStudyFlow(prior?: TodayState): Promise<StudyFlow> {
  const state = prior ?? await ensureToday();
  await connectDb();
  const { plan, today, settings } = state;
  const slugs = [...new Set([...plan.dsaNew, ...plan.dsaReview, plan.jsProblem, plan.sqlProblem].filter((x): x is string => !!x))];
  const [problemRows, theoryRows, doneByCourse, catalog] = await Promise.all([
    ProblemProgress.find({ slug: { $in: slugs } }, { slug: 1, solveDates: 1 }).lean(),
    SubtopicProgress.find({ subtopicId: { $in: plan.theory } }, { subtopicId: 1 }).lean(),
    getDoneByCourse(),
    getPracticeCatalog(),
  ]);
  const solvedToday = new Set(problemRows.filter((row) => row.solveDates?.includes(today)).map((row) => row.slug));
  const doneTheory = new Set(theoryRows.map((row) => row.subtopicId));

  const required: StudyFlowItem[] = [
    ...[...plan.dsaNew, ...plan.dsaReview, plan.jsProblem, plan.sqlProblem]
      .filter((slug): slug is string => !!slug)
      .map((slug) => ({
        id: `problem:${slug}`,
        kind: plan.dsaReview.includes(slug) ? "review" as const : "dsa" as const,
        title: problemBySlug.get(slug)?.title ?? slug,
        href: `/dsa/${slug}`,
        minutes: problemMinutes(slug),
        bucket: "required" as const,
        done: solvedToday.has(slug),
        reason: plan.dsaReview.includes(slug) ? "Due spaced-repetition review" : "Today's frozen plan",
      })),
    ...plan.theory.flatMap((id) => {
      const topic = subtopicById.get(id);
      return topic ? [{
        id: `theory:${id}`,
        kind: "theory" as const,
        title: topic.title,
        href: `/learn/${topic.topicId}`,
        minutes: 25,
        bucket: "required" as const,
        done: doneTheory.has(id),
        reason: "Today's theory target",
      }] : [];
    }),
    {
      id: `quiz:${today}`,
      kind: "quiz",
      title: plan.kind === "sunday" ? "Weekly quiz" : "Daily quiz",
      href: "/quiz",
      minutes: 15,
      bucket: "required",
      done: state.day.quizPassed,
      locked: !state.day.quizUnlocked && !state.day.quizPassed,
      reason: "Required to complete the day",
    },
  ];

  const roadmapItems: StudyFlowItem[] = [];
  for (const roadmapId of settings.studyFlowRoadmaps) {
    const roadmap = roadmapById.get(roadmapId);
    if (!roadmap) continue;
    const roadmapState = await getRoadmapState(roadmap);
    const next = roadmap.sections.flatMap((section) => section.nodes).find((node) => !roadmapState.statuses.get(node.id)?.done && node.priority !== "skip");
    if (next) roadmapItems.push({
      id: `roadmap:${roadmap.id}:${next.id}`,
      kind: "roadmap",
      title: `${roadmap.title}: ${next.title}`,
      href: `/roadmaps/${roadmap.id}#node-${next.id}`,
      minutes: 30,
      bucket: "recommended",
      done: false,
      reason: next.priority === "must" ? "Next must-do roadmap node" : "Next roadmap node",
      source: roadmap.id,
      priority: next.priority,
    });
  }

  const courseItems: StudyFlowItem[] = [];
  if (settings.studyFlowCourses) {
    for (const course of courses) {
      const done = new Set((doneByCourse.get(course.id) ?? new Map()).keys());
      const next = nextCourseLesson(course, done);
      if (!next) continue;
      courseItems.push({
        id: `course:${course.id}:${next.id}`,
        kind: "course",
        title: `${course.title}: ${next.title}`,
        href: `/courses/${course.id}/${next.id}`,
        minutes: next.minutes,
        bucket: "recommended",
        done: false,
        reason: "Continue your selected course",
        source: course.id,
      });
    }
  }

  const practiceItems: StudyFlowItem[] = recommend(catalog.entries, catalog.studiedTopics, 4)
    .map((entry) => ({
      id: `practice:${entry.id}`,
      kind: "practice" as const,
      title: entry.title,
      href: entry.href,
      minutes: 20,
      bucket: "optional" as const,
      done: false,
      reason: "Suggested from your unfinished practice",
      source: entry.subject,
    }));

  const items = buildStudyQueue({
    dayKind: plan.kind,
    minutesAvailable: Math.round((plan.hours ?? 0) * 60),
    required,
    roadmap: roadmapItems,
    courses: courseItems,
    practice: practiceItems,
  });
  return { items, next: items.find((item) => !item.done && !item.locked) ?? null };
}
