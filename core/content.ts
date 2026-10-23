/**
 * Light catalogue surface: problems, syllabus, design, news and company/career lists.
 * Heavy trees (testcases, sheets, notes, webdev, web-interview) live in `core/content/*`
 * and must be imported from there. Importing this file no longer evaluates those trees.
 */
export type {
  CareerDeepLink,
  ContentProblem,
  ContentSheet,
  ContentSheetItem,
  ContentTopic,
  ContentTrack,
  DesignBlock,
  DesignCase,
  DesignCategory,
  DesignStep,
  Difficulty,
  EngineeringBlog,
  NewsFeed,
  PracticeCase,
  ProblemTestCase,
  ProblemTestcaseEntry,
  SubtopicInfo,
} from "@/core/content/types";
export { DESIGN_CATEGORIES } from "@/core/content/types";

export { authoredStatementBySlug, extraProblems, mainProblemCount, problemBySlug, problems } from "@/core/content/problems";
export { orderedTopics, subtopicById, subtopicId, subtopics, topicById, topics, trackById, tracks } from "@/core/content/syllabus";
export { designBlockById, designCaseBySlug, practiceCaseBySlug, practiceCases, systemDesign } from "@/core/content/design";
export { news } from "@/core/content/news";
export {
  aptitudeBank,
  careerDeepLinks,
  careerSources,
  companyById,
  companyCatalog,
  engineeringBlogs,
  tierById,
  tierProfiles,
} from "@/core/content/catalog";
