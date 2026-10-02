/**
 * Typed access to the static content in data/*.json — the seed source and the
 * read-only fallback for pages that don't need progress data.
 */
import problemsJson from "@/data/dsa-problems.json";
import newsJson from "@/data/news-sources.json";
import syllabusJson from "@/data/syllabus.json";
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
