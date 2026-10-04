import { interviewQuestionById, webLessonById, webProjectBySlug } from "@/core/content";
import { connectDb } from "@/core/db";
import type { DateStr } from "@/core/domain/dates";
import { parseResumeText } from "@/modules/resume/domain/resume";
import { renderResumeText } from "@/modules/resume/domain/resume-tailor";
import type { InterviewStatus } from "@/modules/learn/domain/web-interview";
import { addProjectToResume } from "@/modules/learn/domain/webdev";
import { WebInterviewProgress, WebLessonProgress, WebProjectProgress } from "@/core/models/webdev";
import { getBaseResume, saveBaseResume } from "@/modules/resume/services/resume";

export async function getDoneLessons(): Promise<Map<string, { doneOn: string; bestScore: number | null }>> {
  await connectDb();
  const rows = await WebLessonProgress.find({}).lean();
  return new Map(rows.map((r) => [r.lessonId, { doneOn: r.doneOn, bestScore: r.bestScore ?? null }]));
}

/** Marks a lesson done (keeping the best self-check score), or undoes it. */
export async function setLessonDone(lessonId: string, done: boolean, today: DateStr, score: number | null = null): Promise<void> {
  if (!webLessonById.has(lessonId)) throw new Error("Unknown lesson");
  await connectDb();
  if (!done) {
    await WebLessonProgress.deleteOne({ lessonId });
    return;
  }
  const prev = await WebLessonProgress.findOne({ lessonId }).lean();
  const best = score === null ? (prev?.bestScore ?? null) : Math.max(score, prev?.bestScore ?? 0);
  await WebLessonProgress.updateOne({ lessonId }, { $set: { bestScore: best }, $setOnInsert: { doneOn: today } }, { upsert: true });
}

/** Practice status per interview question; questions you haven't rated are absent (i.e. "new"). */
export async function getInterviewStatus(): Promise<Map<string, InterviewStatus>> {
  await connectDb();
  const rows = await WebInterviewProgress.find({}, { qid: 1, status: 1 }).lean();
  return new Map(rows.map((r) => [r.qid, r.status as InterviewStatus]));
}

/** Rates a question "known" or "review", or resets it to "new" (deletes the row). */
export async function setInterviewStatus(qid: string, status: InterviewStatus, today: DateStr): Promise<void> {
  if (!interviewQuestionById.has(qid)) throw new Error("Unknown question");
  await connectDb();
  if (status === "new") {
    await WebInterviewProgress.deleteOne({ qid });
    return;
  }
  await WebInterviewProgress.updateOne({ qid }, { $set: { status, updatedOn: today }, $inc: { attempts: 1 } }, { upsert: true });
}

export interface ProjectState {
  slug: string;
  startedOn: DateStr;
  milestones: string[];
  repoUrl: string;
  notes: string;
  doneOn: DateStr | null;
}

const toState = (d: { slug: string; startedOn: string; milestones?: string[]; repoUrl?: string | null; notes?: string | null; doneOn?: string | null }): ProjectState => ({
  slug: d.slug,
  startedOn: d.startedOn,
  milestones: d.milestones ?? [],
  repoUrl: d.repoUrl ?? "",
  notes: d.notes ?? "",
  doneOn: d.doneOn ?? null,
});

export async function getProjectStates(): Promise<Map<string, ProjectState>> {
  await connectDb();
  return new Map((await WebProjectProgress.find({}).lean()).map((d) => [d.slug, toState(d)]));
}

export async function getProjectState(slug: string): Promise<ProjectState | null> {
  await connectDb();
  const d = await WebProjectProgress.findOne({ slug }).lean();
  return d ? toState(d) : null;
}

/** Ticks or unticks a milestone, starting the project on the first tick and finishing it when all are ticked. */
export async function setMilestone(slug: string, milestoneId: string, ticked: boolean, today: DateStr): Promise<ProjectState> {
  const project = webProjectBySlug.get(slug);
  if (!project) throw new Error("Unknown project");
  if (!project.milestones.some((m) => m.id === milestoneId)) throw new Error("Unknown milestone");
  await connectDb();
  await WebProjectProgress.updateOne({ slug }, { $setOnInsert: { startedOn: today } }, { upsert: true });
  await WebProjectProgress.updateOne({ slug }, ticked ? { $addToSet: { milestones: milestoneId } } : { $pull: { milestones: milestoneId } });
  const state = (await getProjectState(slug))!;
  const all = project.milestones.every((m) => state.milestones.includes(m.id));
  await WebProjectProgress.updateOne({ slug }, { $set: { doneOn: all ? (state.doneOn ?? today) : null } });
  return (await getProjectState(slug))!;
}

export async function saveProjectMeta(slug: string, meta: { repoUrl: string; notes: string }, today: DateStr): Promise<void> {
  if (!webProjectBySlug.has(slug)) throw new Error("Unknown project");
  await connectDb();
  await WebProjectProgress.updateOne({ slug }, { $set: { repoUrl: meta.repoUrl, notes: meta.notes }, $setOnInsert: { startedOn: today } }, { upsert: true });
}

/** Adds the project, with its bullet templates, to your saved resume. Needs a saved resume; never adds it twice. */
export async function addProjectToSavedResume(slug: string): Promise<{ added: boolean }> {
  const project = webProjectBySlug.get(slug);
  if (!project) throw new Error("Unknown project");
  const base = await getBaseResume();
  if (!base) throw new Error("Save your resume first");
  const { doc, added } = addProjectToResume(parseResumeText(base.text), project);
  if (added) await saveBaseResume(renderResumeText(doc));
  return { added };
}
