"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/app/(app)/dashboard/actions";
import { requireSession } from "@/lib/auth/dal";
import type { PublicQuestion } from "@/lib/quiz/question";
import { startDiagnostic, submitDiagnostic, type DiagnosticResult } from "@/lib/services/diagnostic";
import { completeIntake, getFeasibility, saveIntakeStep } from "@/lib/services/planner-intake";
import { applyProposal, dismissProposal } from "@/lib/services/rebalance";

const fail = (err: unknown, fallback: string): { ok: false; error: string } => ({ ok: false, error: err instanceof Error ? err.message : fallback });

/** A zod failure reads as its first message; anything else as itself. */
function message(err: unknown, fallback: string): { ok: false; error: string } {
  const issues = (err as { issues?: Array<{ message: string }> } | null)?.issues;
  return issues?.[0] ? { ok: false, error: issues[0].message } : fail(err, fallback);
}

export async function saveIntakeStepAction(input: unknown): Promise<ActionResult> {
  await requireSession();
  try {
    await saveIntakeStep(input);
    return { ok: true };
  } catch (err) {
    return message(err, "Could not save this step");
  }
}

export interface FeasibilityDto {
  requiredMin: number;
  availableMin: number;
  coverage: number;
  mustCoverage: number;
  gapMin: number;
  status: "on-track" | "tight" | "at-risk";
  studyDays: number;
  remedies: Array<{ kind: "drop-nice"; minutes: number; subtopics: number; resolves: boolean } | { kind: "add-hours"; hoursPerWeek: number } | { kind: "extend-date"; weeks: number }>;
  endDate: string;
}

export async function feasibilityAction(draft: boolean): Promise<ActionResult<{ feasibility: FeasibilityDto }>> {
  await requireSession();
  try {
    const f = await getFeasibility(new Date(), { draft });
    const { requiredMin, availableMin, coverage, mustCoverage, gapMin, status, studyDays, remedies, endDate } = f;
    return { ok: true, feasibility: { requiredMin, availableMin, coverage, mustCoverage, gapMin, status, studyDays, remedies, endDate } };
  } catch (err) {
    return fail(err, "Could not check the plan");
  }
}

export async function startDiagnosticAction(): Promise<ActionResult<{ topics: Array<{ topicId: string; title: string; questions: PublicQuestion[] }> }>> {
  await requireSession();
  try {
    return { ok: true, topics: await startDiagnostic() };
  } catch (err) {
    return fail(err, "Could not build the check");
  }
}

export async function submitDiagnosticAction(answers: unknown): Promise<ActionResult<{ results: DiagnosticResult[] }>> {
  await requireSession();
  try {
    const results = await submitDiagnostic(answers);
    refresh();
    return { ok: true, results };
  } catch (err) {
    return message(err, "Could not grade the check");
  }
}

export async function completeIntakeAction(): Promise<ActionResult> {
  await requireSession();
  try {
    await completeIntake();
    refresh();
    return { ok: true };
  } catch (err) {
    return message(err, "Could not finish the setup");
  }
}

export async function resolveProposalAction(decision: "apply" | "dismiss"): Promise<ActionResult> {
  await requireSession();
  try {
    await (decision === "apply" ? applyProposal() : dismissProposal());
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err, "Could not update the suggestion");
  }
}
