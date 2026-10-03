/**
 * Hand-written subtopic questions in scripts/quiz-bank/authored/<topicId>.json, each file shaped
 * { "<subtopicId>": AuthoredQuestion[] }. `output` questions are run in node:vm and the real output
 * becomes the answer, so their key can't be wrong; the rest are checked for shape, not truth.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { subtopicById } from "@/lib/content";
import { seededRng, seedFrom, shuffle } from "@/lib/domain/sampling";
import { difficultySchema, quizQuestionSchema, type QuizQuestion } from "@/lib/quiz/question";
import { runSnippet } from "./run-snippet";

export const AUTHORED_DIR = path.join(process.cwd(), "scripts", "quiz-bank", "authored");

const text = (max: number) => z.string().trim().min(1).max(max);
const option = text(300);
const common = {
  prompt: z.string().trim().min(10).max(500),
  code: z.string().max(1500).optional(),
  explanation: z.string().trim().min(20).max(600),
  difficulty: difficultySchema,
};

const authoredSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("single"), ...common, options: z.array(option).length(4), answerIndex: z.number().int().min(0).max(3) }).strict(),
  z.object({ type: z.literal("multi"), ...common, options: z.array(option).min(4).max(6), answerIndices: z.array(z.number().int().min(0).max(5)).min(2) }).strict(),
  z.object({ type: z.literal("truefalse"), ...common, options: z.tuple([z.literal("True"), z.literal("False")]), answerIndex: z.union([z.literal(0), z.literal(1)]) }).strict(),
  z
    .object({
      type: z.literal("output"),
      prompt: z.string().trim().min(10).max(500).optional(),
      code: z.string().min(1).max(1500),
      distractors: z.array(option).length(3),
      explanation: common.explanation,
      difficulty: difficultySchema,
      node: z.boolean().optional(),
    })
    .strict(),
]);
export type AuthoredQuestion = z.infer<typeof authoredSchema>;

const BANNED_OPTION = /^(all|none|both) of the (above|options)|^both [a-d] and [a-d]$|^[a-d] and [a-d]$/i;

const hashId = (...parts: string[]) => `b-${createHash("sha1").update(parts.join("\u0000")).digest("hex").slice(0, 12)}`;

/** Accepts the `type`-less single shorthand that authors naturally write. */
function normalise(raw: unknown): unknown {
  return raw && typeof raw === "object" && !("type" in raw) ? { type: "single", ...raw } : raw;
}

export interface AuthoredBuild {
  questions: QuizQuestion[];
  errors: string[];
}

/** Validate and convert one subtopic's authored list. Deterministic: the same input gives the same ids and option order. */
export async function buildAuthored(ref: string, list: unknown[], file = ""): Promise<AuthoredBuild> {
  const errors: string[] = [];
  const questions: QuizQuestion[] = [];
  const at = (n: number) => `${file ? `${file} ` : ""}${ref} #${n + 1}`;
  if (!subtopicById.has(ref)) return { questions, errors: [`${file} ${ref}: not a syllabus subtopic id`] };
  const seen = new Set<string>();

  for (const [n, raw] of list.entries()) {
    const parsed = authoredSchema.safeParse(normalise(raw));
    if (!parsed.success) {
      errors.push(`${at(n)}: ${parsed.error.issues.map((i) => `${i.path.join(".") || "question"} ${i.message}`).join("; ")}`);
      continue;
    }
    const a = parsed.data;
    const key = `${a.prompt ?? ""}\u0000${a.code ?? ""}`;
    if (seen.has(key)) errors.push(`${at(n)}: duplicate question`);
    seen.add(key);
    const source = { kind: "subtopic" as const, ref };

    if (a.type === "output") {
      let actual: string;
      try {
        actual = (await runSnippet(a.code)).trim();
      } catch (err) {
        errors.push(`${at(n)}: ${err instanceof Error ? err.message.split("\n")[0] : err}`);
        continue;
      }
      if (!actual) {
        errors.push(`${at(n)}: snippet printed nothing`);
        continue;
      }
      const wrong = a.distractors.map((d) => d.trim());
      const before = errors.length;
      if (wrong.includes(actual)) errors.push(`${at(n)}: a distractor equals the real output ${JSON.stringify(actual)}`);
      if (new Set(wrong).size !== wrong.length) errors.push(`${at(n)}: distractors must be distinct`);
      if (actual.length > 300) errors.push(`${at(n)}: output is longer than 300 characters`);
      if (errors.length > before) continue;
      const id = hashId("authored-output", ref, a.code);
      const options = shuffle([actual, ...wrong], seededRng(seedFrom(id)));
      questions.push(
        quizQuestionSchema.parse({
          id,
          prompt: a.prompt ?? (a.node ? "What does this print when run with Node.js?" : "What does this code print?"),
          code: a.code,
          options,
          answerIndex: options.indexOf(actual),
          explanation: a.explanation,
          source,
          style: "output",
          difficulty: a.difficulty,
        }),
      );
      continue;
    }

    if (new Set(a.options).size !== a.options.length) errors.push(`${at(n)}: options must be distinct`);
    if (a.options.some((o) => BANNED_OPTION.test(o.trim()))) errors.push(`${at(n)}: "all/none/both of the above" options break once options are shuffled`);
    const id = hashId("authored", ref, a.type, a.prompt, a.code ?? "");
    const base = { id, prompt: a.prompt, ...(a.code ? { code: a.code } : {}), explanation: a.explanation, source, style: "concept" as const, difficulty: a.difficulty };

    if (a.type === "truefalse") {
      const q = quizQuestionSchema.safeParse({ ...base, type: "truefalse", options: ["True", "False"], answerIndex: a.answerIndex });
      if (q.success) questions.push(q.data);
      else errors.push(`${at(n)}: ${q.error.issues.map((i) => i.message).join("; ")}`);
      continue;
    }

    const right = a.type === "multi" ? a.answerIndices : [a.answerIndex];
    if (right.some((i) => i >= a.options.length)) {
      errors.push(`${at(n)}: answer index is outside the options`);
      continue;
    }
    if (a.type === "multi" && (new Set(right).size !== right.length || right.length >= a.options.length)) {
      errors.push(`${at(n)}: multi questions need 2+ distinct answers and at least one wrong option`);
      continue;
    }
    const order = shuffle(a.options.map((_, i) => i), seededRng(seedFrom(id)));
    const options = order.map((i) => a.options[i]!);
    const mapped = right.map((old) => order.indexOf(old)).sort((x, y) => x - y);
    const q = quizQuestionSchema.safeParse({
      ...base,
      options,
      answerIndex: mapped[0],
      ...(a.type === "multi" ? { type: "multi", answerIndices: mapped } : {}),
    });
    if (q.success) questions.push(q.data);
    else errors.push(`${at(n)}: ${q.error.issues.map((i) => i.message).join("; ")}`);
  }
  return { questions, errors };
}

/** Every authored file, or just the given ones. Keys may repeat across files; lists are appended. */
export function readAuthored(files?: string[]): Array<{ file: string; ref: string; list: unknown[] }> {
  const paths = files ?? readdirSync(AUTHORED_DIR).filter((f) => f.endsWith(".json")).sort().map((f) => path.join(AUTHORED_DIR, f));
  return paths.flatMap((p) => {
    const json = JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown>;
    return Object.entries(json).map(([ref, list]) => ({ file: path.basename(p), ref, list: Array.isArray(list) ? list : [] }));
  });
}

export async function buildAllAuthored(files?: string[]): Promise<AuthoredBuild> {
  const errors: string[] = [];
  const questions: QuizQuestion[] = [];
  const ids = new Set<string>();
  for (const { file, ref, list } of readAuthored(files)) {
    const res = await buildAuthored(ref, list, file);
    errors.push(...res.errors);
    for (const q of res.questions) {
      if (ids.has(q.id)) errors.push(`${file} ${ref}: duplicate question across files (${q.prompt.slice(0, 60)})`);
      ids.add(q.id);
      questions.push(q);
    }
  }
  return { questions, errors };
}
