/**
 * Web-dev interview bank: questions with a model answer, follow-ups and the mistakes weak answers make,
 * grouped by track (data/web-interview/*.json). Practice status is separate from lessons and the plan. Pure.
 */
import { z } from "zod";
import { WEB_AREAS } from "@/modules/learn/domain/webdev";

const text = (max: number, min = 1) => z.string().trim().min(min).max(max);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const INTERVIEW_LEVELS = ["junior", "mid", "senior"] as const;
export type InterviewLevel = (typeof INTERVIEW_LEVELS)[number];

export const INTERVIEW_STATUSES = ["new", "review", "known"] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const interviewQuestionSchema = z.object({
  id: slug,
  level: z.enum(INTERVIEW_LEVELS),
  q: text(240, 8),
  /** Markdown: the answer you would give out loud, then the detail behind it. */
  answer: text(6000, 300),
  followUps: z.array(text(200)).max(4),
  mistakes: z.array(text(240)).min(1).max(4),
  /** A lesson in data/webdev.json that teaches this. */
  lesson: slug.optional(),
});
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;

export const interviewTrackSchema = z.object({ id: slug, name: text(60), blurb: text(200, 10), area: z.enum(WEB_AREAS) });
export type InterviewTrack = z.infer<typeof interviewTrackSchema>;

export const interviewFileSchema = z.object({ track: interviewTrackSchema, questions: z.array(interviewQuestionSchema).min(6) });
export type InterviewFile = z.infer<typeof interviewFileSchema>;

export type TrackedQuestion = InterviewQuestion & { track: string };

/** Every problem with the bank as a list of messages (empty when it is consistent). */
export function interviewProblems(files: readonly InterviewFile[], lessonIds: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const tracks = new Set<string>();
  for (const f of files) {
    if (tracks.has(f.track.id)) out.push(`duplicate track ${f.track.id}`);
    tracks.add(f.track.id);
    const qs = new Set<string>();
    for (const q of f.questions) {
      if (seen.has(q.id)) out.push(`duplicate question id ${q.id}`);
      seen.add(q.id);
      const key = q.q.toLowerCase();
      if (qs.has(key)) out.push(`${f.track.id}: duplicate question "${q.q}"`);
      qs.add(key);
      if (q.lesson && !lessonIds.has(q.lesson)) out.push(`${q.id}: unknown lesson ${q.lesson}`);
      if (/<\/?(script|iframe|style|img)\b/i.test(q.answer.replace(/```[\s\S]*?```/g, ""))) out.push(`${q.id}: raw HTML in answer`);
    }
  }
  return out;
}

export interface InterviewStats {
  total: number;
  known: number;
  review: number;
  fresh: number;
  pct: number;
}

export function interviewStats(questions: readonly { id: string }[], status: ReadonlyMap<string, InterviewStatus>): InterviewStats {
  let known = 0;
  let review = 0;
  for (const q of questions) {
    const s = status.get(q.id);
    if (s === "known") known++;
    else if (s === "review") review++;
  }
  const total = questions.length;
  return { total, known, review, fresh: total - known - review, pct: total ? Math.round((100 * known) / total) : 0 };
}

export interface InterviewFilter {
  level?: InterviewLevel | "all";
  status?: InterviewStatus | "all";
  search?: string;
}

export function filterQuestions<Q extends Pick<InterviewQuestion, "id" | "level" | "q" | "answer">>(questions: readonly Q[], status: ReadonlyMap<string, InterviewStatus>, f: InterviewFilter): Q[] {
  const terms = (f.search ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  return questions.filter((q) => {
    if (f.level && f.level !== "all" && q.level !== f.level) return false;
    if (f.status && f.status !== "all" && (status.get(q.id) ?? "new") !== f.status) return false;
    if (!terms.length) return true;
    const hay = `${q.q} ${q.answer}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

/** Small deterministic PRNG so a practice round is shuffled but stable for a given seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Practice order: questions marked for review first, then unseen, then known; shuffled inside each group. */
export function practiceOrder(ids: readonly string[], status: ReadonlyMap<string, InterviewStatus>, seed: number): string[] {
  const rand = mulberry32(seed);
  const rank = (id: string) => ({ review: 0, new: 1, known: 2 })[status.get(id) ?? "new"];
  return ids
    .map((id) => ({ id, r: rank(id), k: rand() }))
    .toSorted((a, b) => a.r - b.r || a.k - b.k)
    .map((x) => x.id);
}
