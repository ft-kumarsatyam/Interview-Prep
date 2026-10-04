/**
 * What you have actually studied, from every place that records it: syllabus subtopics you ticked, and course
 * lessons you finished (a lesson's `practiceRef` names the syllabus subtopic or topic it teaches). Quizzes,
 * recommendations and the practice hub read this one answer. Reading a lesson never ticks a subtopic for the plan;
 * that is a separate, confirmed step. Pure.
 */

export interface StudiedInput {
  /** Syllabus subtopic ids you ticked. */
  doneSubtopics: Iterable<string>;
  /** Finished lessons as `${courseId}/${lessonId}`. */
  doneLessons: Iterable<string>;
  /** The syllabus subtopic or topic id a lesson teaches, if it names one. */
  lessonRef: (lessonKey: string) => string | undefined;
  /** The topic a subtopic belongs to; undefined when the id is not a subtopic. */
  topicOf: (subtopicId: string) => string | undefined;
  /** Every subtopic of a topic; empty when the id is not a topic. */
  subtopicsOf: (topicId: string) => readonly string[];
}

export interface Studied {
  /** Studied syllabus subtopic ids. */
  subtopics: Set<string>;
  /** Topics with at least one studied subtopic. */
  topics: Set<string>;
  /** Subtopics studied only through a lesson, not ticked: these are the ones worth offering to tick. */
  viaLessonsOnly: Set<string>;
}

export function studiedRefs(input: StudiedInput): Studied {
  const ticked = new Set(input.doneSubtopics);
  const subtopics = new Set<string>();
  const topics = new Set<string>();
  const add = (id: string) => {
    subtopics.add(id);
    const t = input.topicOf(id);
    if (t) topics.add(t);
  };
  for (const id of ticked) add(id);

  const fromLessons = new Set<string>();
  for (const key of input.doneLessons) {
    const ref = input.lessonRef(key);
    if (!ref) continue;
    if (input.topicOf(ref)) fromLessons.add(ref);
    else for (const id of input.subtopicsOf(ref)) fromLessons.add(id); // a lesson that teaches a whole topic
  }
  for (const id of fromLessons) add(id);

  return { subtopics, topics, viaLessonsOnly: new Set([...fromLessons].filter((id) => !ticked.has(id))) };
}

export interface LessonRefEntry {
  key: string;
  practiceRef?: string | undefined;
}

/**
 * Subtopic id -> the lesson that teaches it, for "Read the lesson" links and the confirm card. The first lesson
 * in course order wins when two lessons name the same subtopic. Lessons whose ref is a topic (not a subtopic) are skipped.
 */
export function lessonBySubtopic(lessons: Iterable<LessonRefEntry>, isSubtopic: (id: string) => boolean): Map<string, string> {
  const out = new Map<string, string>();
  for (const l of lessons) if (l.practiceRef && isSubtopic(l.practiceRef) && !out.has(l.practiceRef)) out.set(l.practiceRef, l.key);
  return out;
}
