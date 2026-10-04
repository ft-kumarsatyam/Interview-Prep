"use client";

import { casesConfirmedBy, toRunnable, validateCustomProblem, type CustomProblemDraft } from "@/modules/dsa/domain/custom-problem";
import { runCasesIn } from "@/core/sandbox/languages";

export type VerifyResult = { ok: true; problem: CustomProblemDraft; dropped: number } | { ok: false; error: string };

/**
 * Run the reference solution (when there is one) against every case in the browser sandbox and keep only
 * the cases it agrees with. AI-written expected values are sometimes wrong; this catches them before saving.
 */
export async function verifyDraft(draft: unknown): Promise<VerifyResult> {
  const v = validateCustomProblem(draft);
  if (!v.ok) return v;
  const p = v.problem;
  if (!p.solution?.trim()) return { ok: true, problem: p, dropped: 0 };
  const r = toRunnable(p);
  const res = await runCasesIn("javascript", p.solution, p.functionName, r.cases, { argTypes: r.argTypes, returns: r.returns, compare: r.compare });
  if (res.crashed) return { ok: false, error: `The reference solution doesn't run: ${res.crashed.split("\n")[0]}` };
  if (res.timedOut) return { ok: false, error: "The reference solution timed out" };
  const kept = casesConfirmedBy(p.cases, res.cases);
  const again = validateCustomProblem({ ...p, cases: kept });
  if (!again.ok) return { ok: false, error: `Only ${kept.length} of ${p.cases.length} cases matched the reference solution. Try again.` };
  return { ok: true, problem: again.problem, dropped: p.cases.length - kept.length };
}
