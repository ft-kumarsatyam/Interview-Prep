import { minutesLabel, type MailBacklog } from "./backlog-items";
import { escapeHtml } from "./html";
import { renderMail, type MailSection, type MailSpec, type MailStat } from "./mail-html";
import type { Pace } from "./pace";
import { isDayComplete, type DayProgress } from "./streak";

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

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

export interface DigestLink {
  title: string;
  /** App path such as `/dsa/two-sum`; made absolute with `appUrl` when there is one. */
  path: string;
  /** Short grey note after the title, e.g. "Medium" or "InfoQ · 6 min". */
  note?: string;
}

export interface DigestInput {
  date: string;
  day: DayProgress;
  streak: number;
  problems: DigestLink[];
  reviews: DigestLink[];
  theory: DigestLink[];
  reading: DigestLink[];
  pace: Pace | null;
  /** What yesterday left undone and how it carries into today, when anything did. */
  carryOver?: string | null;
  /** What is owed beyond today's targets, already turned into links. */
  backlog?: MailBacklog | null;
  appUrl?: string;
}

export { escapeHtml };

export function paceLine(p: Pace): string {
  if (p.delta > 0) return `You're ${plural(p.delta, "problem")} ahead of plan, so upcoming days are lighter.`;
  if (p.delta < 0) return `You're ${plural(-p.delta, "problem")} behind plan, spread over the days left.`;
  return "You're exactly on plan.";
}

/** Sections describing the backlog: today's queue first, then one section per kind. Shared by every mail that shows it. */
export function backlogSections(b: MailBacklog): MailSection[] {
  const out: MailSection[] = [];
  if (b.queue.length > 0) {
    out.push({
      heading: `Backlog queue for today (${b.queue.length} of ${b.budget})`,
      tone: "info",
      lines: [`${b.total} owed in all, about ${minutesLabel(b.totalMinutes)}. These are optional and never affect your streak.`],
      items: b.queue,
    });
  }
  for (const g of b.groups) {
    out.push({
      heading: `Backlog: ${g.label} (${g.total})`,
      tone: "warn",
      items: g.items,
      more: { count: Math.max(0, g.total - g.items.length), path: g.path, label: g.noun },
    });
  }
  return out;
}

/** The morning email: today's targets, the backlog, what to read, and pace. Null when the day is outside the plan. */
export function morningDigest(input: DigestInput): { title: string; text: string; html: string; spec: MailSpec } | null {
  const { day, date } = input;
  if (day.kind === "outside") return null;

  const sections: MailSection[] = [];
  let title: string;
  let kicker = "Morning plan";
  let intro: string;
  if (day.kind === "rest") {
    title = `Day off · ${date}`;
    kicker = "Day off";
    intro = "Rest day. Today's work has been spread over the coming days, so nothing is due and your streak is safe.";
  } else if (day.kind === "sunday") {
    title = `Sunday review · ${date}`;
    intro = "Take the weekly quiz on this week's material to keep your streak.";
    sections.push({ heading: "Review", items: [{ title: "Weekly review quiz", path: "/quiz" }, ...input.reviews] });
  } else {
    title = `Today's targets · ${date}`;
    intro = `${joinList([plural(day.dsaTarget, "DSA problem"), plural(day.theoryTarget, "theory subtopic")])}, then the daily quiz (needed for your streak).`;
    if (input.problems.length) sections.push({ heading: "DSA", items: input.problems });
    if (input.reviews.length) sections.push({ heading: "Spaced reviews", items: input.reviews });
    if (input.theory.length) sections.push({ heading: "Theory", items: input.theory });
    sections.push({ heading: "Quiz", items: [{ title: "Daily quiz", path: "/quiz" }] });
  }
  // The backlog is what makes today's list honest, so it comes right after it.
  const owed = input.backlog && input.backlog.total > 0 ? input.backlog : null;
  if (owed && day.kind !== "rest") {
    sections.push(...backlogSections(owed));
    title += ` · ${owed.total} in backlog`;
  }
  if (input.reading.length) sections.push({ heading: day.kind === "rest" ? "Optional reading" : "Today's reading", items: input.reading });

  const footer: string[] = [];
  if (input.pace && day.kind !== "rest") footer.push(paceLine(input.pace));
  if (input.streak > 0) footer.push(`Current streak: ${plural(input.streak, "day")}.`);

  const stats: MailStat[] = [];
  if (day.kind === "study" || day.kind === "revision") {
    stats.push({ label: "DSA today", value: String(day.dsaTarget) }, { label: "Theory today", value: String(day.theoryTarget) });
  }
  if (day.kind !== "rest") {
    if (input.streak > 0) stats.push({ label: "Streak", value: `${input.streak}d`, tone: "good" });
    if (owed) stats.push({ label: "Backlog", value: String(owed.total), tone: owed.total >= 15 ? "bad" : "warn" });
  }

  const { text, html, spec } = renderMail({
    title,
    kicker,
    intro,
    ...(input.carryOver ? { callouts: [{ tone: "warn" as const, text: input.carryOver }] } : {}),
    ...(stats.length ? { stats } : {}),
    sections,
    footer,
    ...(input.appUrl ? { appUrl: input.appUrl } : {}),
  });
  return { title, text, html, spec };
}
