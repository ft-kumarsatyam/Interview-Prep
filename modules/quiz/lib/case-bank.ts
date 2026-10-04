import { z } from "zod";
import caseQuizzesJson from "@/data/case-quizzes.json";
import { designCaseBySlug, practiceCaseBySlug } from "@/core/content";
import { ANCHOR_LABELS, casePath, caseRef, parseCaseRef, type CaseKind } from "@/modules/design/domain/case-quiz";
import { difficultySchema, MAX_OPTIONS, quizQuestionSchema, type QuizQuestion, type ReviewItem } from "@/modules/quiz/lib/question";

/** Stored shape: a quiz question plus where in the case page to read more. `source` and `style` are filled in on load. */
export const caseQuestionSchema = z.object({
  id: z.string().min(1).max(80),
  prompt: z.string().trim().min(5).max(500),
  code: z.string().max(1500).optional(),
  options: z.array(z.string()).min(2).max(MAX_OPTIONS),
  answerIndex: z.number().int().min(0).max(MAX_OPTIONS - 1),
  type: z.enum(["single", "multi", "truefalse"]).optional(),
  answerIndices: z.array(z.number().int().min(0).max(MAX_OPTIONS - 1)).optional(),
  explanation: z.string().trim().min(1).max(600),
  /** Heading id on the case page (see CASE_ANCHORS). */
  anchor: z.string().min(1).max(40),
  /** Optional index into the case's `readings`. */
  reading: z.number().int().min(0).max(20).optional(),
  difficulty: difficultySchema.optional(),
});
export type StoredCaseQuestion = z.infer<typeof caseQuestionSchema>;

export const caseQuizzesSchema = z.object({
  version: z.literal(1),
  /** Keyed `${kind}:${slug}`. */
  cases: z.record(z.string(), z.array(caseQuestionSchema)),
});

export interface CaseQuestion extends QuizQuestion {
  anchor: string;
  reading?: number;
}

let cached: Map<string, CaseQuestion[]> | undefined;

/** Questions per case ref (`case:hld:slug`), validated once. */
export function caseBank(): Map<string, CaseQuestion[]> {
  if (cached) return cached;
  const { cases } = caseQuizzesSchema.parse(caseQuizzesJson);
  const out = new Map<string, CaseQuestion[]>();
  for (const [key, list] of Object.entries(cases)) {
    const [kind, slug] = key.split(":") as [CaseKind, string];
    const ref = caseRef(kind, slug);
    out.set(
      ref,
      list.map(({ anchor, reading, ...q }) => ({
        ...quizQuestionSchema.parse({ ...q, source: { kind: "case", ref }, style: "concept" }),
        anchor,
        ...(reading === undefined ? {} : { reading }),
      })),
    );
  }
  cached = out;
  return out;
}

export function caseQuestions(ref: string): CaseQuestion[] {
  return caseBank().get(ref) ?? [];
}

export function caseTitle(ref: string): string | undefined {
  const parsed = parseCaseRef(ref);
  if (!parsed) return undefined;
  return parsed.kind === "hld" ? designCaseBySlug.get(parsed.slug)?.title : practiceCaseBySlug.get(`${parsed.kind}:${parsed.slug}`)?.title;
}

export function caseReadings(ref: string): Array<{ title: string; url: string }> {
  const parsed = parseCaseRef(ref);
  if (!parsed) return [];
  return (parsed.kind === "hld" ? designCaseBySlug.get(parsed.slug)?.readings : practiceCaseBySlug.get(`${parsed.kind}:${parsed.slug}`)?.readings) ?? [];
}

/** The "Learn more" link shown under a question's explanation. */
export function learnMoreFor(ref: string, q: Pick<CaseQuestion, "anchor" | "reading">): NonNullable<ReviewItem["learnMore"]> | undefined {
  const parsed = parseCaseRef(ref);
  if (!parsed) return undefined;
  const reading = q.reading === undefined ? undefined : caseReadings(ref)[q.reading];
  return {
    href: casePath(parsed.kind, parsed.slug, q.anchor),
    label: ANCHOR_LABELS[q.anchor] ?? "the case notes",
    ...(reading ? { reading } : {}),
  };
}

/** How many questions a case has, for the "Quiz" button. */
export function caseQuestionCount(ref: string): number {
  return caseQuestions(ref).length;
}
