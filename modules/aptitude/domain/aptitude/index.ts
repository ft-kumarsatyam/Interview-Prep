import { seededRng, seedFrom, shuffle, type Rng } from "@/core/domain/sampling";
import type { Difficulty } from "@/modules/quiz/lib/question";
import { LOGICAL_GENERATORS } from "@/modules/aptitude/domain/aptitude/logical";
import { QUANT_GENERATORS } from "@/modules/aptitude/domain/aptitude/quant";
import type { AptitudeQuestion, Generator } from "@/modules/aptitude/domain/aptitude/question";
import { aptitudeTopicById, topicsIn, type AptitudeCategoryId } from "@/modules/aptitude/domain/aptitude/topics";

export type { AptitudeQuestion } from "@/modules/aptitude/domain/aptitude/question";

/** One hand-written question. Either `c`/`w` (answer + wrong options, shuffled) or `o`/`a` (fixed option order). */
export interface BankEntry {
  p: string;
  c?: string;
  w?: string[];
  o?: string[];
  a?: number;
  e: string;
  difficulty?: Difficulty;
}
export type AptitudeBank = Record<string, BankEntry[]>;

/** Options for a drill: prefer one difficulty, and rotate through the bank using what you've answered before. */
export interface DrillOptions {
  difficulty?: Difficulty | null;
  /** Bank question keys you've answered before. */
  seen?: ReadonlySet<string>;
  /** Bank question keys whose latest answer was wrong. */
  wrong?: ReadonlySet<string>;
}

/** Stable id for a hand-written question, so answers can be remembered across drills. */
export function bankKey(topic: string, entry: BankEntry): string {
  const answer = entry.o && entry.a !== undefined ? entry.o[entry.a] : entry.c;
  return `${topic}:${seedFrom(`${entry.p}\u0000${answer ?? ""}`).toString(36)}`;
}

/** Hand-written questions are told apart by key (several verbal items share a generic prompt); generated ones by prompt. */
export const questionIdentity = (q: Pick<AptitudeQuestion, "prompt" | "key">): string => q.key ?? q.prompt;

/** Unseen first, then last-answered-wrong, then known; random within each tier. */
function rotate(entries: readonly BankEntry[], topic: string, rng: Rng, opts: DrillOptions): BankEntry[] {
  const shuffled = shuffle(entries, rng);
  if (!opts.seen?.size) return shuffled;
  const tier = (e: BankEntry) => {
    const key = bankKey(topic, e);
    return !opts.seen!.has(key) ? 0 : opts.wrong?.has(key) ? 1 : 2;
  };
  return shuffled.map((e) => ({ e, t: tier(e) })).sort((x, y) => x.t - y.t).map((x) => x.e);
}

function entriesFor(topicId: string, bank: AptitudeBank, difficulty?: Difficulty | null): BankEntry[] {
  const all = bank[topicId] ?? [];
  if (!difficulty) return all;
  const matching = all.filter((e) => e.difficulty === difficulty);
  return matching.length > 0 ? matching : all;
}

const GENERATORS: Record<string, Generator[]> = { ...QUANT_GENERATORS, ...LOGICAL_GENERATORS };

/** Position of an option in the standard exam order (A–D; I alone, II alone, either, both, neither), or null. */
function conventionalRank(option: string): number | null {
  const o = option.trim();
  if (/^[A-D]$/.test(o)) return o.charCodeAt(0) - 65;
  if (/^(only i\b|(statement )?i alone)/i.test(o)) return 0;
  if (/^(only ii\b|(statement )?ii alone)/i.test(o)) return 1;
  if (/^either\b/i.test(o)) return 2;
  if (/^both\b/i.test(o)) return 3;
  if (/^(neither\b|data inadequate|even both|none of the statements)/i.test(o)) return 4;
  return null;
}

/** True when every option has a distinct place in a standard order ("Only I…", A–D, …), so it must not be shuffled. */
export function hasConventionalOrder(options: readonly string[]): boolean {
  const ranks = options.map(conventionalRank);
  return ranks.every((r) => r !== null) && new Set(ranks).size === ranks.length;
}

/** Standard order when there is one (so the answer isn't always first), otherwise shuffled. */
function arrange(options: readonly string[], rng: Rng): string[] {
  return hasConventionalOrder(options) ? options.toSorted((a, b) => conventionalRank(a)! - conventionalRank(b)!) : shuffle(options, rng);
}

function fromBank(entry: BankEntry, topic: string, id: string, rng: Rng): AptitudeQuestion {
  const extra = { key: bankKey(topic, entry), ...(entry.difficulty ? { difficulty: entry.difficulty } : {}) };
  const correct = entry.o && entry.a !== undefined ? entry.o[entry.a]! : (entry.c ?? "");
  const options = arrange(entry.o && entry.a !== undefined ? entry.o : [correct, ...(entry.w ?? [])], rng);
  return { id, topic, prompt: entry.p, options, answerIndex: options.indexOf(correct), explanation: entry.e, ...extra };
}

export function hasQuestions(topicId: string, bank: AptitudeBank): boolean {
  return (GENERATORS[topicId]?.length ?? 0) > 0 || (bank[topicId]?.length ?? 0) > 0;
}

/** How many distinct questions a drill on this topic can offer: bank-only topics are finite. */
export function maxQuestions(topicId: string, bank: AptitudeBank, difficulty?: Difficulty | null): number {
  return (GENERATORS[topicId]?.length ?? 0) > 0 ? Infinity : entriesFor(topicId, bank, difficulty).length;
}

/** Hand-written questions per difficulty, for the drill's filter chips. */
export function bankDifficultyCounts(topicId: string, bank: AptitudeBank): Record<Difficulty, number> {
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const e of bank[topicId] ?? []) if (e.difficulty) counts[e.difficulty]++;
  return counts;
}

/**
 * `count` distinct questions for one topic. Generated topics never run dry;
 * hand-written topics are capped at the size of their bank (or of one difficulty, when chosen)
 * and rotate: questions you haven't answered come first. Deterministic per seed and history.
 */
export function buildTopicQuestions(topicId: string, count: number, seed: number, bank: AptitudeBank, opts: DrillOptions = {}): AptitudeQuestion[] {
  if (!aptitudeTopicById.has(topicId)) throw new Error(`Unknown aptitude topic: ${topicId}`);
  const rng = seededRng(seed);
  const gens = GENERATORS[topicId] ?? [];
  const entries = rotate(entriesFor(topicId, bank, opts.difficulty), topicId, rng, opts);
  const out: AptitudeQuestion[] = [];
  const seen = new Set<string>();
  const push = (q: AptitudeQuestion) => {
    const identity = questionIdentity(q);
    if (seen.has(identity)) return false;
    seen.add(identity);
    out.push(q);
    return true;
  };
  let bankPos = 0;
  let genPos = 0;
  let attempts = 0;
  const genOrder = shuffle(gens.map((_, i) => i), rng);
  while (out.length < count && attempts < count * 12) {
    attempts++;
    const useBank = bankPos < entries.length && (gens.length === 0 || out.length % 2 === 0);
    const id = `${topicId}-${seed}-${out.length}`;
    if (useBank) {
      push(fromBank(entries[bankPos++], topicId, id, rng));
    } else if (gens.length > 0) {
      const draft = gens[genOrder[genPos++ % gens.length]](rng);
      push({ id, topic: topicId, ...draft });
    } else if (bankPos >= entries.length) {
      break;
    }
  }
  return out;
}

/** A mixed test across every topic in a category, one question per topic in turn. */
export function buildMockQuestions(category: AptitudeCategoryId, count: number, seed: number, bank: AptitudeBank, opts: DrillOptions = {}): AptitudeQuestion[] {
  const rng = seededRng(seed);
  const topics = shuffle(topicsIn(category).filter((t) => hasQuestions(t.id, bank)), rng);
  const out: AptitudeQuestion[] = [];
  const seen = new Set<string>();
  let round = 0;
  while (out.length < count && round < count * 4) {
    const topic = topics[round % topics.length];
    const [q] = buildTopicQuestions(topic.id, 1, seed + round * 104729, bank, opts);
    round++;
    if (!q || seen.has(questionIdentity(q))) continue;
    seen.add(questionIdentity(q));
    out.push({ ...q, id: `${category}-${seed}-${out.length}` });
  }
  return out;
}
