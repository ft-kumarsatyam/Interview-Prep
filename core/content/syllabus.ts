import syllabusJson from "@/data/syllabus.json";
import type { ContentTopic, ContentTrack, SubtopicInfo } from "@/core/content/types";

export const tracks = (syllabusJson.tracks as ContentTrack[]).toSorted((a, b) => a.order - b.order);
export const topics = syllabusJson.topics as ContentTopic[];

export const subtopicId = (topicId: string, index: number) => `${topicId}:${index}`;

export function orderedTopics(): ContentTopic[] {
  const trackOrder = new Map(tracks.map((t) => [t.id, t.order]));
  return topics.toSorted((a, b) => a.week - b.week || (trackOrder.get(a.track) ?? 0) - (trackOrder.get(b.track) ?? 0));
}

export const topicById = new Map(topics.map((t) => [t.id, t]));
export const trackById = new Map(tracks.map((t) => [t.id, t]));

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
