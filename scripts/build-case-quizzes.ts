/**
 * Builds data/case-quizzes.json from the authored parts in scripts/case-quizzes/parts/*.json
 * (each file: { "<hld|os|dbms>:<slug>": AuthoredCaseQuestion[] }). A case may appear in several files: their
 * questions are appended in file-name order, so adding a file never renumbers existing ids. Validates every question against the
 * case it belongs to (anchor exists on that kind of page, reading index exists, enough questions, no
 * "all of the above"), assigns ids and shuffles options deterministically. Writes nothing if anything fails.
 *
 *   node --import tsx scripts/build-case-quizzes.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { designCaseBySlug, practiceCaseBySlug, systemDesign, practiceCases } from "@/core/content";
import { caseRef, type CaseKind } from "@/modules/design/domain/case-quiz";
import { buildCaseQuestions, type AuthoredCaseQuestion } from "@/modules/design/domain/case-quiz-build";
import { caseQuestionSchema } from "@/modules/quiz/lib/case-bank";
import { quizQuestionSchema } from "@/modules/quiz/lib/question";

const PARTS = path.join(process.cwd(), "scripts", "case-quizzes", "parts");
const OUT = path.join(process.cwd(), "data", "case-quizzes.json");

const authored = new Map<string, AuthoredCaseQuestion[]>();
const errors: string[] = [];
for (const file of readdirSync(PARTS).filter((f) => f.endsWith(".json")).sort()) {
  const json = JSON.parse(readFileSync(path.join(PARTS, file), "utf8")) as Record<string, AuthoredCaseQuestion[]>;
  for (const [key, list] of Object.entries(json)) {
    authored.set(key, [...(authored.get(key) ?? []), ...list]);
  }
}

const order = [...systemDesign.cases.map((c) => `hld:${c.slug}`), ...practiceCases.map((c) => `${c.kind}:${c.slug}`)];
const cases: Record<string, unknown[]> = {};
for (const key of order) {
  const list = authored.get(key);
  if (!list) {
    errors.push(`${key}: no questions authored`);
    continue;
  }
  const [kind, slug] = key.split(":") as [CaseKind, string];
  const { questions, errors: errs } = buildCaseQuestions(kind, slug, list);
  const prompts = new Set<string>();
  for (const [i, q] of questions.entries()) {
    if (prompts.has(q.prompt)) errs.push(`${key} #${i + 1}: duplicate prompt`);
    prompts.add(q.prompt);
  }
  const readings = (kind === "hld" ? designCaseBySlug.get(slug)?.readings : practiceCaseBySlug.get(key)?.readings) ?? [];
  for (const [i, q] of questions.entries()) {
    if (q.reading !== undefined && !readings[q.reading]) errs.push(`${key} #${i + 1}: reading ${q.reading} doesn't exist (the case has ${readings.length})`);
    const stored = caseQuestionSchema.safeParse(q);
    if (!stored.success) errs.push(`${key} #${i + 1}: ${stored.error.issues.map((x) => x.message).join("; ")}`);
    const rest: Record<string, unknown> = { ...q };
    delete rest.anchor;
    delete rest.reading;
    const full = quizQuestionSchema.safeParse({ ...rest, source: { kind: "case", ref: caseRef(kind, slug) }, style: "concept" });
    if (!full.success) errs.push(`${key} #${i + 1}: ${full.error.issues.map((x) => x.message).join("; ")}`);
  }
  errors.push(...errs);
  cases[key] = questions;
}
for (const key of authored.keys()) if (!order.includes(key)) errors.push(`${key}: not a known case`);

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join("\n"));
  console.error("\nNot written.");
  process.exit(1);
}
writeFileSync(OUT, `${JSON.stringify({ version: 1, cases }, null, 1)}\n`);
console.log(`Wrote ${Object.values(cases).reduce((n, l) => n + l.length, 0)} questions for ${Object.keys(cases).length} cases to ${OUT}`);
