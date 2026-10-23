/** Plain shapes the pages render. The answer key only appears in `ResultView`, which exists only after submit. */
import type { CoverageStat } from "@/modules/genai-test/domain/coverage";
import type { CriterionScore } from "@/modules/genai-test/domain/scoring";
import type { TestKind } from "@/modules/genai-test/domain/schemas";
import type { Verdict } from "@/modules/genai-test/domain/scoring";

export interface PublicItem {
  id: string;
  kind: "mcq" | "written";
  q: string;
  options?: string[];
  level: number;
  ahead: boolean;
  review: boolean;
}

export interface TakeView {
  id: string;
  slug: string;
  kind: TestKind;
  weekId: string;
  level: number | null;
  items: PublicItem[];
  /** Saved drafts: option index for an MCQ, text for a written answer. */
  answers: Record<string, number | string>;
  passMark: number;
  coverage: CoverageStat;
}

export interface ResultItem {
  id: string;
  kind: "mcq" | "written";
  q: string;
  level: number;
  review: boolean;
  options?: string[];
  chosen?: number | null;
  correct?: number;
  why?: string;
  text?: string;
  points?: string[];
  reference?: string;
  scores?: CriterionScore[];
  gradedBy?: "ai" | "self";
  summary?: string;
  /** 0-100, null while a written answer waits for a grade. */
  pct: number | null;
}

export interface ResultView {
  id: string;
  slug: string;
  kind: TestKind;
  weekId: string;
  level: number | null;
  submittedOn: string | null;
  items: ResultItem[];
  mcqCorrect: number;
  mcqTotal: number;
  mcqPct: number | null;
  writtenPct: number | null;
  pendingWritten: number;
  pct: number | null;
  passMark: number;
  passed: boolean;
  verdict: Verdict | null;
  coverage: CoverageStat;
  byLevel: { level: number; pct: number }[];
}

export interface AttemptSummary {
  id: string;
  slug: string;
  kind: TestKind;
  weekId: string;
  level: number | null;
  status: "in_progress" | "submitted";
  pct: number | null;
  passed: boolean;
  startedOn: string;
  pending: boolean;
}

export interface LevelRow {
  level: number;
  coverage: CoverageStat;
  mastery: number | null;
}

export interface HomeView {
  weekId: string;
  weekIdx: number;
  weekTitle: string;
  weekFocus: string;
  passMark: number;
  expected: CoverageStat;
  overall: CoverageStat;
  levels: LevelRow[];
  levelReached: number;
  attempts: AttemptSummary[];
  /** Best finished weekly score per week, for the trend. */
  trend: { weekId: string; pct: number }[];
  suggestedReadiness: Record<string, number>;
  weakest: LevelRow[];
}
