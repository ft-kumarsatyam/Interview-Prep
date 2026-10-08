/**
 * Validates one authored content file against its schema and the content already registered in core/, before
 * the file itself is registered.
 * Usage: node --import tsx scripts/check-content.ts <webdev|interview|course-chapter|roadmap|dsa-extras|dsa-ladders> <file.json> [extra]
 *   interview: extra = the companion webdev file whose lessons list these questions
 *   roadmap:   extra = a JSON array of lesson keys that are being written now and count as known
 */
import { readFileSync } from "node:fs";
import { problemBySlug, problems, subtopicById, testcaseBySlug, topicById, webLessons, webProjects, webTracks } from "../core/content";
import { externalCatalogueSchema } from "../modules/dsa/domain/external-catalogue";
import { extraCatalogueSchema, extraSlugClashes } from "../modules/dsa/domain/extra-problems";
import { courseLessonByKey } from "../core/courses";
import { checkQuestionSchema, webdevFileSchema, webdevProblems, type WebLesson } from "../modules/learn/domain/webdev";
import { interviewFileSchema, interviewProblems, type InterviewFile } from "../modules/learn/domain/web-interview";
import { courseChapterFileSchema } from "../modules/course/domain/course";
import { roadmapProblems, roadmapSchema } from "../modules/roadmap/domain/roadmap";

const [kind, file, extra] = process.argv.slice(2);
if (!kind || !file) {
  console.error("usage: check-content <webdev|interview|course-chapter|roadmap|dsa-extras|dsa-ladders> <file.json> [extra]");
  process.exit(2);
}
const json: unknown = JSON.parse(readFileSync(file, "utf8"));
const issues: string[] = [];
const fail = (r: { success: boolean; error?: { issues: Array<{ path: PropertyKey[]; message: string }> } }) => {
  if (!r.success) for (const i of r.error!.issues.slice(0, 20)) issues.push(`${i.path.join(".")}: ${i.message}`);
};

if (kind === "webdev") {
  const r = webdevFileSchema.safeParse(json);
  fail(r);
  if (r.success) {
    const own = { tracks: new Set(r.data.tracks.map((t) => t.id)), lessons: new Set(r.data.lessons.map((l) => l.id)), projects: new Set(r.data.projects.map((p) => p.slug)) };
    const merged = {
      tracks: [...webTracks.filter((t) => !own.tracks.has(t.id)), ...r.data.tracks],
      lessons: [...webLessons.filter((l) => !own.lessons.has(l.id)), ...r.data.lessons],
      projects: [...webProjects.filter((p) => !own.projects.has(p.slug)), ...r.data.projects],
    };
    issues.push(...webdevProblems(merged));
    for (const l of r.data.lessons) if (new Set(l.check.map((c) => c.q)).size !== 3) issues.push(`${l.id}: repeated check question`);
    for (const l of r.data.lessons) for (const c of l.check) if (!checkQuestionSchema.safeParse(c).success) issues.push(`${l.id}: bad check`);
    for (const p of r.data.projects) if (!p.resume.some((b) => /\[[^\]]+\]/.test(b))) issues.push(`${p.slug}: resume bullets need [X] placeholders`);
  }
} else if (kind === "interview") {
  const r = interviewFileSchema.safeParse(json);
  fail(r);
  if (r.success) {
    const f = r.data as InterviewFile;
    const lessonIds = new Set(webLessons.map((l) => l.id));
    const companion = extra ? (JSON.parse(readFileSync(extra, "utf8")) as { lessons: WebLesson[] }) : null;
    for (const l of companion?.lessons ?? []) lessonIds.add(l.id);
    issues.push(...interviewProblems([f], lessonIds));
    for (const l of companion?.lessons ?? [])
      for (const text of l.interview) {
        const match = f.questions.find((q) => q.q === text);
        if (!match) issues.push(`lesson ${l.id} asks "${text}" but no question has exactly that text`);
        else if (match.lesson !== l.id) issues.push(`question ${match.id} must set "lesson": "${l.id}"`);
      }
    for (const q of f.questions) {
      if (!q.id.startsWith(`${f.track.id}-`)) issues.push(`${q.id}: id must start with ${f.track.id}-`);
      if (!q.answer.trimStart().startsWith("**")) issues.push(`${q.id}: answer must lead with a **bolded** direct answer`);
    }
    if (new Set(f.questions.map((q) => q.level)).size < 2) issues.push("use at least two levels");
  }
} else if (kind === "course-chapter") {
  const r = courseChapterFileSchema.safeParse(json);
  fail(r);
  if (r.success)
    for (const l of r.data.lessons) {
      if (new Set(l.check.map((c) => c.q)).size !== 3) issues.push(`${l.id}: repeated check question`);
      for (const p of l.problems) if (!problemBySlug.has(p)) issues.push(`${l.id}: unknown problem ${p}`);
      if (l.practiceRef && !subtopicById.has(l.practiceRef) && !topicById.has(l.practiceRef)) issues.push(`${l.id}: unknown practiceRef ${l.practiceRef}`);
    }
} else if (kind === "roadmap") {
  const r = roadmapSchema.safeParse(json);
  fail(r);
  if (r.success) {
    const planned = new Set<string>(extra ? (JSON.parse(readFileSync(extra, "utf8")) as string[]) : []);
    const webIds = new Set(webLessons.map((l) => l.id));
    issues.push(
      ...roadmapProblems([r.data], {
        problem: (s) => problemBySlug.has(s),
        lesson: (k) => planned.has(k) || courseLessonByKey.has(k) || (k.startsWith("web/") && webIds.has(k.slice(4))),
        quiz: (q) => subtopicById.has(q) || topicById.has(q),
      }),
    );
  }
} else if (kind === "dsa-extras") {
  const r = extraCatalogueSchema.safeParse(json);
  fail(r);
  if (r.success) {
    issues.push(...extraSlugClashes(r.data.problems, new Set(problems.map((p) => p.slug))).map((s) => `${s}: defined twice or already seeded`));
    for (const p of r.data.problems) if (!testcaseBySlug.has(p.slug)) issues.push(`${p.slug}: no judge in data/dsa-testcases.json`);
  }
} else if (kind === "dsa-ladders") {
  const r = externalCatalogueSchema.safeParse(json);
  fail(r);
  if (r.success)
    for (const q of r.data.sheets.flatMap((s) => s.questions)) {
      if (!q.localSlug || !problemBySlug.has(q.localSlug)) issues.push(`${q.code ?? q.id}: no PrepOS problem (${q.localSlug ?? "unset"})`);
      else if (!testcaseBySlug.has(q.localSlug)) issues.push(`${q.code ?? q.id}: ${q.localSlug} has no judge`);
    }
} else {
  issues.push(`unknown kind ${kind}`);
}

if (issues.length) {
  console.error(`${file}: ${issues.length} problem(s)\n- ${issues.join("\n- ")}`);
  process.exit(1);
}
console.log(`${file}: OK`);
