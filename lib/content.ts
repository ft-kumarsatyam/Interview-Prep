/**
 * Typed access to the static content in data/*.json — the seed source and the
 * read-only fallback for pages that don't need progress data.
 */
import aptitudeBankJson from "@/data/aptitude-bank.json";
import problemsJson from "@/data/dsa-problems.json";
import testcasesJson from "@/data/dsa-testcases.json";
import practiceCasesJson from "@/data/os-dbms-cases.json";
import blogsJson from "@/data/engineering-blogs.json";
import notesCsJson from "@/data/notes/cs.json";
import notesHldAJson from "@/data/notes/hld-a.json";
import notesHldBJson from "@/data/notes/hld-b.json";
import notesHldCJson from "@/data/notes/hld-c.json";
import notesLldJson from "@/data/notes/lld.json";
import notesOsJson from "@/data/notes/os.json";
import notesOopJson from "@/data/notes/oop.json";
import newsJson from "@/data/news-sources.json";
import syllabusJson from "@/data/syllabus.json";
import systemDesignJson from "@/data/system-design.json";
import type { AptitudeBank } from "./domain/aptitude";
import type { DesignSectionId } from "./domain/design";
import type { NotesFile, SubtopicNote } from "./domain/notes";
import { normaliseHints, type ArgType, type CompareMode, type HintLevel, type ReturnKind, type TestCase } from "./domain/dsa-runner";
import type { PracticeKind } from "./domain/practice-cases";
import type { Language } from "./domain/starters";
import type { ProblemTrack } from "./domain/planner";

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface ContentProblem {
  slug: string;
  title: string;
  leetcodeId: number;
  difficulty: Difficulty;
  pattern: string;
  /** Sheet-view step, when it differs from `pattern` (e.g. re-slotted into "Basics & Complexity"). Falls back to `pattern` — see lib/domain/dsa-sheet.ts. */
  step?: string;
  track: ProblemTrack;
  tier: "core" | "extended";
  url: string;
  order: number;
}

export interface ContentTrack {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface ContentTopic {
  id: string;
  track: string;
  week: number;
  level: number;
  title: string;
  subtopics: string[];
  resources: string[];
}

export interface NewsFeed {
  id: string;
  name: string;
  category: string;
  url: string;
  kind?: "sitemap";
  match?: string;
}

export interface DesignStep {
  id: DesignSectionId;
  title: string;
  minutes: number;
  goal: string;
  checklist: string[];
}

export interface DesignBlock {
  id: string;
  name: string;
  summary: string;
  useWhen: string[];
  tradeoffs: string[];
  pitfall: string;
  keywords: string[];
}

/** Display order of the /design case groups, mirroring the table of contents of the Alex Xu books. */
export const DESIGN_CATEGORIES = ["Core & Scaling", "Social & Feed", "Media & Realtime", "Storage & Data", "Payments & Commerce", "Specialized / Vol 2"] as const;
export type DesignCategory = (typeof DESIGN_CATEGORIES)[number];

export interface DesignCase {
  slug: string;
  category: DesignCategory;
  title: string;
  topicId: string;
  practiceRef: string;
  level: "core" | "advanced";
  summary: string;
  keywords: string[];
  functional: string[];
  nonFunctional: string[];
  estimates: string[];
  api: string[];
  dataModel: string[];
  /** Mermaid flowchart source (trusted repo content). */
  diagram: string;
  deepDives: Array<{ title: string; body: string }>;
  tradeoffs: string[];
  probes: string[];
  blocks: string[];
  readings: Array<{ title: string; url: string }>;
}

/** An OS or DBMS "explain it" practice case — the /design/os and /design/dbms studios. */
export interface PracticeCase {
  kind: PracticeKind;
  slug: string;
  title: string;
  topicId: string;
  practiceRef: string;
  level: "core" | "advanced";
  summary: string;
  keywords: string[];
  /** The interview question(s), as an interviewer would ask them. */
  prompt: string[];
  /** What a strong answer covers. */
  talkingPoints: string[];
  /** Optional Mermaid flowchart source (trusted repo content). */
  diagram?: string;
  tradeoffs: string[];
  probes: string[];
  readings: Array<{ title: string; url: string }>;
}

export const systemDesign = {
  framework: systemDesignJson.framework as {
    steps: DesignStep[];
    latency: Array<{ label: string; value: string }>;
    numbers: Array<{ label: string; value: string }>;
    rubric: Array<{ id: string; label: string }>;
  },
  blocks: systemDesignJson.blocks as DesignBlock[],
  cases: systemDesignJson.cases as DesignCase[],
};
export const designCaseBySlug = new Map(systemDesign.cases.map((c) => [c.slug, c]));
export const designBlockById = new Map(systemDesign.blocks.map((b) => [b.id, b]));

export const practiceCases = (practiceCasesJson as { cases: PracticeCase[] }).cases;
export const practiceCaseBySlug = new Map(practiceCases.map((c) => [`${c.kind}:${c.slug}`, c]));

export type ProblemTestCase = TestCase;

/** One problem's runner content. Older (v1) entries had flat string hints and no edge tags; both still read fine. */
export interface ProblemTestcaseEntry {
  version?: 2;
  signature: { functionName: string; params: string[]; returnType: string };
  starter: string;
  /** Hand-written starters; otherwise TS/Python stubs are derived from the JSDoc (lib/domain/starters.ts). */
  starters?: Partial<Record<Language, string>>;
  argTypes?: ArgType[];
  returns?: ReturnKind;
  compare?: CompareMode;
  cases: ProblemTestCase[];
  hints: HintLevel[];
}

type RawTestcaseEntry = Omit<ProblemTestcaseEntry, "hints"> & { hints: Array<string | HintLevel> };

function loadTestcases(raw: Record<string, RawTestcaseEntry>): Map<string, ProblemTestcaseEntry> {
  return new Map(Object.entries(raw).map(([slug, e]) => [slug, { ...e, hints: normaliseHints(e.hints) }]));
}

export const problems = problemsJson as ContentProblem[];
export const testcaseBySlug = loadTestcases(testcasesJson as unknown as Record<string, RawTestcaseEntry>);
export const tracks = (syllabusJson.tracks as ContentTrack[]).toSorted((a, b) => a.order - b.order);
export const topics = syllabusJson.topics as ContentTopic[];

/** Hand-written aptitude questions (logical reasoning and verbal); quantitative drills are generated. */
export const aptitudeBank = aptitudeBankJson as unknown as AptitudeBank;

export const news = {
  feeds: newsJson.feeds as NewsFeed[],
  categories: newsJson.categories,
  browseOnly: newsJson.browseOnly,
  googleNews: newsJson.googleNews,
  maxItemsPerFeed: newsJson.maxItemsPerFeed,
};

/** Stable id for a subtopic: `${topicId}:${index}`. */
export const subtopicId = (topicId: string, index: number) => `${topicId}:${index}`;

/** Topics sorted by week then track order — the canonical study order. */
export function orderedTopics(): ContentTopic[] {
  const trackOrder = new Map(tracks.map((t) => [t.id, t.order]));
  return topics.toSorted((a, b) => a.week - b.week || (trackOrder.get(a.track) ?? 0) - (trackOrder.get(b.track) ?? 0));
}

export interface SubtopicInfo {
  id: string;
  topicId: string;
  topicTitle: string;
  track: string;
  title: string;
  week: number;
  /** Global study order (topic position, then index inside the topic). */
  position: number;
}

export const problemBySlug = new Map(problems.map((p) => [p.slug, p]));
export const topicById = new Map(topics.map((t) => [t.id, t]));
export const trackById = new Map(tracks.map((t) => [t.id, t]));

/** Every subtopic in study order. */
export const subtopics: SubtopicInfo[] = orderedTopics().flatMap((t, topicPos) =>
  t.subtopics.map((title, i) => ({
    id: subtopicId(t.id, i),
    topicId: t.id,
    topicTitle: t.title,
    track: t.track,
    title,
    week: t.week,
    position: topicPos * 1000 + i,
  })),
);
export const subtopicById = new Map(subtopics.map((s) => [s.id, s]));

/** Authored lessons by subtopic id (data/notes/*.json, validated in tests/content/notes.test.ts). */
export const noteFiles: NotesFile[] = [notesHldAJson, notesHldBJson, notesHldCJson, notesCsJson, notesOsJson, notesOopJson, notesLldJson] as NotesFile[];
export const subtopicNotes: ReadonlyMap<string, SubtopicNote> = new Map(noteFiles.flatMap((f) => Object.entries(f)));
export const mainProblemCount = problems.filter((p) => p.track === "main").length;

export interface EngineeringBlog {
  name: string;
  url: string;
  tags: string[];
}

/** Hand-picked engineering blogs for system design reading (data/engineering-blogs.json). */
export const engineeringBlogs = blogsJson.blogs as EngineeringBlog[];
