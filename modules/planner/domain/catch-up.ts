/**
 * "Caught up": a closed day that left work undone turns green again once you have done that work later.
 * Pure and derived on read (like the backlog), so it never changes `DayLog.complete`, the streak or freeze
 * tokens: the original miss stays in history and only the calendar shows the day as caught up.
 *
 * Extra work you do beyond a later day's own target (its surplus) pays down the OLDEST open gap first.
 * The daily quiz can only be taken on its own day, so a missed quiz is paid by a catch-up practice quiz
 * instead (the caller passes the dates whose quiz was made up).
 */
import type { DateStr } from "@/core/domain/dates";
import type { DayGap } from "@/modules/progress/domain/recap";

export interface DayDebt {
  date: DateStr;
  gap: DayGap;
}

/** Work done beyond a day's own plan. */
export interface DaySurplus {
  date: DateStr;
  dsa: number;
  theory: number;
}

export interface CatchUp {
  date: DateStr;
  /** What the day left undone when it closed. */
  gap: DayGap;
  /** What is still owed after later surplus was applied. */
  remaining: DayGap;
  /** Which later days paid it, in the order they paid. */
  paidBy: Array<{ date: DateStr; dsa: number; theory: number }>;
  /** Nothing is owed any more: everything left over has been done. */
  caughtUp: boolean;
}

export function surplusOf(p: { dsaTarget: number; dsaSolved: number; theoryTarget: number; theoryDone: number }): { dsa: number; theory: number } {
  return { dsa: Math.max(0, p.dsaSolved - p.dsaTarget), theory: Math.max(0, p.theoryDone - p.theoryTarget) };
}

/**
 * Applies each surplus to the oldest earlier debt first. A surplus only pays debts from days before it, so
 * a day can never pay for itself or for the future. `quizMadeUp` holds the debt dates whose quiz was made up.
 */
export function allocateCatchUp(debts: readonly DayDebt[], surpluses: readonly DaySurplus[], quizMadeUp: ReadonlySet<DateStr> = new Set()): CatchUp[] {
  const open = [...debts]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d): CatchUp => ({ date: d.date, gap: { ...d.gap }, remaining: { ...d.gap, quiz: d.gap.quiz && !quizMadeUp.has(d.date) }, paidBy: [], caughtUp: false }));

  for (const s of [...surpluses].sort((a, b) => a.date.localeCompare(b.date))) {
    let dsa = s.dsa;
    let theory = s.theory;
    for (const d of open) {
      if (d.date >= s.date) break; // sorted: no later debt can be older
      if (dsa <= 0 && theory <= 0) break;
      const payDsa = Math.min(dsa, d.remaining.dsa);
      const payTheory = Math.min(theory, d.remaining.theory);
      if (payDsa <= 0 && payTheory <= 0) continue;
      d.remaining.dsa -= payDsa;
      d.remaining.theory -= payTheory;
      dsa -= payDsa;
      theory -= payTheory;
      d.paidBy.push({ date: s.date, dsa: payDsa, theory: payTheory });
    }
  }
  for (const d of open) d.caughtUp = d.remaining.dsa === 0 && d.remaining.theory === 0 && !d.remaining.quiz;
  return open;
}

/** Items still owed across all open (not caught up) days. */
export function openTotals(results: readonly CatchUp[]): { dsa: number; theory: number; quiz: number; items: number } {
  let dsa = 0;
  let theory = 0;
  let quiz = 0;
  for (const r of results) {
    if (r.caughtUp) continue;
    dsa += r.remaining.dsa;
    theory += r.remaining.theory;
    if (r.remaining.quiz) quiz++;
  }
  return { dsa, theory, quiz, items: dsa + theory + quiz };
}
