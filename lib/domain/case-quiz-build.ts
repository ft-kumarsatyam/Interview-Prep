import { CASE_ANCHORS, MIN_QUESTIONS_PER_CASE, type CaseKind } from "./case-quiz";
import { seededRng, seedFrom, shuffle } from "./sampling";

/** What an author writes. Ids are assigned, multi answers are given as `answerIndices` only, and options are shuffled on build. */
export interface AuthoredCaseQuestion {
  prompt: string;
  code?: string;
  options: string[];
  type?: "single" | "multi" | "truefalse";
  /** single and true/false: the right option's index. */
  answerIndex?: number;
  /** multi: every right option's index. */
  answerIndices?: number[];
  explanation: string;
  anchor: string;
  reading?: number;
  difficulty?: "easy" | "medium" | "hard";
}

export interface BuiltCaseQuestion {
  id: string;
  prompt: string;
  code?: string;
  options: string[];
  answerIndex: number;
  type?: "multi" | "truefalse";
  answerIndices?: number[];
  explanation: string;
  anchor: string;
  reading?: number;
  difficulty?: "easy" | "medium" | "hard";
}

/**
 * Turns authored questions into stored ones: stable ids, true/false kept in order (True first), and single/multi
 * options shuffled with a per-question seed so the right answer isn't predictable by position. The shuffle is
 * deterministic, so rebuilding the same input gives the same file.
 */
export function buildCaseQuestions(kind: CaseKind, slug: string, authored: readonly AuthoredCaseQuestion[]): { questions: BuiltCaseQuestion[]; errors: string[] } {
  const errors: string[] = [];
  const questions: BuiltCaseQuestion[] = [];
  authored.forEach((a, n) => {
    const where = `${kind}:${slug} #${n + 1}`;
    const type = a.type ?? "single";
    const id = `cq-${kind}-${slug}-${String(n + 1).padStart(2, "0")}`;
    const bad = (m: string) => errors.push(`${where}: ${m}`);
    if (!CASE_ANCHORS[kind].includes(a.anchor)) bad(`anchor "${a.anchor}" is not a section of a ${kind} case page`);
    if (new Set(a.options).size !== a.options.length) bad("options must be distinct");
    if (a.difficulty !== undefined && !["easy", "medium", "hard"].includes(a.difficulty)) bad(`difficulty "${a.difficulty}" must be easy, medium or hard`);
    if (type === "truefalse") {
      if (a.options.join("|") !== "True|False") return bad('true/false options must be exactly ["True","False"]');
      if (a.answerIndex !== 0 && a.answerIndex !== 1) return bad("true/false needs answerIndex 0 (True) or 1 (False)");
      questions.push({ id, prompt: a.prompt, ...(a.code ? { code: a.code } : {}), options: [...a.options], answerIndex: a.answerIndex, type: "truefalse", explanation: a.explanation, anchor: a.anchor, ...(a.reading === undefined ? {} : { reading: a.reading }), ...(a.difficulty ? { difficulty: a.difficulty } : {}) });
      return;
    }
    if (a.options.length < 3 || a.options.length > 6) return bad("single/multi questions need 3-6 options");
    const right = type === "multi" ? (a.answerIndices ?? []) : a.answerIndex === undefined ? [] : [a.answerIndex];
    if (right.length === 0 || right.some((i) => !Number.isInteger(i) || i < 0 || i >= a.options.length)) return bad("answer index is missing or outside the options");
    if (type === "single" && right.length !== 1) return bad("single questions have exactly one answer");
    if (type === "multi" && (new Set(right).size !== right.length || right.length < 2 || right.length >= a.options.length)) return bad("multi questions need 2+ distinct answers and at least one wrong option");
    if (a.options.some((o) => /^(all|none|both) of the (above|options)|^both [a-d] and [a-d]$/i.test(o.trim()))) bad('"all/none/both of the above" options break once options are shuffled');
    const order = shuffle(a.options.map((_, i) => i), seededRng(seedFrom(id)));
    const options = order.map((i) => a.options[i]!);
    const mapped = right.map((old) => order.indexOf(old)).sort((x, y) => x - y);
    questions.push({
      id,
      prompt: a.prompt,
      ...(a.code ? { code: a.code } : {}),
      options,
      answerIndex: mapped[0]!,
      ...(type === "multi" ? { type: "multi" as const, answerIndices: mapped } : {}),
      explanation: a.explanation,
      anchor: a.anchor,
      ...(a.reading === undefined ? {} : { reading: a.reading }),
      ...(a.difficulty ? { difficulty: a.difficulty } : {}),
    });
  });
  if (questions.length < MIN_QUESTIONS_PER_CASE) errors.push(`${kind}:${slug}: needs at least ${MIN_QUESTIONS_PER_CASE} questions (has ${questions.length})`);
  return { questions, errors };
}
