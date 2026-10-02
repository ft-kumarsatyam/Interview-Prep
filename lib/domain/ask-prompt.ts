/**
 * Ready-to-paste prompts for your Gemini projects. Each carries everything Gemini needs
 * (the question, what you answered, the code and the failure), so you don't retype context.
 * Capped so a huge snippet can't produce an unusable clipboard.
 */
export const MAX_PROMPT_CHARS = 6000;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}\n... (cut)` : text);
const fence = (code: string, lang = "") => `\`\`\`${lang}\n${code.replace(/```/g, "'''")}\n\`\`\``;
const letter = (i: number) => String.fromCharCode(65 + i);

function finish(parts: Array<string | null | undefined | false>): string {
  return clip(parts.filter((p): p is string => !!p).join("\n\n"), MAX_PROMPT_CHARS);
}

export interface QuizAskInput {
  prompt: string;
  code?: string;
  options: readonly string[];
  /** Option indices you picked (empty when you skipped). */
  chosen: readonly number[];
  correct: readonly number[];
  explanation?: string;
  topic?: string;
}

export function quizPrompt(q: QuizAskInput): string {
  const list = (idx: readonly number[]) => (idx.length ? idx.map((i) => `${letter(i)}. ${q.options[i] ?? "?"}`).join("\n") : "(I skipped it)");
  const right = q.chosen.length === q.correct.length && q.chosen.every((i) => q.correct.includes(i));
  return finish([
    `I'm preparing for software engineering interviews${q.topic ? ` and studying ${q.topic}` : ""}. I ${right ? "answered this correctly but want to understand it more deeply" : "got this quiz question wrong"}. Explain the concept properly: why the right answer is right, why the others are wrong, and a small example I can remember. Then ask me one follow-up question to check I understood.`,
    `Question: ${q.prompt}`,
    q.code ? `Code:\n${fence(q.code, "js")}` : null,
    `Options:\n${q.options.map((o, i) => `${letter(i)}. ${o}`).join("\n")}`,
    `My answer:\n${list(q.chosen)}`,
    `Correct answer:\n${list(q.correct)}`,
    q.explanation ? `The quiz's explanation: ${q.explanation}` : null,
  ]);
}

export interface DsaAskInput {
  title: string;
  difficulty?: string;
  pattern?: string;
  code: string;
  /** What went wrong, e.g. "2 of 5 cases failed", or the failing case. */
  failure?: string;
  statement?: string;
}

/** Asks for a hint ladder, not the solution, since the point is to learn it. */
export function dsaPrompt(p: DsaAskInput): string {
  return finish([
    `I'm solving the LeetCode problem "${p.title}"${p.difficulty ? ` (${p.difficulty}` : ""}${p.pattern ? `${p.difficulty ? ", " : " ("}${p.pattern}` : ""}${p.difficulty || p.pattern ? ")" : ""} in JavaScript and I'm stuck. Don't give me the full solution. Give me a hint ladder: first a small nudge, then the key idea, then pseudocode only if I ask. Point out any bug or missed edge case in my code, and tell me the time and space complexity of my approach.`,
    p.statement ? `Problem:\n${clip(p.statement, 1800)}` : null,
    p.failure ? `What's failing: ${p.failure}` : null,
    `My code:\n${fence(clip(p.code, 3000), "js")}`,
  ]);
}

export interface CaseAskInput {
  kind: "System Design" | "Operating Systems" | "Databases";
  title: string;
  summary?: string;
  prompt?: readonly string[];
  /** Your written mock answer, if you have one. */
  answer?: string;
}

export function casePrompt(c: CaseAskInput): string {
  return finish([
    c.answer
      ? `I'm practising an interview answer on ${c.kind}. Critique my answer like a strict interviewer: what's missing, what's wrong, which trade-offs and numbers I should add, and what follow-up questions I'd get. Then give a model answer outline.`
      : `I'm preparing for interviews. Teach me "${c.title}" (${c.kind}) properly: start from first principles, explain the key trade-offs, give a concrete example with numbers, and finish with 5 follow-up questions an interviewer would ask.`,
    c.summary ? `Topic: ${c.summary}` : null,
    c.prompt?.length ? `Interview question${c.prompt.length > 1 ? "s" : ""}:\n${c.prompt.map((q) => `- ${q}`).join("\n")}` : null,
    c.answer ? `My answer:\n${clip(c.answer, 3500)}` : null,
  ]);
}

const heading = (id: string) => id.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

/** Your saved mock-answer sections as one block, skipping empty ones. */
export function joinSections(sections: Readonly<Record<string, string | undefined>>): string {
  return Object.entries(sections)
    .filter(([, text]) => (text ?? "").trim() !== "")
    .map(([id, text]) => `${heading(id)}:\n${text!.trim()}`)
    .join("\n\n");
}
