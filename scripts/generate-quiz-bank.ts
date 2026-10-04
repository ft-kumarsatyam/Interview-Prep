/**
 * Builds data/quiz-bank.json, the offline question bank used when no LLM key is
 * set (and for practice quizzes). Deterministic: re-running gives the same ids.
 *
 *   npm run quiz-bank                 # authored + verified output questions, concepts, patterns, recall coverage
 *   npm run quiz-bank -- --llm        # also ask the configured LLM to top up thin subtopics
 *   npm run quiz-bank -- --llm --track=js,node --max=40
 *
 * Output-prediction answers come from actually running each snippet (node:vm),
 * so the answer key can never be wrong. LLM questions are concept-only (no code).
 * Most questions are hand-written per subtopic in scripts/quiz-bank/authored/<topicId>.json
 * (dry-run one with scripts/check-quiz-authored.ts).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { problems, subtopicById, subtopics, topicById, topics, trackById } from "@/core/content";
import { seededRng, seedFrom, shuffle, type Rng } from "@/core/domain/sampling";
import { createLlm } from "@/core/llm";
import { LLM_PROVIDERS, type LlmProviderName } from "@/core/llm/types";
import { fromLlm, subtopicPrompt } from "@/modules/quiz/lib/prompts";
import { llmQuizSchema, quizBankSchema, quizQuestionSchema, type QuizBank, type QuizQuestion } from "@/modules/quiz/lib/question";
import { buildAllAuthored } from "./quiz-bank/authored";
import { CONCEPTS } from "./quiz-bank/concepts";
import { FORMAT_QUESTIONS } from "./quiz-bank/formats";
import { OUTPUT_SNIPPETS } from "./quiz-bank/output-snippets";
import { NO_RECOGNITION, PATTERN_FACTS } from "./quiz-bank/patterns";
import { runSnippet } from "./quiz-bank/run-snippet";

const OUT = path.join(process.cwd(), "data", "quiz-bank.json");
const TARGET_PER_SUBTOPIC = 8;
const MIN_PER_SUBTOPIC = 3;

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  }),
);

const hashId = (...parts: string[]) => `b-${createHash("sha1").update(parts.join("\u0000")).digest("hex").slice(0, 12)}`;

function mcq(input: {
  id: string;
  prompt: string;
  code?: string;
  correct: string;
  wrong: string[];
  explanation: string;
  source: QuizQuestion["source"];
  style: QuizQuestion["style"];
}): QuizQuestion {
  const rng = seededRng(seedFrom(input.id));
  const options = shuffle([input.correct, ...input.wrong.slice(0, 3)], rng);
  return quizQuestionSchema.parse({
    id: input.id,
    prompt: input.prompt,
    ...(input.code ? { code: input.code } : {}),
    options,
    answerIndex: options.indexOf(input.correct),
    explanation: input.explanation,
    source: input.source,
    style: input.style,
  });
}

function* permutations<T>(items: T[]): Generator<T[]> {
  if (items.length <= 1) {
    yield items;
    return;
  }
  for (let i = 0; i < items.length; i++) {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const p of permutations(rest)) yield [items[i], ...p];
  }
}

function permutationDistractors(actual: string, rng: Rng): string[] {
  const lines = actual.split("\n");
  if (lines.length > 7) throw new Error(`too many lines to permute; add distractors:\n${actual}`);
  const candidates = new Set<string>();
  for (const p of permutations(lines)) {
    const s = p.join("\n");
    if (s !== actual) candidates.add(s);
  }
  if (candidates.size < 3) throw new Error(`not enough distinct permutations; add distractors:\n${actual}`);
  return shuffle([...candidates], rng).slice(0, 3);
}

async function outputQuestions(): Promise<QuizQuestion[]> {
  const out: QuizQuestion[] = [];
  for (const s of OUTPUT_SNIPPETS) {
    if (!subtopicById.has(s.ref)) throw new Error(`unknown subtopic ${s.ref}`);
    const actual = (await runSnippet(s.code)).trim();
    if (!actual) throw new Error(`snippet printed nothing:\n${s.code}`);
    const id = hashId("output", s.ref, s.code);
    let wrong: string[];
    if (s.distractors) {
      const clash = s.distractors.find((d) => d.trim() === actual);
      if (clash !== undefined) throw new Error(`a distractor equals the real output (${JSON.stringify(actual)}):\n${s.code}`);
      wrong = s.distractors;
    } else {
      wrong = permutationDistractors(actual, seededRng(seedFrom(id)));
    }
    out.push(
      mcq({
        id,
        prompt: s.node ? "What does this print when run with Node.js?" : "What does this code print?",
        code: s.code,
        correct: actual,
        wrong,
        explanation: s.explanation,
        source: { kind: "subtopic", ref: s.ref },
        style: "output",
      }),
    );
  }
  return out;
}

function conceptQuestions(): QuizQuestion[] {
  return CONCEPTS.map((c) => {
    const isPattern = c.ref.startsWith("pattern:");
    const ref = isPattern ? c.ref.slice("pattern:".length) : c.ref;
    if (isPattern ? !problems.some((p) => p.pattern === ref) : !subtopicById.has(ref)) throw new Error(`unknown ref ${c.ref}`);
    return mcq({
      id: hashId("concept", c.ref, c.prompt),
      prompt: c.prompt,
      correct: c.correct,
      wrong: c.wrong,
      explanation: c.explanation,
      source: { kind: isPattern ? "pattern" : "subtopic", ref },
      style: "concept",
    });
  });
}

/** Multi-select and true/false questions. They don't count toward a subtopic's recall top-up, so adding them never changes the recall set. */
function formatQuestions(): QuizQuestion[] {
  return FORMAT_QUESTIONS.map((f) => {
    if (!subtopicById.has(f.ref)) throw new Error(`unknown subtopic ${f.ref}`);
    const common = {
      id: hashId("format", f.type, f.ref, f.prompt),
      prompt: f.prompt,
      explanation: f.explanation,
      source: { kind: "subtopic" as const, ref: f.ref },
      style: "concept" as const,
    };
    if (f.type === "multi") {
      return quizQuestionSchema.parse({ ...common, type: "multi", options: f.options, answerIndex: f.answers[0], answerIndices: f.answers });
    }
    return quizQuestionSchema.parse({ ...common, type: "truefalse", options: ["True", "False"], answerIndex: f.answer ? 0 : 1 });
  });
}

function patternQuestions(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  const names = Object.keys(PATTERN_FACTS);
  const pickOthers = (self: string, field: keyof (typeof PATTERN_FACTS)[string], rng: Rng) => {
    const own = PATTERN_FACTS[self][field];
    const values = [...new Set(names.filter((n) => n !== self).map((n) => PATTERN_FACTS[n][field]))].filter((v) => v !== own);
    return shuffle(values, rng).slice(0, 3);
  };

  for (const name of names) {
    const facts = PATTERN_FACTS[name];
    const rng = seededRng(seedFrom(name));
    const source = { kind: "pattern" as const, ref: name };
    out.push(
      mcq({ id: hashId("pattern-signal", name), prompt: `Which signal points to the ${name} pattern?`, correct: facts.signal, wrong: pickOthers(name, "signal", rng), explanation: `${name} signal: ${facts.signal}. Typical cost: ${facts.time}.`, source, style: "pattern" }),
      mcq({ id: hashId("pattern-time", name), prompt: `What's the typical time complexity of the ${name} pattern?`, correct: facts.time, wrong: pickOthers(name, "time", rng), explanation: `${name} usually runs in ${facts.time}. Key tool: ${facts.structure}.`, source, style: "pattern" }),
      mcq({ id: hashId("pattern-structure", name), prompt: `Which JavaScript tool is central to ${name}?`, correct: facts.structure, wrong: pickOthers(name, "structure", rng), explanation: `${name} leans on: ${facts.structure}.`, source, style: "pattern" }),
    );
  }

  const patternNames = [...new Set(problems.map((p) => p.pattern))].filter((p) => !NO_RECOGNITION.has(p));
  for (const pattern of patternNames) {
    const ofPattern = problems.filter((p) => p.pattern === pattern).toSorted((a, b) => a.order - b.order);
    const step = Math.max(1, Math.floor(ofPattern.length / 6));
    const chosen = ofPattern.filter((_, i) => i % step === 0).slice(0, 6);
    for (const p of chosen) {
      const id = hashId("recognise", p.slug);
      const rng = seededRng(seedFrom(id));
      const wrong = shuffle(patternNames.filter((n) => n !== pattern), rng).slice(0, 3);
      const facts = PATTERN_FACTS[pattern];
      out.push(
        mcq({
          id,
          prompt: `“${p.title}” (${p.difficulty}) is usually solved with which pattern?`,
          correct: pattern,
          wrong,
          explanation: facts ? `${pattern} signal: ${facts.signal}.` : `It's a classic ${pattern} problem.`,
          source: { kind: "problem", ref: p.slug },
          style: "pattern",
        }),
      );
    }
  }
  return out;
}

/** Two syllabus-recall questions for subtopics with too few real ones, so every Practice button works offline. */
function recallQuestions(counts: Map<string, number>): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const sub of subtopics) {
    if ((counts.get(sub.id) ?? 0) >= MIN_PER_SUBTOPIC) continue;
    const topic = topicById.get(sub.topicId)!;
    const rng = seededRng(seedFrom(sub.id));
    const sameTrack = topics.filter((t) => t.track === sub.track && t.id !== topic.id && t.title !== topic.title);
    const others = topics.filter((t) => t.track !== sub.track && t.title !== topic.title);
    const topicDistractors = [...new Set([...shuffle(sameTrack, rng), ...shuffle(others, rng)].map((t) => t.title))].slice(0, 3);
    out.push(
      mcq({
        id: hashId("recall-topic", sub.id),
        prompt: `In the roadmap, “${sub.title}” is part of which topic?`,
        correct: topic.title,
        wrong: topicDistractors,
        explanation: `It's covered in ${topic.title} (week ${topic.week}, ${trackById.get(sub.track)?.name ?? sub.track}).`,
        source: { kind: "subtopic", ref: sub.id },
        style: "recall",
      }),
    );
    const foreign = shuffle(
      subtopics.filter((s) => s.topicId !== topic.id && s.track === sub.track && !topic.subtopics.includes(s.title)),
      rng,
    )
      .map((s) => s.title)
      .filter((t, i, all) => all.indexOf(t) === i && t !== sub.title)
      .slice(0, 3);
    if (foreign.length === 3) {
      out.push(
        mcq({
          id: hashId("recall-member", sub.id),
          prompt: `Which of these belongs to “${topic.title}”?`,
          correct: sub.title,
          wrong: foreign,
          explanation: `“${sub.title}” is one of the subtopics of ${topic.title}.`,
          source: { kind: "subtopic", ref: sub.id },
          style: "recall",
        }),
      );
    }
  }
  return out;
}

function llmFromEnv() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;
  const provider = (LLM_PROVIDERS as readonly string[]).includes(process.env.LLM_PROVIDER ?? "")
    ? (process.env.LLM_PROVIDER as LlmProviderName)
    : "gemini";
  return createLlm({ provider, apiKey, model: process.env.LLM_MODEL || undefined, baseUrl: process.env.LLM_BASE_URL || undefined });
}

async function llmTopUp(existing: QuizQuestion[], keep: QuizQuestion[]): Promise<QuizQuestion[]> {
  const llm = llmFromEnv();
  if (!llm) {
    console.warn("--llm given but LLM_API_KEY is not set; skipping");
    return [];
  }
  const tracks = args.get("track")?.split(",");
  const max = Number(args.get("max") ?? Infinity);
  const real = new Map<string, number>();
  for (const q of [...existing, ...keep]) {
    if (q.source.kind === "subtopic" && q.style !== "recall") real.set(q.source.ref, (real.get(q.source.ref) ?? 0) + 1);
  }
  const added: QuizQuestion[] = [];
  let done = 0;
  for (const sub of subtopics) {
    if (done >= max) break;
    if (tracks && !tracks.includes(sub.track)) continue;
    const need = TARGET_PER_SUBTOPIC - (real.get(sub.id) ?? 0);
    if (need <= 0) continue;
    done++;
    const prompt = subtopicPrompt(sub, trackById.get(sub.track)?.name ?? sub.track, need);
    try {
      const res = await llm.generateJson(prompt, llmQuizSchema(1, need + 2));
      for (const q of res.questions.slice(0, need)) {
        try {
          added.push(fromLlm(q, hashId("llm", sub.id, q.prompt), { kind: "subtopic", ref: sub.id }));
        } catch {
          // Skip a single malformed question rather than the whole batch.
        }
      }
      console.log(`  llm ${sub.id}: +${Math.min(need, res.questions.length)}`);
    } catch (err) {
      console.warn(`  llm ${sub.id} failed: ${err instanceof Error ? err.message : err}`);
    }
    await new Promise((r) => setTimeout(r, Number(process.env.LLM_DELAY_MS ?? 4000)));
  }
  return added;
}

async function main() {
  const previous: QuizBank | null = existsSync(OUT) ? quizBankSchema.parse(JSON.parse(readFileSync(OUT, "utf8"))) : null;
  // LLM questions cost API calls, so they survive regeneration as long as their subtopic still exists.
  const keptLlm = (previous?.questions ?? []).filter((q) => q.style === "llm" && subtopicById.has(q.source.ref));

  const output = await outputQuestions();
  const concept = conceptQuestions();
  const pattern = patternQuestions();
  const formats = formatQuestions();
  const authored = await buildAllAuthored();
  if (authored.errors.length) throw new Error(`authored questions are invalid:\n${authored.errors.map((e) => `- ${e}`).join("\n")}`);
  const base = [...output, ...concept, ...pattern, ...authored.questions];
  const fresh = args.has("llm") ? await llmTopUp(base, keptLlm) : [];

  const counts = new Map<string, number>();
  for (const q of [...base, ...keptLlm, ...fresh]) {
    if (q.source.kind === "subtopic") counts.set(q.source.ref, (counts.get(q.source.ref) ?? 0) + 1);
  }
  const recall = recallQuestions(counts);

  const byId = new Map<string, QuizQuestion>();
  for (const q of [...base, ...formats, ...keptLlm, ...fresh, ...recall]) byId.set(q.id, q);
  const bank: QuizBank = { version: 1, generatedAt: new Date().toISOString(), questions: [...byId.values()] };
  quizBankSchema.parse(bank);
  writeFileSync(OUT, `${JSON.stringify(bank, null, 1)}\n`);

  console.log(
    `quiz bank: ${bank.questions.length} questions → ${path.relative(process.cwd(), OUT)}\n` +
      `  authored ${authored.questions.length} · output ${output.length} (vm-verified) · concept ${concept.length} · formats ${formats.length} · pattern ${pattern.length} · llm ${keptLlm.length + fresh.length} · recall ${recall.length}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
