import { problemBySlug, type ContentProblem } from "@/lib/content";
import { connectDb } from "@/lib/db";
import type { DateStr } from "@/lib/domain/dates";
import { ProblemProgress } from "@/lib/models/progress";

export interface ProgressSummary {
  status: "solved" | "attempted";
  confidence: string | null;
  lastSolvedOn: string | null;
  source: "manual" | "leetcode";
  needsDetails: boolean;
}

/** Compact progress for every touched problem, keyed by slug. */
export async function getProgressMap(): Promise<Record<string, ProgressSummary>> {
  await connectDb();
  const rows = await ProblemProgress.find(
    {},
    { slug: 1, status: 1, confidence: 1, lastSolvedOn: 1, source: 1, needsDetails: 1 },
  ).lean();
  return Object.fromEntries(
    rows.map((r) => [
      r.slug,
      {
        status: r.status as ProgressSummary["status"],
        confidence: r.confidence ?? null,
        lastSolvedOn: r.lastSolvedOn ?? null,
        source: (r.source as ProgressSummary["source"]) ?? "manual",
        needsDetails: !!r.needsDetails,
      },
    ]),
  );
}

export interface ProblemDetail {
  problem: ContentProblem;
  progress: {
    status: string;
    confidence: string | null;
    timeTakenMin: number | null;
    approach: string;
    timeComplexity: string;
    spaceComplexity: string;
    notes: string;
    nextReviewAt: string | null;
    reviewCount: number;
    solveDates: string[];
    source: string;
    needsDetails: boolean;
    revealedCases: number[];
  } | null;
}

export async function getProblemDetail(slug: string): Promise<ProblemDetail | null> {
  const problem = problemBySlug.get(slug);
  if (!problem) return null;
  await connectDb();
  const p = await ProblemProgress.findOne({ slug }).lean();
  return {
    problem,
    progress: p
      ? {
          status: p.status,
          confidence: p.confidence ?? null,
          timeTakenMin: p.timeTakenMin ?? null,
          approach: p.approach ?? "",
          timeComplexity: p.timeComplexity ?? "",
          spaceComplexity: p.spaceComplexity ?? "",
          notes: p.notes ?? "",
          nextReviewAt: p.nextReviewAt ?? null,
          reviewCount: p.reviewCount ?? 0,
          solveDates: p.solveDates ?? [],
          source: p.source ?? "manual",
          needsDetails: !!p.needsDetails,
          revealedCases: p.revealedCases ?? [],
        }
      : null,
  };
}

export interface ReviewItem extends ContentProblem {
  nextReviewAt: string;
  confidence: string | null;
  reviewCount: number;
  solvedToday: boolean;
}

/** Everything due for a re-solve on or before `today`, most overdue first. */
export async function getReviewQueue(today: DateStr): Promise<ReviewItem[]> {
  await connectDb();
  const rows = await ProblemProgress.find({ nextReviewAt: { $ne: null, $lte: today } })
    .sort({ nextReviewAt: 1 })
    .lean();
  return rows.flatMap((r) => {
    const problem = problemBySlug.get(r.slug);
    if (!problem || !r.nextReviewAt) return [];
    return [
      {
        ...problem,
        nextReviewAt: r.nextReviewAt,
        confidence: r.confidence ?? null,
        reviewCount: r.reviewCount ?? 0,
        solvedToday: !!r.solveDates?.includes(today),
      },
    ];
  });
}

export async function countDueReviews(today: DateStr): Promise<number> {
  await connectDb();
  return ProblemProgress.countDocuments({ nextReviewAt: { $ne: null, $lte: today } });
}
