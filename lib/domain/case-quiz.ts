import { shuffle, type Rng } from "./sampling";

/** The three kinds of "case" that get their own quiz: System Design cases, OS cases and DBMS cases. */
export const CASE_KINDS = ["hld", "os", "dbms"] as const;
export type CaseKind = (typeof CASE_KINDS)[number];

/** Questions per run. Every case has more than this in the bank, so retakes aren't identical. */
export const CASE_QUIZ_SIZE = 8;
export const MIN_QUESTIONS_PER_CASE = 8;

/** Section ids on each kind of case page (the `id` of each heading), so a "Learn more" link can deep-link to one. */
export const CASE_ANCHORS: Record<CaseKind, readonly string[]> = {
  hld: ["functional", "non-functional", "estimates", "api", "data-model", "architecture", "deep-dives", "tradeoffs", "probes", "blocks", "readings"],
  os: ["prompt", "talking-points", "diagram", "tradeoffs", "probes", "readings"],
  dbms: ["prompt", "talking-points", "diagram", "tradeoffs", "probes", "readings"],
};

export const ANCHOR_LABELS: Record<string, string> = {
  functional: "Functional requirements",
  "non-functional": "Non-functional requirements",
  estimates: "Back-of-the-envelope",
  api: "API",
  "data-model": "Data model",
  architecture: "High-level architecture",
  "deep-dives": "Deep dives",
  tradeoffs: "Trade-offs",
  probes: "Interviewer follow-ups",
  blocks: "Building blocks",
  readings: "Further reading",
  prompt: "The question",
  "talking-points": "What a strong answer covers",
  diagram: "Diagram",
};

/** `case:hld:url-shortener`: the ref a case quiz uses for practice runs and mastery. */
export const caseRef = (kind: CaseKind, slug: string) => `case:${kind}:${slug}`;

const CASE_REF = /^case:(hld|os|dbms):([a-z0-9][a-z0-9-]*)$/;

export function parseCaseRef(ref: string): { kind: CaseKind; slug: string } | null {
  const m = CASE_REF.exec(ref);
  return m ? { kind: m[1] as CaseKind, slug: m[2]! } : null;
}

/** Where a case lives in the app. */
export function casePath(kind: CaseKind, slug: string, anchor?: string): string {
  const base = kind === "hld" ? `/design/${slug}` : `/design/${kind}/${slug}`;
  return anchor ? `${base}#${anchor}` : base;
}

/**
 * Pick `n` questions for a run: a seeded shuffle, but if the case has multi-select or true/false
 * questions and the draw missed them all, one replaces the last pick so every run tries the formats.
 */
export function pickCaseQuestions<T extends { id: string; type?: string }>(questions: readonly T[], n: number, rng: Rng): T[] {
  const shuffled = shuffle(questions, rng);
  const picked = shuffled.slice(0, n);
  const isOther = (q: T) => q.type === "multi" || q.type === "truefalse";
  if (picked.length > 1 && !picked.some(isOther)) {
    const swap = shuffled.slice(n).find(isOther);
    if (swap) picked[picked.length - 1] = swap;
  }
  return picked;
}
