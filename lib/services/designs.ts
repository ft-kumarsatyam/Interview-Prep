import { designCaseBySlug, systemDesign, topicById, type DesignCase } from "@/lib/content";
import { connectDb } from "@/lib/db";
import { classifyTags } from "@/lib/domain/article";
import {
  DESIGN_SECTION_IDS,
  designStatus,
  relatedArticles,
  rubricScore,
  sectionsAttempted,
  type DesignSectionId,
  type DesignSections,
  type DesignStatus,
} from "@/lib/domain/design";
import { Design, Mastery } from "@/lib/models/learning";
import { SubtopicProgress } from "@/lib/models/progress";
import { listArticles, type ArticleItem } from "./news";

export interface DesignAnswer {
  sections: Record<DesignSectionId, string>;
  rubric: string[];
  minutesSpent: number;
  updatedAt: string | null;
}

const rubricIds = systemDesign.framework.rubric.map((r) => r.id);

function emptySections(): Record<DesignSectionId, string> {
  return Object.fromEntries(DESIGN_SECTION_IDS.map((id) => [id, ""])) as Record<DesignSectionId, string>;
}

function assertCase(slug: string): DesignCase {
  const c = designCaseBySlug.get(slug);
  if (!c) throw new Error(`Unknown design case: ${slug}`);
  return c;
}

export async function getDesign(slug: string): Promise<DesignAnswer> {
  assertCase(slug);
  await connectDb();
  const d = await Design.findOne({ slug }).lean();
  return {
    sections: { ...emptySections(), ...((d?.sections as DesignSections | undefined) ?? {}) },
    rubric: d?.rubric ?? [],
    minutesSpent: d?.minutesSpent ?? 0,
    updatedAt: d?.updatedAt ? new Date(d.updatedAt).toISOString() : null,
  };
}

export async function saveDesignSection(slug: string, section: DesignSectionId, text: string): Promise<void> {
  assertCase(slug);
  await connectDb();
  await Design.updateOne({ slug }, { $set: { [`sections.${section}`]: text } }, { upsert: true });
}

export async function setDesignRubric(slug: string, checked: readonly string[]): Promise<void> {
  assertCase(slug);
  await connectDb();
  const valid = [...new Set(checked.filter((id) => rubricIds.includes(id)))];
  await Design.updateOne({ slug }, { $set: { rubric: valid } }, { upsert: true });
}

export async function addDesignMinutes(slug: string, minutes: number): Promise<number> {
  assertCase(slug);
  await connectDb();
  const d = await Design.findOneAndUpdate({ slug }, { $inc: { minutesSpent: minutes } }, { upsert: true, new: true }).lean();
  return d?.minutesSpent ?? minutes;
}

export interface DesignCaseSummary {
  slug: string;
  status: DesignStatus;
  subtopicsDone: number;
  subtopicsTotal: number;
  sectionsAttempted: number;
  rubricPct: number;
  minutesSpent: number;
}

/** Status for every case card on /design, from syllabus progress, topic mastery and saved answers. */
export async function getDesignOverview(): Promise<Record<string, DesignCaseSummary>> {
  await connectDb();
  const topicIds = [...new Set(systemDesign.cases.map((c) => c.topicId))];
  const [designs, progress, mastery] = await Promise.all([
    Design.find({}, { slug: 1, sections: 1, rubric: 1, minutesSpent: 1 }).lean(),
    SubtopicProgress.find({ topicId: { $in: topicIds } }, { topicId: 1 }).lean(),
    Mastery.find({ ref: { $in: topicIds }, masteredOn: { $ne: null } }, { ref: 1 }).lean(),
  ]);
  const bySlug = new Map(designs.map((d) => [d.slug, d]));
  const doneByTopic = new Map<string, number>();
  for (const p of progress) doneByTopic.set(p.topicId, (doneByTopic.get(p.topicId) ?? 0) + 1);
  const mastered = new Set(mastery.map((m) => m.ref));

  return Object.fromEntries(
    systemDesign.cases.map((c) => {
      const d = bySlug.get(c.slug);
      const attempted = sectionsAttempted((d?.sections as DesignSections | undefined) ?? {});
      const rubricPct = rubricScore(d?.rubric ?? [], rubricIds).pct;
      const subtopicsDone = doneByTopic.get(c.topicId) ?? 0;
      const summary: DesignCaseSummary = {
        slug: c.slug,
        status: designStatus({ topicMastered: mastered.has(c.topicId), subtopicsDone, sectionsAttempted: attempted, rubricPct }),
        subtopicsDone,
        subtopicsTotal: topicById.get(c.topicId)?.subtopics.length ?? 0,
        sectionsAttempted: attempted,
        rubricPct,
        minutesSpent: d?.minutesSpent ?? 0,
      };
      return [c.slug, summary];
    }),
  );
}

export function caseTags(c: DesignCase): string[] {
  return classifyTags(`${c.title} ${c.keywords.join(" ")}`);
}

/** News articles (last 30 days) that match the case by title keywords or shared tags. */
export async function relatedArticlesForCase(c: DesignCase, limit = 6): Promise<ArticleItem[]> {
  const pool = await listArticles({ categories: ["system-design", "engineering", "databases", "ai-labs", "tech-news"], limit: 400 });
  return relatedArticles(pool, c.keywords, caseTags(c), limit);
}
