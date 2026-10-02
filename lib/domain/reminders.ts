import { isDayComplete, type DayProgress } from "./streak";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** What's still needed to complete the day, in the order it's best done. Empty when nothing is due. */
export function remainingWork(p: DayProgress): string[] {
  if (p.kind === "rest" || p.kind === "outside" || isDayComplete(p)) return [];
  if (p.kind === "sunday") return ["the weekly review quiz"];
  const left: string[] = [];
  const dsa = p.dsaTarget - p.dsaSolved;
  const theory = p.theoryTarget - p.theoryDone;
  if (dsa > 0) left.push(plural(dsa, "DSA problem"));
  if (theory > 0) left.push(plural(theory, "theory subtopic"));
  if (!p.quizPassed) left.push("the daily quiz");
  return left;
}

export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

export function eveningReminder(p: DayProgress, streak: number): { title: string; body: string } | null {
  const left = remainingWork(p);
  if (left.length === 0) return null;
  const stake = streak > 0 ? `Your ${streak}-day streak is on the line.` : "Finish today to start a streak.";
  return { title: "Today isn't done yet", body: `Left: ${joinList(left)}. ${stake}` };
}

export function morningPlanMessage(p: DayProgress, theoryTitles: readonly string[]): { title: string; body: string } | null {
  if (p.kind === "rest" || p.kind === "outside") return null;
  if (p.kind === "sunday") return { title: "Sunday review", body: "Take the weekly quiz on this week's material to keep your streak." };
  const parts = [plural(p.dsaTarget, "DSA problem"), plural(p.theoryTarget, "theory subtopic")];
  const theory = theoryTitles.length ? ` Theory: ${theoryTitles.slice(0, 3).join(" · ")}.` : "";
  return { title: "Today's plan is ready", body: `${joinList(parts)}, then the daily quiz.${theory}` };
}
