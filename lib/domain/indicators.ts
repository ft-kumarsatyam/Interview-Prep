export interface IndicatorInput {
  /** Last 14 days up to yesterday: work items planned and done (problems + subtopics + quizzes). */
  taskPlanned: number;
  taskDone: number;
  subtopicsDone: number;
  subtopicsTotal: number;
  /** Topics whose topic quiz you passed: "assessed" skills. */
  topicsMastered: number;
  topicsTotal: number;
  /** Mean best score of your last quizzes, and how many that is. */
  quizAvgPct: number | null;
  quizCount: number;
  /** Minutes logged in the last 7 days against the hours you set for the same days. */
  minutesLogged7: number;
  minutesTarget7: number;
  /** Days out of the last 14 with any solve, subtopic or logged study time. */
  activeDays14: number;
  reviewsDue: number;
}

export type Tone = "good" | "ok" | "low" | "neutral";

export interface Indicator {
  id: "completion" | "coverage" | "assessment" | "study-time" | "consistency" | "revision" | "skills";
  label: string;
  value: string;
  detail: string;
  tone: Tone;
  /** 0–1 for the bar; null for count-only measures. */
  frac: number | null;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const tone = (frac: number, good = 0.8, ok = 0.5): Tone => (frac >= good ? "good" : frac >= ok ? "ok" : "low");
const hours = (min: number) => `${Math.round((min / 60) * 10) / 10} h`;

/**
 * Seven separate measures, deliberately not blended into one "readiness" score:
 * a streak or a solve count alone doesn't say you're ready for an interview.
 */
export function buildIndicators(i: IndicatorInput): Indicator[] {
  const completion = i.taskPlanned > 0 ? i.taskDone / i.taskPlanned : null;
  const coverage = i.subtopicsTotal > 0 ? i.subtopicsDone / i.subtopicsTotal : 0;
  const skills = i.topicsTotal > 0 ? i.topicsMastered / i.topicsTotal : 0;
  const study = i.minutesTarget7 > 0 ? i.minutesLogged7 / i.minutesTarget7 : null;
  const consistency = i.activeDays14 / 14;
  return [
    {
      id: "completion",
      label: "Task completion",
      value: completion === null ? "–" : pct(completion),
      detail: completion === null ? "No planned work in the last 14 days yet." : `${i.taskDone} of ${i.taskPlanned} planned items done in the last 14 days.`,
      tone: completion === null ? "neutral" : tone(completion),
      frac: completion,
    },
    {
      id: "coverage",
      label: "Topic coverage",
      value: pct(coverage),
      detail: `${i.subtopicsDone} of ${i.subtopicsTotal} syllabus subtopics ticked.`,
      tone: "neutral",
      frac: coverage,
    },
    {
      id: "assessment",
      label: "Assessment performance",
      value: i.quizAvgPct === null ? "–" : `${Math.round(i.quizAvgPct)}%`,
      detail: i.quizAvgPct === null ? "No quizzes taken yet." : `Average best score over your last ${i.quizCount} quiz${i.quizCount === 1 ? "" : "zes"}.`,
      tone: i.quizAvgPct === null ? "neutral" : tone(i.quizAvgPct / 100, 0.8, 0.6),
      frac: i.quizAvgPct === null ? null : i.quizAvgPct / 100,
    },
    {
      id: "study-time",
      label: "Study time (7 days)",
      value: hours(i.minutesLogged7),
      detail: study === null ? "Log sessions with the timer to measure this." : `${hours(i.minutesLogged7)} logged of ${hours(i.minutesTarget7)} planned (${pct(study)}).`,
      tone: study === null ? "neutral" : tone(study, 0.8, 0.5),
      frac: study === null ? null : Math.min(study, 1),
    },
    {
      id: "consistency",
      label: "Consistency",
      value: `${i.activeDays14}/14 days`,
      detail: "Days in the last two weeks with any solve, subtopic or logged study time.",
      tone: tone(consistency, 0.8, 0.5),
      frac: consistency,
    },
    {
      id: "revision",
      label: "Revision due",
      value: String(i.reviewsDue),
      detail: i.reviewsDue === 0 ? "No spaced reviews waiting." : `${i.reviewsDue} problem${i.reviewsDue === 1 ? "" : "s"} due for review today or earlier.`,
      tone: i.reviewsDue === 0 ? "good" : i.reviewsDue <= 5 ? "ok" : "low",
      frac: null,
    },
    {
      id: "skills",
      label: "Skills assessed",
      value: `${i.topicsMastered}/${i.topicsTotal}`,
      detail: `${i.topicsTotal - i.topicsMastered} topics have no passed topic quiz yet, so they are not assessed.`,
      tone: "neutral",
      frac: skills,
    },
  ];
}
