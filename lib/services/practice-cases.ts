import { practiceCaseBySlug, practiceCases, topicById, type PracticeCase } from "@/lib/content";
import { connectDb } from "@/lib/db";
import type { DesignStatus } from "@/lib/domain/design";
import {
  EXPLAIN_RUBRIC,
  EXPLAIN_SECTION_IDS,
  explainSectionsAttempted,
  practiceStatus,
  rubricScore,
  type ExplainSectionId,
  type ExplainSections,
  type PracticeKind,
} from "@/lib/domain/practice-cases";
import { Mastery, PracticeAnswer } from "@/lib/models/learning";
import { SubtopicProgress } from "@/lib/models/progress";

export interface PracticeAnswerView {
  sections: Record<ExplainSectionId, string>;
  rubric: string[];
  minutesSpent: number;
}

const rubricIds: string[] = EXPLAIN_RUBRIC.map((r) => r.id);

function emptySections(): Record<ExplainSectionId, string> {
  return Object.fromEntries(EXPLAIN_SECTION_IDS.map((id) => [id, ""])) as Record<ExplainSectionId, string>;
}

function assertCase(kind: PracticeKind, slug: string): PracticeCase {
  const c = practiceCaseBySlug.get(`${kind}:${slug}`);
  if (!c) throw new Error(`Unknown ${kind} practice case: ${slug}`);
  return c;
}

export async function getPracticeAnswer(kind: PracticeKind, slug: string): Promise<PracticeAnswerView> {
  assertCase(kind, slug);
  await connectDb();
  const d = await PracticeAnswer.findOne({ kind, slug }).lean();
  // .lean() returns the Map field as a plain object.
  const saved = (d?.sections ?? {}) as unknown as ExplainSections;
  return {
    sections: { ...emptySections(), ...Object.fromEntries(EXPLAIN_SECTION_IDS.map((id) => [id, saved[id] ?? ""])) },
    rubric: d?.rubric ?? [],
    minutesSpent: d?.minutesSpent ?? 0,
  };
}

export async function savePracticeSection(kind: PracticeKind, slug: string, section: ExplainSectionId, text: string): Promise<void> {
  assertCase(kind, slug);
  await connectDb();
  await PracticeAnswer.updateOne({ kind, slug }, { $set: { [`sections.${section}`]: text } }, { upsert: true });
}

export async function setPracticeRubric(kind: PracticeKind, slug: string, checked: readonly string[]): Promise<void> {
  assertCase(kind, slug);
  await connectDb();
  const valid = [...new Set(checked.filter((id) => rubricIds.includes(id)))];
  await PracticeAnswer.updateOne({ kind, slug }, { $set: { rubric: valid } }, { upsert: true });
}

export async function addPracticeMinutes(kind: PracticeKind, slug: string, minutes: number): Promise<number> {
  assertCase(kind, slug);
  await connectDb();
  const d = await PracticeAnswer.findOneAndUpdate({ kind, slug }, { $inc: { minutesSpent: minutes } }, { upsert: true, returnDocument: "after" }).lean();
  return d?.minutesSpent ?? minutes;
}

export interface PracticeCaseSummary {
  slug: string;
  status: DesignStatus;
  subtopicsDone: number;
  subtopicsTotal: number;
  sectionsAttempted: number;
  rubricPct: number;
  minutesSpent: number;
}

/** Status for every case card on /design/os or /design/dbms. */
export async function getPracticeOverview(kind: PracticeKind): Promise<Record<string, PracticeCaseSummary>> {
  await connectDb();
  const cases = practiceCases.filter((c) => c.kind === kind);
  const topicIds = [...new Set(cases.map((c) => c.topicId))];
  const [answers, progress, mastery] = await Promise.all([
    PracticeAnswer.find({ kind }, { slug: 1, sections: 1, rubric: 1, minutesSpent: 1 }).lean(),
    SubtopicProgress.find({ topicId: { $in: topicIds } }, { topicId: 1 }).lean(),
    Mastery.find({ ref: { $in: topicIds }, masteredOn: { $ne: null } }, { ref: 1 }).lean(),
  ]);
  const bySlug = new Map(answers.map((a) => [a.slug, a]));
  const doneByTopic = new Map<string, number>();
  for (const p of progress) doneByTopic.set(p.topicId, (doneByTopic.get(p.topicId) ?? 0) + 1);
  const mastered = new Set(mastery.map((m) => m.ref));

  return Object.fromEntries(
    cases.map((c) => {
      const a = bySlug.get(c.slug);
      const attempted = explainSectionsAttempted((a?.sections ?? {}) as unknown as ExplainSections);
      const rubricPct = rubricScore(a?.rubric ?? [], rubricIds).pct;
      const subtopicsDone = doneByTopic.get(c.topicId) ?? 0;
      const summary: PracticeCaseSummary = {
        slug: c.slug,
        status: practiceStatus({ topicMastered: mastered.has(c.topicId), subtopicsDone, sectionsAttempted: attempted, rubricPct }),
        subtopicsDone,
        subtopicsTotal: topicById.get(c.topicId)?.subtopics.length ?? 0,
        sectionsAttempted: attempted,
        rubricPct,
        minutesSpent: a?.minutesSpent ?? 0,
      };
      return [c.slug, summary];
    }),
  );
}
