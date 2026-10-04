import bankJson from "@/data/quiz-bank.json";
import { problemBySlug, subtopicById } from "@/core/content";
import { quizBankSchema, type QuizQuestion } from "@/modules/quiz/lib/question";

export interface BankIndex {
  all: QuizQuestion[];
  byId: Map<string, QuizQuestion>;
  bySubtopic: Map<string, QuizQuestion[]>;
  /** Pattern facts plus "which pattern solves X" questions for problems of that pattern. */
  byPattern: Map<string, QuizQuestion[]>;
  byTrack: Map<string, QuizQuestion[]>;
}

let cached: BankIndex | undefined;

function push<K>(map: Map<K, QuizQuestion[]>, key: K, q: QuizQuestion) {
  const list = map.get(key);
  if (list) list.push(q);
  else map.set(key, [q]);
}

/** The static question bank (data/quiz-bank.json), validated once and indexed. */
export function bank(): BankIndex {
  if (cached) return cached;
  const { questions } = quizBankSchema.parse(bankJson);
  const index: BankIndex = { all: questions, byId: new Map(), bySubtopic: new Map(), byPattern: new Map(), byTrack: new Map() };
  for (const q of questions) {
    index.byId.set(q.id, q);
    const { kind, ref } = q.source;
    if (kind === "subtopic") {
      push(index.bySubtopic, ref, q);
      const sub = subtopicById.get(ref);
      if (sub) push(index.byTrack, sub.track, q);
    } else if (kind === "pattern") {
      push(index.byPattern, ref, q);
    } else if (kind === "problem") {
      const p = problemBySlug.get(ref);
      if (p) push(index.byPattern, p.pattern, q);
    }
  }
  cached = index;
  return index;
}

/** Hand-written and verified questions beat generated recall questions. */
export function questionWeight(q: QuizQuestion): number {
  return q.style === "recall" ? 1 : 3;
}
