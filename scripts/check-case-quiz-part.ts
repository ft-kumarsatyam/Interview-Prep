/**
 * Dry-run one authored part file of case quizzes:
 *   node --import tsx scripts/check-case-quiz-part.ts scripts/case-quizzes/parts/<name>.json
 */
import { readFileSync } from "node:fs";
import { designCaseBySlug, practiceCaseBySlug } from "../lib/content";
import type { CaseKind } from "../lib/domain/case-quiz";
import { buildCaseQuestions, type AuthoredCaseQuestion } from "../lib/domain/case-quiz-build";
import { caseQuestionSchema } from "../lib/quiz/case-bank";
import { quizQuestionSchema } from "../lib/quiz/question";

const file = process.argv[2];
if (!file) {
  console.error("usage: check-case-quiz-part.ts <part file>");
  process.exit(2);
}
const json = JSON.parse(readFileSync(file, "utf8")) as Record<string, AuthoredCaseQuestion[]>;
const errors: string[] = [];
for (const [key, list] of Object.entries(json)) {
  const [kind, slug] = key.split(":") as [CaseKind, string];
  const known = kind === "hld" ? designCaseBySlug.get(slug) : practiceCaseBySlug.get(key);
  if (!known) {
    errors.push(`${key}: not a known case`);
    continue;
  }
  const { questions, errors: errs } = buildCaseQuestions(kind, slug, list);
  errors.push(...errs);
  const prompts = new Set<string>();
  for (const [i, q] of questions.entries()) {
    if (q.reading !== undefined && !known.readings[q.reading]) errors.push(`${key} #${i + 1}: reading ${q.reading} doesn't exist (case has ${known.readings.length})`);
    const s = caseQuestionSchema.safeParse(q);
    if (!s.success) errors.push(`${key} #${i + 1}: ${s.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
    const rest: Record<string, unknown> = { ...q };
    delete rest.anchor;
    delete rest.reading;
    const f = quizQuestionSchema.safeParse({ ...rest, source: { kind: "case", ref: `case:${key}` }, style: "concept" });
    if (!f.success) errors.push(`${key} #${i + 1}: ${f.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`);
    if (prompts.has(q.prompt)) errors.push(`${key} #${i + 1}: duplicate prompt`);
    prompts.add(q.prompt);
  }
  const types = questions.reduce<Record<string, number>>((m, q) => ((m[q.type ?? "single"] = (m[q.type ?? "single"] ?? 0) + 1), m), {});
  const anchors = new Set(questions.map((q) => q.anchor)).size;
  console.log(`${key}: ${questions.length} questions, types ${JSON.stringify(types)}, ${anchors} distinct anchors`);
}
if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join("\n"));
  process.exit(1);
}
console.log("OK");
