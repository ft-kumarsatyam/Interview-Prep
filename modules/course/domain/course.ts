/**
 * Long-form courses (DSA, System Design): chapters of lessons, each with tabbed parts (e.g. HLD / LLD),
 * diagrams, code in several languages, a complexity table, linked problems and a self-check. Separate from
 * the syllabus, so it never changes the plan, the streak or the deadline maths. Pure.
 */
import { z } from "zod";

const text = (max: number, min = 1) => z.string().trim().min(min).max(max);
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const https = z.string().url().refine((u) => u.startsWith("https://"), "Use an https link");

export const COURSE_LANGS = ["js", "ts", "python", "java", "cpp", "go", "sql", "bash", "yaml", "dockerfile", "hcl"] as const;
export const LANG_LABEL: Record<(typeof COURSE_LANGS)[number], string> = { js: "JavaScript", ts: "TypeScript", python: "Python", java: "Java", cpp: "C++", go: "Go", sql: "SQL", bash: "Shell", yaml: "YAML", dockerfile: "Dockerfile", hcl: "Terraform" };

const masteryProblemSchema = z.object({
  id,
  level: z.enum(["Easy", "Medium", "Hard"]),
  pattern: text(80, 2),
  prompt: text(240, 10),
  slug: id.optional(),
});

const masteryRecognitionSchema = z.object({
  signal: text(180, 10),
  pattern: text(80, 2),
  tools: z.array(text(80, 1)).min(1).max(5),
});

const masteryPhaseSchema = z.object({
  id,
  title: text(80, 2),
  focus: text(240, 10),
  problemIds: z.array(id).min(1).max(60),
});

const masteryRerunSchema = z.object({
  after: text(120, 3),
  problemIds: z.array(id).min(1).max(20),
  objective: text(240, 10),
});

export const masteryRoadmapSchema = z.object({
  goal: text(500, 20),
  doneWhen: z.array(text(240, 10)).min(4).max(8),
  recognitionMap: z.array(masteryRecognitionSchema).min(1).max(12),
  phases: z.array(masteryPhaseSchema).min(1).max(8),
  problems: z.array(masteryProblemSchema).min(1).max(60),
  reruns: z.array(masteryRerunSchema).min(1).max(8),
  interviewChecklist: z.array(text(240, 10)).min(3).max(8),
});

export type MasteryProblem = z.infer<typeof masteryProblemSchema>;
export type MasteryRoadmap = z.infer<typeof masteryRoadmapSchema>;

export const courseCheckSchema = z
  .object({ q: text(300, 10), options: z.array(text(200)).min(3).max(4), answer: z.number().int().min(0).max(3), why: text(400, 10) })
  .refine((c) => c.answer < c.options.length, "answer must index an option");

export const lessonPartSchema = z.object({
  id,
  label: text(30),
  body: text(30000, 200),
  diagrams: z.array(z.object({ title: text(80), code: text(3000, 10) })).max(4).default([]),
  code: z.array(z.object({ lang: z.enum(COURSE_LANGS), source: text(6000, 10) })).max(6).default([]),
});

export const courseLessonSchema = z.object({
  id,
  title: text(100),
  minutes: z.number().int().min(3).max(60),
  summary: text(240, 10),
  parts: z.array(lessonPartSchema).min(1).max(4),
  complexity: z.array(z.object({ op: text(80), time: text(40), space: text(40).default("") })).max(14).default([]),
  keyPoints: z.array(text(240, 5)).min(3).max(8),
  problems: z.array(z.string()).max(10).default([]),
  /** A syllabus topic or subtopic id whose practice quiz backs this lesson (optional). */
  practiceRef: z.string().optional(),
  mastery: masteryRoadmapSchema.optional(),
  check: z.array(courseCheckSchema).length(3),
  sources: z.array(z.object({ title: text(120), url: https })).max(6).default([]),
});
export type CourseLesson = z.infer<typeof courseLessonSchema>;

export const courseChapterFileSchema = z.object({
  chapter: z.object({ id, title: text(80), summary: text(240, 10) }),
  lessons: z.array(courseLessonSchema).min(1),
});
export type CourseChapterFile = z.infer<typeof courseChapterFileSchema>;

export const courseMetaSchema = z.object({ id, title: text(60), blurb: text(300, 10), intro: text(6000, 100), audience: text(160) });
export type CourseMeta = z.infer<typeof courseMetaSchema>;

export interface CourseChapter {
  id: string;
  title: string;
  summary: string;
  lessons: CourseLesson[];
}
export interface Course extends CourseMeta {
  chapters: CourseChapter[];
}

/** Markdown with fenced and inline code removed: code is rendered as text, so tags inside it are safe to show. */
export const proseOnly = (md: string): string => md.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");

/** Every problem with the content as a list of messages (empty when it is consistent). */
export function courseProblems(courses: readonly Course[], problemSlugs: ReadonlySet<string>, refs?: (ref: string) => boolean): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of courses) {
    const chapterIds = c.chapters.map((ch) => ch.id);
    chapterIds.forEach((x, i) => chapterIds.indexOf(x) !== i && out.push(`${c.id}: duplicate chapter ${x}`));
    for (const ch of c.chapters)
      for (const l of ch.lessons) {
        const key = `${c.id}/${l.id}`;
        if (seen.has(key)) out.push(`duplicate lesson ${key}`);
        seen.add(key);
        for (const p of l.problems) if (!problemSlugs.has(p)) out.push(`${key}: unknown problem ${p}`);
        if (l.practiceRef && refs && !refs(l.practiceRef)) out.push(`${key}: unknown practiceRef ${l.practiceRef}`);
        const partIds = l.parts.map((p) => p.id);
        partIds.forEach((x, i) => partIds.indexOf(x) !== i && out.push(`${key}: duplicate part ${x}`));
        for (const p of l.parts) if (/<\/?(script|iframe|style|img)\b/i.test(proseOnly(p.body))) out.push(`${key}: raw HTML in ${p.id}`);
        if (new Set(l.check.map((q) => q.q)).size !== l.check.length) out.push(`${key}: repeated check question`);
        if (l.mastery) {
          const problemIds = new Set<string>();
          for (const p of l.mastery.problems) {
            if (problemIds.has(p.id)) out.push(`${key}: duplicate mastery problem ${p.id}`);
            problemIds.add(p.id);
            if (p.slug && !problemSlugs.has(p.slug)) out.push(`${key}: unknown mastery problem ${p.slug}`);
          }
          const known = new Set(l.mastery.problems.map((p) => p.id));
          for (const phase of l.mastery.phases)
            for (const problemId of phase.problemIds)
              if (!known.has(problemId)) out.push(`${key}: phase ${phase.id} references unknown mastery problem ${problemId}`);
          for (const rerun of l.mastery.reruns)
            for (const problemId of rerun.problemIds)
              if (!known.has(problemId)) out.push(`${key}: rerun references unknown mastery problem ${problemId}`);
        }
      }
  }
  return out;
}

export function masteryPhaseProgress(roadmap: MasteryRoadmap, solved: ReadonlySet<string>): Array<{ id: string; title: string; done: number; total: number }> {
  return roadmap.phases.map((phase) => ({
    id: phase.id,
    title: phase.title,
    done: phase.problemIds.filter((problemId) => solved.has(problemId)).length,
    total: phase.problemIds.length,
  }));
}

export function masteryProblemById(roadmap: MasteryRoadmap, problemId: string): MasteryProblem | undefined {
  return roadmap.problems.find((problem) => problem.id === problemId);
}

/* --------------------------------- progress --------------------------------- */

export const flatLessons = (course: Course): Array<CourseLesson & { chapterId: string }> => course.chapters.flatMap((ch) => ch.lessons.map((l) => ({ ...l, chapterId: ch.id })));

export function courseProgress(course: Course, done: ReadonlySet<string>): { done: number; total: number; pct: number } {
  const all = flatLessons(course);
  const n = all.filter((l) => done.has(l.id)).length;
  return { done: n, total: all.length, pct: all.length ? Math.round((100 * n) / all.length) : 0 };
}

export function chapterProgress(chapter: CourseChapter, done: ReadonlySet<string>): { done: number; total: number } {
  return { done: chapter.lessons.filter((l) => done.has(l.id)).length, total: chapter.lessons.length };
}

/** The first lesson you haven't finished, in course order. */
export function nextCourseLesson(course: Course, done: ReadonlySet<string>): (CourseLesson & { chapterId: string }) | null {
  return flatLessons(course).find((l) => !done.has(l.id)) ?? null;
}

export function courseNeighbours(course: Course, lessonId: string): { prev: CourseLesson | null; next: CourseLesson | null } {
  const all = flatLessons(course);
  const i = all.findIndex((l) => l.id === lessonId);
  return { prev: all[i - 1] ?? null, next: all[i + 1] ?? null };
}

export const readingMinutes = (words: number): number => Math.max(1, Math.round(words / 200));
