import { problems, testcaseBySlug } from "@/lib/content";
import { connectDb } from "@/lib/db";
import {
  GENERATE_PROMPT_VERSION,
  customProblemSchema,
  draftFromStatementPrompt,
  generatePrompt,
  slugifyTitle,
  validateCustomProblem,
  type CustomProblemDraft,
  type CustomSource,
  type GenerateInput,
} from "@/lib/domain/custom-problem";
import type { Language } from "@/lib/domain/starters";
import { env } from "@/lib/env";
import { CustomProblem, CustomSolve } from "@/lib/models/content";
import { ProblemProgress } from "@/lib/models/progress";
import { runAi, type AiResult } from "./ai";
import { cachedAi } from "./ai-cache";
import { todayIn } from "./plan";
import { getSettings } from "./settings";

export interface CustomProblemSummary {
  slug: string;
  title: string;
  source: CustomSource;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  solvedOn: string | null;
  attempts: number;
  createdAt: string;
}

export interface CustomProblemDetail extends CustomProblemDraft {
  slug: string;
  source: CustomSource;
  solvedOn: string | null;
  attempts: number;
  solves: Array<{ date: string; language: Language; ms: number }>;
}

type Lean = {
  slug: string;
  title: string;
  source: string;
  difficulty: string;
  topic: string;
  solvedOn?: string | null;
  attempts?: number | null;
  createdAt?: Date;
};

const summary = (d: Lean): CustomProblemSummary => ({
  slug: d.slug,
  title: d.title,
  source: d.source as CustomSource,
  difficulty: d.difficulty as CustomProblemSummary["difficulty"],
  topic: d.topic,
  solvedOn: d.solvedOn ?? null,
  attempts: d.attempts ?? 0,
  createdAt: d.createdAt?.toISOString() ?? "",
});

export async function listCustomProblems(): Promise<CustomProblemSummary[]> {
  await connectDb();
  const rows = await CustomProblem.find({}, { slug: 1, title: 1, source: 1, difficulty: 1, topic: 1, solvedOn: 1, attempts: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();
  return rows.map((r) => summary(r as Lean));
}

export async function countCustomProblems(): Promise<number> {
  await connectDb();
  return CustomProblem.countDocuments();
}

export async function getCustomProblem(slug: string): Promise<CustomProblemDetail | null> {
  await connectDb();
  const doc = await CustomProblem.findOne({ slug }).lean();
  if (!doc) return null;
  const parsed = customProblemSchema.safeParse({ ...doc, solution: doc.solution ?? undefined });
  if (!parsed.success) return null;
  const solves = await CustomSolve.find({ slug }).sort({ createdAt: -1 }).limit(20).lean();
  return {
    ...parsed.data,
    slug: doc.slug,
    source: doc.source as CustomSource,
    solvedOn: doc.solvedOn ?? null,
    attempts: doc.attempts ?? 0,
    solves: solves.map((s) => ({ date: s.date, language: s.language as Language, ms: s.ms ?? 0 })),
  };
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugifyTitle(title);
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await CustomProblem.exists({ slug }))) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** Validate and store a problem. The caller has already checked the cases against the reference solution. */
export async function saveCustomProblem(input: unknown, source: CustomSource): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const v = validateCustomProblem(input);
  if (!v.ok) return v;
  await connectDb();
  const slug = await uniqueSlug(v.problem.title);
  await CustomProblem.create({ ...v.problem, slug, source, solution: v.problem.solution ?? null });
  return { ok: true, slug };
}

export async function deleteCustomProblem(slug: string): Promise<void> {
  await connectDb();
  await CustomProblem.deleteOne({ slug });
  await CustomSolve.deleteMany({ slug });
}

/** An accepted submission. The first one marks the problem solved; none of this touches the daily plan or streak. */
export async function recordCustomResult(slug: string, result: { accepted: boolean; language: Language; ms: number }, now = new Date()): Promise<void> {
  await connectDb();
  if (!result.accepted) {
    await CustomProblem.updateOne({ slug }, { $inc: { attempts: 1 } });
    return;
  }
  const date = todayIn(await getSettings(), now);
  await CustomSolve.create({ slug, date, language: result.language, ms: result.ms });
  await CustomProblem.updateOne({ slug, solvedOn: null }, { $set: { solvedOn: date } });
}

export type GeneratedProblem = { kind: "draft"; draft: CustomProblemDraft; cached: boolean } | { kind: "sheet"; slug: string; title: string };

/** No AI configured: an unsolved runnable problem from the sheet instead, matching the topic when possible. */
async function sheetFallback(topic: string, difficulty: string): Promise<GeneratedProblem | null> {
  const solved = new Set((await ProblemProgress.find({ status: "solved" }, { slug: 1 }).lean()).map((p) => p.slug));
  const pool = problems.filter((p) => testcaseBySlug.has(p.slug) && !solved.has(p.slug));
  const t = topic.toLowerCase();
  const pick =
    pool.find((p) => p.pattern.toLowerCase().includes(t) && p.difficulty === difficulty) ??
    pool.find((p) => p.pattern.toLowerCase().includes(t)) ??
    pool.find((p) => p.difficulty === difficulty) ??
    pool[0];
  return pick ? { kind: "sheet", slug: pick.slug, title: pick.title } : null;
}

async function draftWith(feature: "generate-questions", cacheInput: string, prompt: string): Promise<AiResult<{ draft: CustomProblemDraft; cached: boolean }>> {
  return runAi(feature, {}, async (llm) => {
    const res = await cachedAi(
      { feature, version: GENERATE_PROMPT_VERSION, input: cacheInput, ttlDays: 7, schema: customProblemSchema, timeZone: env().APP_TIMEZONE },
      async () => {
        const raw = await llm.generateJson(prompt, customProblemSchema);
        const v = validateCustomProblem(raw);
        if (!v.ok) throw new Error(`The AI's problem didn't validate (${v.error}). Try again.`);
        return { value: v.problem, provider: llm.lastProvider };
      },
    );
    return { draft: res.value, cached: res.cached };
  });
}

/**
 * Ask the free AI chain for a new problem. Nothing is saved here: the browser first runs the reference
 * solution against the cases and drops any the solution disagrees with, then saves what's left.
 */
export async function generateProblem(input: GenerateInput): Promise<{ ok: true; result: GeneratedProblem } | { ok: false; error: string }> {
  await connectDb();
  const avoid = input.avoid.length ? input.avoid : (await CustomProblem.find({}, { title: 1 }).sort({ createdAt: -1 }).limit(40).lean()).map((p) => p.title);
  const req = { ...input, avoid };
  const res = await draftWith("generate-questions", JSON.stringify(["generate", req.topic, req.difficulty, req.company ?? "", [...avoid].sort()]), generatePrompt(req));
  if (res.ok) return { ok: true, result: { kind: "draft", ...res.data } };
  if (res.unavailable) {
    const fallback = await sheetFallback(input.topic, input.difficulty);
    if (fallback) return { ok: true, result: fallback };
  }
  return { ok: false, error: res.error };
}

/** Turn a pasted statement into a full draft (signature, cases, hints, reference solution). */
export async function draftFromStatement(statement: string): Promise<{ ok: true; draft: CustomProblemDraft } | { ok: false; error: string; unavailable?: true }> {
  const res = await draftWith("generate-questions", JSON.stringify(["draft", statement]), draftFromStatementPrompt(statement));
  if (!res.ok) return { ok: false, error: res.error, ...(res.unavailable ? { unavailable: true as const } : {}) };
  return { ok: true, draft: res.data.draft };
}