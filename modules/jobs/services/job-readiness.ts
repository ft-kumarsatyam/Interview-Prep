import { subtopics } from "@/core/content";
import { termsIn } from "@/modules/jobs/domain/ats";
import { buildSkillIndex, readiness, studyPlan, type Readiness, type SkillIndex, type StudyStep } from "@/modules/jobs/domain/job-readiness";
import { getStudied } from "@/modules/progress/services/studied";
import { getBaseResume } from "@/modules/resume/services/resume";

let index: SkillIndex | undefined;

/** The syllabus as a term index. Built once per server instance: it runs the skill vocabulary over every subtopic title. */
function skillIndex(): SkillIndex {
  index ??= buildSkillIndex(subtopics.map((s) => ({ id: s.id, topicId: s.topicId, title: s.title, topicTitle: s.topicTitle, terms: termsIn(`${s.topicTitle} ${s.title}`) })));
  return index;
}

export interface JobReadiness extends Readiness {
  hasResume: boolean;
  plan: Array<StudyStep & { closes: string[] }>;
}

/** How ready you are for a job: its skills against your saved resume and what you have studied. Read-only. */
export async function getJobReadiness(job: { title: string; jd: string }): Promise<JobReadiness> {
  const [base, studied] = await Promise.all([getBaseResume(), getStudied()]);
  const resumeTerms = base ? new Set(termsIn(base.text)) : null;
  const r = readiness({ jobTerms: termsIn(`${job.title}\n${job.jd}`), resumeTerms, index: skillIndex(), studied: studied.subtopics });
  return { ...r, hasResume: Boolean(base), plan: studyPlan(r) };
}
