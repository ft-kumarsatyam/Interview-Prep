import type { Pace } from "./pace";
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
  appUrl?: string;
}

interface Section {
  heading: string;
  items: DigestLink[];
  lines?: string[];
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function paceLine(p: Pace): string {
  if (p.delta > 0) return `You're ${plural(p.delta, "problem")} ahead of plan, so upcoming days are lighter.`;
  if (p.delta < 0) return `You're ${plural(-p.delta, "problem")} behind plan, spread over the days left.`;
  return "You're exactly on plan.";
}

/** The morning email: today's targets, what to read, and pace. Null when the day is outside the plan. */
export function morningDigest(input: DigestInput): { title: string; text: string; html: string } | null {
  const { day, date } = input;
  if (day.kind === "outside") return null;
  const base = input.appUrl?.replace(/\/+$/, "");
  const href = (path: string) => (base ? `${base}${path}` : null);

  const sections: Section[] = [];
  let title: string;
  let intro: string;
  if (day.kind === "rest") {
    title = `Day off · ${date}`;
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
  if (input.reading.length) sections.push({ heading: day.kind === "rest" ? "Optional reading" : "Today's reading", items: input.reading });

  const footer: string[] = [];
  if (input.pace && day.kind !== "rest") footer.push(paceLine(input.pace));
  if (input.streak > 0) footer.push(`Current streak: ${plural(input.streak, "day")}.`);

  const textItem = (l: DigestLink) => {
    const url = href(l.path);
    return `- ${l.title}${l.note ? ` (${l.note})` : ""}${url ? `\n  ${url}` : ""}`;
  };
  const text = [
    intro,
    ...sections.map((s) => `\n${s.heading}\n${s.items.map(textItem).join("\n")}`),
    ...(footer.length ? ["", ...footer] : []),
    ...(base ? ["", `Open PrepOS: ${base}/dashboard`] : []),
  ].join("\n");

  const htmlItem = (l: DigestLink) => {
    const url = href(l.path);
    const label = url ? `<a href="${escapeHtml(url)}" style="color:#2563eb;text-decoration:none">${escapeHtml(l.title)}</a>` : escapeHtml(l.title);
    const note = l.note ? ` <span style="color:#6b7280">· ${escapeHtml(l.note)}</span>` : "";
    return `<li style="margin:4px 0">${label}${note}</li>`;
  };
  const html = [
    `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;color:#111827;line-height:1.5">`,
    `<h2 style="margin:0 0 8px">${escapeHtml(title)}</h2>`,
    `<p style="margin:0 0 16px">${escapeHtml(intro)}</p>`,
    ...sections.map(
      (s) => `<h3 style="margin:16px 0 4px;font-size:15px">${escapeHtml(s.heading)}</h3><ul style="margin:0;padding-left:20px">${s.items.map(htmlItem).join("")}</ul>`,
    ),
    ...footer.map((f) => `<p style="margin:16px 0 0;color:#374151">${escapeHtml(f)}</p>`),
    ...(base ? [`<p style="margin:20px 0 0"><a href="${escapeHtml(`${base}/dashboard`)}" style="color:#2563eb">Open PrepOS</a></p>`] : []),
    `</div>`,
  ].join("");

  return { title, text, html };
}
