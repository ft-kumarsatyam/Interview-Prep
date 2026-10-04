/**
 * How ready you are for one job, from three facts: the skills the job asks for, the skills your resume mentions, and
 * the syllabus topics you have studied. A skill is in one of four states: on your resume; studied but not yet on your
 * resume (a quick win: add it); not studied, but a syllabus topic teaches it (study that next); or taught nowhere.
 * Deterministic and explainable, no model involved. Pure.
 */

export interface SyllabusSkill {
  /** Subtopic id (`topicId:index`). */
  id: string;
  topicId: string;
  title: string;
  topicTitle: string;
  /** Canonical skill terms this subtopic teaches. */
  terms: readonly string[];
}

/** term -> the subtopics that teach it, in study order. Build once; it is the expensive part. */
export type SkillIndex = ReadonlyMap<string, readonly SyllabusSkill[]>;

export function buildSkillIndex(skills: readonly SyllabusSkill[]): SkillIndex {
  const index = new Map<string, SyllabusSkill[]>();
  for (const s of skills) for (const t of s.terms) index.set(t, [...(index.get(t) ?? []), s]);
  return index;
}

export interface StudyStep {
  id: string;
  topicId: string;
  title: string;
  topicTitle: string;
}

export interface Readiness {
  /** The job's skills, de-duplicated, in the order given. */
  required: string[];
  /** On your resume already. */
  inResume: string[];
  /** Studied but not on your resume: add them. */
  addToResume: Array<{ term: string; via: StudyStep }>;
  /** Not studied yet; the syllabus subtopics to study, nearest first (at most 3 each). */
  toStudy: Array<{ term: string; steps: StudyStep[] }>;
  /** Skills no syllabus topic covers. */
  outsideSyllabus: string[];
  /** Share of required skills you can claim today (on the resume or studied), 0-100. Null when the job lists no skills. */
  readyPct: number | null;
  /** Share on the resume right now, 0-100. Null when the job lists no skills. */
  resumePct: number | null;
}

const step = (s: SyllabusSkill): StudyStep => ({ id: s.id, topicId: s.topicId, title: s.title, topicTitle: s.topicTitle });
const pct = (n: number, d: number) => (d === 0 ? null : Math.round((n / d) * 100));

export function readiness(input: {
  jobTerms: readonly string[];
  /** Null when there is no saved resume: nothing counts as "on the resume", so everything studied is an "add" suggestion. */
  resumeTerms: ReadonlySet<string> | null;
  index: SkillIndex;
  /** Subtopic ids you have studied. */
  studied: ReadonlySet<string>;
}): Readiness {
  const required = [...new Set(input.jobTerms)];
  const inResume: string[] = [];
  const addToResume: Readiness["addToResume"] = [];
  const toStudy: Readiness["toStudy"] = [];
  const outsideSyllabus: string[] = [];

  for (const term of required) {
    if (input.resumeTerms?.has(term)) {
      inResume.push(term);
      continue;
    }
    const teachers = input.index.get(term) ?? [];
    const done = teachers.find((s) => input.studied.has(s.id));
    if (done) addToResume.push({ term, via: step(done) });
    else if (teachers.length) toStudy.push({ term, steps: teachers.slice(0, 3).map(step) });
    else outsideSyllabus.push(term);
  }
  return {
    required,
    inResume,
    addToResume,
    toStudy,
    outsideSyllabus,
    readyPct: pct(inResume.length + addToResume.length, required.length),
    resumePct: pct(inResume.length, required.length),
  };
}

/** Which subtopics to study first for this job: the ones that close the most missing skills. */
export function studyPlan(r: Readiness, limit = 5): Array<StudyStep & { closes: string[] }> {
  const byStep = new Map<string, StudyStep & { closes: string[] }>();
  for (const { term, steps } of r.toStudy) for (const s of steps) byStep.set(s.id, { ...s, closes: [...(byStep.get(s.id)?.closes ?? []), term] });
  return [...byStep.values()].toSorted((a, b) => b.closes.length - a.closes.length || (a.id < b.id ? -1 : 1)).slice(0, limit);
}
