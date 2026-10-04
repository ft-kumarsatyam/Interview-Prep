/**
 * Web development and architecture learning: authored lessons with a self-check, and guided projects with
 * milestones. This content is deliberately separate from the syllabus, so it never changes the study plan,
 * the backlog or the deadline maths. Pure.
 */
import { z } from "zod";
import { resumeSchema, type ResumeDoc } from "./resume";

const text = (max: number, min = 1) => z.string().trim().min(min).max(max);
const https = z.string().url().refine((u) => u.startsWith("https://"), "Use an https link");

export const checkQuestionSchema = z
  .object({ q: text(300, 10), options: z.array(text(200)).min(3).max(4), answer: z.number().int().min(0).max(3), why: text(300, 10) })
  .refine((c) => c.answer < c.options.length, "answer must index an option");

export const webLessonSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  track: z.string(),
  title: text(100),
  minutes: z.number().int().min(3).max(30),
  summary: text(200, 10),
  body: text(8000, 400),
  keyPoints: z.array(text(200)).min(3).max(6),
  interview: z.array(text(200)).min(2).max(5),
  check: z.array(checkQuestionSchema).length(3),
  resources: z.array(z.object({ title: text(120), url: https })).min(1).max(4),
});
export type WebLesson = z.infer<typeof webLessonSchema>;

export const webProjectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: text(100),
  level: z.enum(["intermediate", "advanced"]),
  hours: z.number().int().min(8).max(80),
  stack: z.array(text(60)).min(2).max(8),
  summary: text(300, 20),
  why: text(600, 20),
  architecture: text(2000, 40),
  lessons: z.array(z.string()).min(2).max(8),
  milestones: z.array(z.object({ id: z.string().regex(/^m\d+$/), title: text(100), details: z.array(text(300)).min(2).max(5) })).min(5).max(8),
  stretch: z.array(text(200)).min(2).max(6),
  resume: z.array(text(300, 20)).min(2).max(5),
  talking: z.array(text(200)).min(3).max(6),
});
export type WebProject = z.infer<typeof webProjectSchema>;

export const webTrackSchema = z.object({ id: z.string(), name: text(60), color: z.string(), blurb: text(200) });
export type WebTrack = z.infer<typeof webTrackSchema>;

export const webdevFileSchema = z.object({ tracks: z.array(webTrackSchema).min(1), lessons: z.array(webLessonSchema).min(1), projects: z.array(webProjectSchema).min(1) });

/** Every problem with the content as a list of messages (empty when it is consistent). */
export function webdevProblems(file: { tracks: readonly WebTrack[]; lessons: readonly WebLesson[]; projects: readonly WebProject[] }): string[] {
  const out: string[] = [];
  const dup = (ids: string[], what: string) => ids.forEach((id, i) => ids.indexOf(id) !== i && out.push(`duplicate ${what} ${id}`));
  dup(file.tracks.map((t) => t.id), "track");
  dup(file.lessons.map((l) => l.id), "lesson");
  dup(file.projects.map((p) => p.slug), "project");
  const tracks = new Set(file.tracks.map((t) => t.id));
  const lessons = new Set(file.lessons.map((l) => l.id));
  for (const l of file.lessons) if (!tracks.has(l.track)) out.push(`lesson ${l.id}: unknown track ${l.track}`);
  for (const t of file.tracks) if (!file.lessons.some((l) => l.track === t.id)) out.push(`track ${t.id} has no lessons`);
  for (const p of file.projects) {
    for (const id of p.lessons) if (!lessons.has(id)) out.push(`project ${p.slug}: unknown lesson ${id}`);
    dup(p.milestones.map((m) => m.id), `milestone in ${p.slug}`);
    if (/<\/?[a-z][\s\S]*?>/i.test(p.architecture.replace(/```[\s\S]*?```/g, ""))) out.push(`project ${p.slug}: raw HTML in architecture`);
  }
  for (const l of file.lessons) if (/<\/?(script|iframe|style|img)\b/i.test(l.body)) out.push(`lesson ${l.id}: raw HTML in body`);
  return out;
}

/* --------------------------------- progress --------------------------------- */

export function trackProgress(lessons: readonly WebLesson[], done: ReadonlySet<string>): Array<{ track: string; done: number; total: number; pct: number }> {
  const tracks = [...new Set(lessons.map((l) => l.track))];
  return tracks.map((track) => {
    const own = lessons.filter((l) => l.track === track);
    const n = own.filter((l) => done.has(l.id)).length;
    return { track, done: n, total: own.length, pct: Math.round((100 * n) / own.length) };
  });
}

/** The first lesson you haven't finished, in content order, optionally within one track. */
export function nextLesson(lessons: readonly WebLesson[], done: ReadonlySet<string>, track?: string): WebLesson | null {
  return lessons.find((l) => (!track || l.track === track) && !done.has(l.id)) ?? null;
}

export function checkScore(check: readonly { answer: number }[], answers: readonly (number | null)[]): { correct: number; total: number; pct: number } {
  const correct = check.filter((c, i) => answers[i] === c.answer).length;
  return { correct, total: check.length, pct: check.length ? Math.round((100 * correct) / check.length) : 0 };
}

export function projectProgress(project: Pick<WebProject, "milestones">, ticked: readonly string[]): { done: number; total: number; pct: number; next: string | null } {
  const set = new Set(ticked);
  const done = project.milestones.filter((m) => set.has(m.id)).length;
  const total = project.milestones.length;
  return { done, total, pct: Math.round((100 * done) / total), next: project.milestones.find((m) => !set.has(m.id))?.id ?? null };
}

/** Lessons to study before or while building: the ones you haven't finished first. */
export function lessonsForProject(project: Pick<WebProject, "lessons">, lessons: ReadonlyMap<string, WebLesson>, done: ReadonlySet<string>): Array<{ lesson: WebLesson; done: boolean }> {
  return project.lessons.flatMap((id) => {
    const lesson = lessons.get(id);
    return lesson ? [{ lesson, done: done.has(id) }] : [];
  }).toSorted((a, b) => Number(a.done) - Number(b.done));
}

/* --------------------------------- to the resume --------------------------------- */

/**
 * Adds the project to a resume's Projects section with its bullet templates. Placeholders such as [X]
 * stay in place: you replace them with your real numbers. A project already listed by name is left alone.
 */
export function addProjectToResume(doc: ResumeDoc, project: Pick<WebProject, "title" | "stack" | "resume">): { doc: ResumeDoc; added: boolean } {
  if (doc.projects.some((p) => p.name.toLowerCase() === project.title.toLowerCase())) return { doc, added: false };
  const next = resumeSchema.parse({
    ...doc,
    projects: [...doc.projects, { name: project.title, stack: project.stack.join(", "), bullets: project.resume.slice(0, 3) }],
  });
  return { doc: next, added: true };
}

/** Placeholders left in a bullet, e.g. `[X]` or `[X%]`: a resume with any of these is not finished. */
export const hasPlaceholder = (s: string): boolean => /\[[^\]]{1,24}\]/.test(s);
