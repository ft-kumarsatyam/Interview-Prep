/** Pure view-model rules for the dashboard's "Today" area. No I/O, no React. */

export type DayKind = "study" | "revision" | "sunday" | "rest" | "outside";

/** The slice of today's day state the dashboard needs. */
export interface DayView {
  kind: DayKind;
  complete: boolean;
  dsaSolved: number;
  dsaTarget: number;
  theoryDone: number;
  theoryTarget: number;
  quizPassed: boolean;
  quizUnlocked: boolean;
  readings: number;
}

export type RequirementIcon = "dsa" | "theory" | "quiz" | "quiz-locked" | "read";

export interface Requirement {
  label: string;
  value: string;
  done: boolean;
  href: string;
  icon: RequirementIcon;
  /** 0-1, drives the mini progress bar; omitted for pass/fail rows. */
  frac?: number;
  hint?: string;
  /** Call to action when this is the next thing to do. */
  cta: string;
}

export const isWorkday = (kind: DayKind): boolean => kind === "study" || kind === "revision";

/** Local hour (0-23) in `timeZone`. */
export function localHour(timeZone: string, now: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(now));
}

export const greetingFor = (hour: number): string => (hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");

/** An unfinished work day after 20:00 puts the streak at risk. */
export const isStreakAtRisk = (day: Pick<DayView, "kind" | "complete">, hour: number): boolean => !day.complete && isWorkday(day.kind) && hour >= 20;

export function buildRequirements(day: DayView, readingsPerDay: number): Requirement[] {
  if (isWorkday(day.kind)) {
    const quizOpen = day.quizUnlocked || day.quizPassed;
    return [
      {
        label: "DSA",
        value: `${day.dsaSolved}/${day.dsaTarget}`,
        done: day.dsaSolved >= day.dsaTarget,
        frac: day.dsaTarget ? day.dsaSolved / day.dsaTarget : 1,
        href: "#problems",
        icon: "dsa",
        cta: "Solve the next problem",
      },
      {
        label: "Theory",
        value: `${day.theoryDone}/${day.theoryTarget}`,
        done: day.theoryDone >= day.theoryTarget,
        frac: day.theoryTarget ? day.theoryDone / day.theoryTarget : 1,
        href: "#theory",
        icon: "theory",
        cta: "Study today's theory",
      },
      {
        label: "Daily quiz",
        value: day.quizPassed ? "passed" : day.quizUnlocked ? "ready" : "locked",
        done: day.quizPassed,
        href: "/quiz",
        icon: quizOpen ? "quiz" : "quiz-locked",
        hint: !quizOpen ? "Unlocks after 1 problem + 1 subtopic" : undefined,
        cta: "Take the daily quiz",
      },
      {
        label: "Read (bonus)",
        value: `${day.readings}/${readingsPerDay}`,
        done: day.readings >= readingsPerDay,
        frac: day.readings / readingsPerDay,
        href: "/news",
        icon: "read",
        cta: "Read an article",
      },
    ];
  }
  if (day.kind === "sunday") {
    return [{ label: "Weekly quiz", value: day.quizPassed ? "passed" : "open", done: day.quizPassed, href: "/quiz", icon: "quiz", cta: "Take the weekly quiz" }];
  }
  return [];
}

/** The first undone requirement. The quiz only becomes "next" once it can actually be taken. */
export function nextRequirement(requirements: Requirement[], day: Pick<DayView, "kind" | "quizUnlocked">): Requirement | undefined {
  return requirements.find((r) => !r.done && !(r.href === "/quiz" && isWorkday(day.kind) && !day.quizUnlocked));
}

export function dayCopy(kind: DayKind, hasBonus: boolean): string {
  switch (kind) {
    case "outside":
      return "Outside the plan window. Warm up with anything below.";
    case "rest":
      return "Rest day: counts as complete. Recharge.";
    case "sunday":
      return hasBonus ? "Sunday: reviews + the weekly quiz. Spare hours are below as optional extras." : "Sunday: reviews + the weekly quiz.";
    case "revision":
      return "Revision phase: timed problems and reviews.";
    default:
      return "Hit every target and pass the quiz to keep the streak.";
  }
}
