import { problemBySlug, subtopicById, testcaseBySlug } from "@/core/content";
import { connectDb } from "@/core/db";
import type { DateStr } from "@/core/domain/dates";
import { applySolve } from "@/modules/progress/domain/progress";
import type { Confidence } from "@/modules/quiz/domain/srs";
import { ProblemProgress, SubtopicProgress } from "@/core/models/progress";
import { recomputeDay } from "@/modules/planner/services/day";

export interface SolveDetails {
  confidence: Confidence;
  timeTakenMin?: number;
  approach?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
}

export interface SolveInput {
  slug: string;
  date: DateStr;
  source: "manual" | "leetcode";
  /** Missing for LeetCode imports: the review ladder assumes "ok" until filled in. */
  details?: SolveDetails;
}

/**
 * The one write path for solves: manual marks, review re-solves and LeetCode
 * sync all come through here so DayLog counts and completion stay consistent.
 */
export async function recordSolve(input: SolveInput) {
  await writeSolve(input);
  return recomputeDay(input.date);
}

/**
 * Several solves (a LeetCode sync) in order, recounting each affected day once
 * instead of once per solve. Writes stay sequential: two solves of one problem depend on each other.
 */
export async function recordSolves(inputs: readonly SolveInput[]): Promise<void> {
  for (const input of inputs) await writeSolve(input);
  for (const date of [...new Set(inputs.map((i) => i.date))].toSorted()) await recomputeDay(date);
}

/** The ProblemProgress write behind a solve, without recounting the day. */
async function writeSolve(input: SolveInput): Promise<void> {
  if (!problemBySlug.has(input.slug)) throw new Error(`Unknown problem: ${input.slug}`);
  await connectDb();
  const prior = await ProblemProgress.findOne({ slug: input.slug }).lean();
  const priorSolve = prior?.status === "solved" ? { solveDates: prior.solveDates ?? [], reviewCount: prior.reviewCount ?? 0 } : null;

  const imported = input.source === "leetcode";
  const confidence: Confidence = input.details?.confidence ?? (prior?.confidence as Confidence | undefined) ?? "ok";
  const outcome = applySolve(priorSolve, input.date, confidence);

  // A sync never overwrites details you already gave for the same day.
  if (imported && !outcome.isNewSolveDay) return;

  await ProblemProgress.updateOne(
    { slug: input.slug },
    {
      $set: {
        status: "solved",
        solveDates: outcome.solveDates,
        reviewCount: outcome.reviewCount,
        nextReviewAt: outcome.nextReviewAt,
        firstSolvedOn: outcome.firstSolvedOn,
        lastSolvedOn: outcome.lastSolvedOn,
        confidence,
        needsDetails: imported,
        ...(imported ? { source: "leetcode" } : {}),
        ...(input.details
          ? {
              timeTakenMin: input.details.timeTakenMin,
              approach: input.details.approach,
              timeComplexity: input.details.timeComplexity,
              spaceComplexity: input.details.spaceComplexity,
            }
          : {}),
      },
    },
    { upsert: true },
  );
}

/** Upserts a bare "attempted" row for a Run or a failed Submit. Never downgrades an already-solved problem. */
export async function markAttempted(slug: string): Promise<void> {
  if (!problemBySlug.has(slug)) throw new Error(`Unknown problem: ${slug}`);
  await connectDb();
  await ProblemProgress.updateOne({ slug }, { $setOnInsert: { status: "attempted" } }, { upsert: true });
}

/** Reveals one hidden test case for good. Only an index that really is hidden counts, so this can't be used to probe other data. */
export async function revealHiddenCase(slug: string, index: number): Promise<boolean> {
  const entry = testcaseBySlug.get(slug);
  if (!entry || !Number.isInteger(index) || !entry.cases[index]?.hidden) return false;
  await connectDb();
  await ProblemProgress.updateOne({ slug }, { $addToSet: { revealedCases: index }, $setOnInsert: { status: "attempted" } }, { upsert: true });
  return true;
}

export async function saveProblemNotes(slug: string, notes: string): Promise<void> {
  if (!problemBySlug.has(slug)) throw new Error(`Unknown problem: ${slug}`);
  await connectDb();
  await ProblemProgress.updateOne(
    { slug },
    { $set: { notes }, $setOnInsert: { status: "attempted" } },
    { upsert: true },
  );
}

/** Tick or untick a subtopic. Unticking also recounts the day it was ticked on. */
export async function toggleSubtopic(id: string, today: DateStr) {
  const info = subtopicById.get(id);
  if (!info) throw new Error(`Unknown subtopic: ${id}`);
  await connectDb();
  const existing = await SubtopicProgress.findOne({ subtopicId: id }).lean();
  if (existing) {
    await SubtopicProgress.deleteOne({ subtopicId: id });
    if (existing.doneOn !== today) await recomputeDay(existing.doneOn);
  } else {
    await SubtopicProgress.create({ subtopicId: id, topicId: info.topicId, doneOn: today });
  }
  const result = await recomputeDay(today);
  return { ...result, done: !existing };
}

export async function saveSubtopicNotes(id: string, notes: string, confidence?: number): Promise<void> {
  const info = subtopicById.get(id);
  if (!info) throw new Error(`Unknown subtopic: ${id}`);
  await connectDb();
  const existing = await SubtopicProgress.exists({ subtopicId: id });
  if (!existing) throw new Error("Tick the subtopic before adding notes");
  await SubtopicProgress.updateOne({ subtopicId: id }, { $set: { notes, ...(confidence ? { confidence } : {}) } });
}
