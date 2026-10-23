/**
 * Picks the questions of a test. A weekly test mixes this week's questions with review questions from earlier weeks,
 * weighted towards what you missed or never saw; the last weeks are mostly review. Deterministic for a seed. Pure.
 */
import { seedFrom, seededRng, shuffle, weightedSample, type Rng } from "@/core/domain/sampling";
import { MCQ_COUNT, WRITTEN_COUNT, type TestKind } from "@/modules/genai-test/domain/schemas";
import type { McqQ, Pool, PoolQ, QStat, WrittenQ } from "@/modules/genai-test/domain/pool";

export const LAST_WEEKS_FROM = 20;
export const REVIEW_RECENT_DAYS = 7;

export interface SelectInput {
  kind: TestKind;
  pool: Pool;
  weekIdx: number;
  weekId: string;
  /** Roadmap levels mapped to this week. */
  weekLevels: readonly number[];
  /** Playbook weeks before this one. */
  priorWeeks: ReadonlySet<string>;
  /** Roadmap levels mapped to earlier weeks. */
  priorLevels: ReadonlySet<number>;
  /** Covered topics as `${node}/${key}`. */
  covered: ReadonlySet<string>;
  history: ReadonlyMap<string, QStat>;
  seed: string;
  today: string;
  /** For kind "level". */
  level?: number;
}

export interface PickedQuestion {
  q: PoolQ;
  /** Drawn from a topic you have not marked yet. */
  ahead: boolean;
  review: boolean;
}

/** Share of a weekly test taken from earlier weeks. */
export function reviewShare(weekIdx: number): number {
  if (weekIdx <= 1) return 0;
  return weekIdx >= LAST_WEEKS_FROM ? 0.75 : 0.4;
}

/** Heavier for never seen and missed questions, light for ones you got right recently. */
export function reviewWeight(stat: QStat | undefined, today: string): number {
  if (!stat) return 4;
  if (stat.lastCorrect === false) return 3;
  if (stat.last && (Date.parse(today) - Date.parse(stat.last)) / 86_400_000 < REVIEW_RECENT_DAYS) return 0.3;
  return 1;
}

const nodeCovered = (covered: ReadonlySet<string>, node: string | undefined): boolean => {
  if (!node) return false;
  const prefix = `${node}/`;
  for (const t of covered) if (t.startsWith(prefix)) return true;
  return false;
};

const eligible = (q: PoolQ, covered: ReadonlySet<string>): boolean => (q.kind === "written" && q.topic ? covered.has(q.topic) : q.kind === "mcq" && q.node ? nodeCovered(covered, q.node) : true);

function draw<T extends PoolQ>(items: readonly T[], n: number, input: SelectInput, rng: Rng, taken: Set<string>): T[] {
  const fresh = items.filter((q) => !taken.has(q.id));
  const picked = weightedSample(fresh, (q) => reviewWeight(input.history.get(q.id), input.today), n, rng);
  for (const q of picked) taken.add(q.id);
  return picked;
}

function pick<T extends PoolQ>(items: readonly T[], count: number, input: SelectInput, rng: Rng, taken: Set<string>): PickedQuestion[] {
  const { kind, weekId, weekLevels, priorWeeks, priorLevels, covered } = input;
  const inWeek = (q: PoolQ) => (q.weekId ? q.weekId === weekId : weekLevels.includes(q.level));
  const inPrior = (q: PoolQ) => (q.weekId ? priorWeeks.has(q.weekId) : priorLevels.has(q.level));
  let current: T[] = [];
  let review: T[] = [];
  if (kind === "level") {
    current = items.filter((q) => q.level === input.level && !q.weekId);
  } else if (kind === "cumulative") {
    review = items.filter((q) => !q.weekId ? true : q.weekId === weekId || priorWeeks.has(q.weekId));
  } else {
    current = items.filter(inWeek);
    review = items.filter((q) => !inWeek(q) && inPrior(q));
  }
  const share = kind === "weekly" ? reviewShare(input.weekIdx) : kind === "cumulative" ? 1 : 0;
  const wantReview = Math.round(count * share);
  const out: PickedQuestion[] = [];
  const add = (qs: T[], isReview: boolean, ahead: boolean) => qs.forEach((q) => out.push({ q, ahead, review: isReview }));
  // Review first (covered topics only), then this week's covered topics, then top up from topics you have not marked yet.
  add(draw(review.filter((q) => eligible(q, covered) || q.weekId !== undefined), wantReview, input, rng, taken), true, false);
  add(draw(current.filter((q) => eligible(q, covered) || q.weekId !== undefined), count - out.length, input, rng, taken), false, false);
  if (out.length < count) add(draw(current, count - out.length, input, rng, taken), false, true);
  if (out.length < count) add(draw(review.filter((q) => eligible(q, covered) || q.weekId !== undefined), count - out.length, input, rng, taken), true, false);
  return out;
}

/** The questions of one test: MCQs first, then written, MCQ options shuffled (the answer index is updated to match). */
export function selectTest(input: SelectInput): PickedQuestion[] {
  const rng = seededRng(seedFrom(input.seed));
  const taken = new Set<string>();
  const mcq = pick<McqQ>(input.pool.mcq, MCQ_COUNT[input.kind], input, rng, taken);
  const written = pick<WrittenQ>(input.pool.written, WRITTEN_COUNT[input.kind], input, rng, taken);
  const shuffled = mcq.map((p) => {
    const q = p.q as McqQ;
    const order = shuffle(q.options.map((_, i) => i), rng);
    return { ...p, q: { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) } };
  });
  return [...shuffle(shuffled, rng), ...written];
}
