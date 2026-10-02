/**
 * Typed access to the static content in data/*.json — the seed source and the
 * read-only fallback for pages that don't need progress data.
 */
import problemsJson from "@/data/dsa-problems.json";
import newsJson from "@/data/news-sources.json";
import syllabusJson from "@/data/syllabus.json";
import systemDesignJson from "@/data/system-design.json";
import type { DesignSectionId } from "./domain/design";
import type { ProblemTrack } from "./domain/planner";

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface ContentProblem {
  slug: string;
  title: string;
  leetcodeId: number;
  difficulty: Difficulty;
  pattern: string;
  track: ProblemTrack;
  tier: "core" | "extended";
  url: string;
  order: number;
}

export interface ContentTrack {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface ContentTopic {
  id: string;
  track: string;
  week: number;
  level: number;
  title: string;
  subtopics: string[];
  resources: string[];
}

export interface NewsFeed {
  id: string;
  name: string;
  category: string;
  url: string;
}

export interface DesignStep {
  id: DesignSectionId;
  title: string;
  minutes: number;
  goal: string;
  checklist: string[];
}

export interface DesignBlock {
  id: string;
  name: string;
  summary: string;
  useWhen: string[];
  tradeoffs: string[];
  pitfall: string;
  keywords: string[];
}

export interface DesignCase {
  slug: string;
  title: string;
  topicId: string;
  practiceRef: string;
  level: "core" | "advanced";
  summary: string;
  keywords: string[];
  functional: string[];
  nonFunctional: string[];
  estimates: string[];
  api: string[];
  dataModel: string[];
  /** Mermaid flowchart source (trusted repo content). */
  diagram: string;
  deepDives: Array<{ title: string; body: string }>;
  tradeoffs: string[];
  probes: string[];
  blocks: string[];
  readings: Array<{ title: string; url: string }>;
}

export const systemDesign = {
  framework: systemDesignJson.framework as {
    steps: DesignStep[];
    latency: Array<{ label: string; value: string }>;
    numbers: Array<{ label: string; value: string }>;
    rubric: Array<{ id: string; label: string }>;
  },
  blocks: systemDesignJson.blocks as DesignBlock[],
  cases: systemDesignJson.cases as DesignCase[],
};
export const designCaseBySlug = new Map(systemDesign.cases.map((c) => [c.slug, c]));
export const designBlockById = new Map(systemDesign.blocks.map((b) => [b.id, b]));

export const problems = problemsJson as ContentProblem[];
export const tracks = (syllabusJson.tracks as ContentTrack[]).toSorted((a, b) => a.order - b.order);
export const topics = syllabusJson.topics as ContentTopic[];

export const news = {
  feeds: newsJson.feeds as NewsFeed[],
  categories: newsJson.categories,
  browseOnly: newsJson.browseOnly,
  googleNews: newsJson.googleNews,
  maxItemsPerFeed: newsJson.maxItemsPerFeed,
};

/** Stable id for a subtopic: `${topicId}:${index}`. */
export const subtopicId = (topicId: string, index: number) => `${topicId}:${index}`;

/** Topics sorted by week then track order — the canonical study order. */
export function orderedTopics(): ContentTopic[] {
  const trackOrder = new Map(tracks.map((t) => [t.id, t.order]));
  return topics.toSorted((a, b) => a.week - b.week || (trackOrder.get(a.track) ?? 0) - (trackOrder.get(b.track) ?? 0));
}

export interface SubtopicInfo {
  id: string;
  topicId: string;
  topicTitle: string;
  track: string;
  title: string;
  week: number;
  /** Global study order (topic position, then index inside the topic). */
  position: number;
}

export const problemBySlug = new Map(problems.map((p) => [p.slug, p]));
export const topicById = new Map(topics.map((t) => [t.id, t]));
export const trackById = new Map(tracks.map((t) => [t.id, t]));

/** Every subtopic in study order. */
export const subtopics: SubtopicInfo[] = orderedTopics().flatMap((t, topicPos) =>
  t.subtopics.map((title, i) => ({
    id: subtopicId(t.id, i),
    topicId: t.id,
    topicTitle: t.title,
    track: t.track,
    title,
    week: t.week,
    position: topicPos * 1000 + i,
  })),
);
export const subtopicById = new Map(subtopics.map((s) => [s.id, s]));
export const mainProblemCount = problems.filter((p) => p.track === "main").length;
