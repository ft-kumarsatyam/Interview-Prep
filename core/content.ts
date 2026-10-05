/**
 * Typed access to the static content in data/*.json — the seed source and the
 * read-only fallback for pages that don't need progress data.
 */
import aptitudeBankJson from "@/data/aptitude-bank.json";
import problemsJson from "@/data/dsa-problems.json";
import sheetsJson from "@/data/dsa-sheets.json";
import testcasesJson from "@/data/dsa-testcases.json";
import practiceCasesJson from "@/data/os-dbms-cases.json";
import blogsJson from "@/data/engineering-blogs.json";
import careersJson from "@/data/careers.json";
import companiesJson from "@/data/companies.json";
import notesCsJson from "@/data/notes/cs.json";
import notesHldAJson from "@/data/notes/hld-a.json";
import notesHldBJson from "@/data/notes/hld-b.json";
import notesHldCJson from "@/data/notes/hld-c.json";
import notesLldJson from "@/data/notes/lld.json";
import notesJsJson from "@/data/notes/js.json";
import notesNodeJson from "@/data/notes/node.json";
import notesDsaJson from "@/data/notes/dsa.json";
import notesDbmsJson from "@/data/notes/dbms.json";
import notesAiJson from "@/data/notes/ai.json";
import notesBehavioralJson from "@/data/notes/behavioral.json";
import notesOsJson from "@/data/notes/os.json";
import notesOopJson from "@/data/notes/oop.json";
import newsJson from "@/data/news-sources.json";
import webdevJson from "@/data/webdev.json";
import webFeCore from "@/data/webdev/fe-core.json";
import webFeScale from "@/data/webdev/fe-scale.json";
import webFeSd from "@/data/webdev/fe-sd.json";
import webLlm from "@/data/webdev/llm.json";
import webRag from "@/data/webdev/rag.json";
import webGenaiEng from "@/data/webdev/genai-eng.json";
import webHtmlCss from "@/data/webdev/html-css.json";
import webTypescript from "@/data/webdev/typescript.json";
import webA11y from "@/data/webdev/a11y.json";
import webFeTesting from "@/data/webdev/fe-testing.json";
import webStateData from "@/data/webdev/state-data.json";
import webHttpApis from "@/data/webdev/http-apis.json";
import webAuthSecurity from "@/data/webdev/auth-security.json";
import webCachingQueues from "@/data/webdev/caching-queues.json";
import webCloudDevops from "@/data/webdev/cloud-devops.json";
import webObservability from "@/data/webdev/observability.json";
import webSdCases from "@/data/webdev/sd-cases.json";
import webMlFoundations from "@/data/webdev/ml-foundations.json";
import webLlmEvalsOps from "@/data/webdev/llm-evals-ops.json";
import webAgents from "@/data/webdev/agents.json";
import webReactMore from "@/data/webdev/react-more.json";
import webNextjsMore from "@/data/webdev/nextjs-more.json";
import webNodeMore from "@/data/webdev/node-more.json";
import webSqlMore from "@/data/webdev/sql-more.json";
import webMongoMore from "@/data/webdev/mongo-more.json";
import webDistdbMore from "@/data/webdev/distdb-more.json";
import webArchMore from "@/data/webdev/arch-more.json";
import webLlmMore from "@/data/webdev/llm-more.json";
import webRagMore from "@/data/webdev/rag-more.json";
import webGenaiEngMore from "@/data/webdev/genai-eng-more.json";
import wiA11y from "@/data/web-interview/a11y.json";
import wiFeTesting from "@/data/web-interview/fe-testing.json";
import wiStateData from "@/data/web-interview/state-data.json";
import wiHttpApis from "@/data/web-interview/http-apis.json";
import wiAuthSecurity from "@/data/web-interview/auth-security.json";
import wiCachingQueues from "@/data/web-interview/caching-queues.json";
import wiCloudDevops from "@/data/web-interview/cloud-devops.json";
import wiObservability from "@/data/web-interview/observability.json";
import wiSdCases from "@/data/web-interview/sd-cases.json";
import wiMlFoundations from "@/data/web-interview/ml-foundations.json";
import wiLlmEvalsOps from "@/data/web-interview/llm-evals-ops.json";
import wiAgents from "@/data/web-interview/agents.json";
import wiHtmlCss from "@/data/web-interview/html-css.json";
import wiBrowserJs from "@/data/web-interview/browser-js.json";
import wiTypescript from "@/data/web-interview/typescript.json";
import wiReact from "@/data/web-interview/react.json";
import wiNext from "@/data/web-interview/nextjs.json";
import wiNode from "@/data/web-interview/node.json";
import wiHttp from "@/data/web-interview/http.json";
import wiSecurity from "@/data/web-interview/security.json";
import wiPerf from "@/data/web-interview/perf.json";
import wiQuality from "@/data/web-interview/quality.json";
import wiSql from "@/data/web-interview/sql.json";
import wiMongo from "@/data/web-interview/mongo.json";
import wiDistdb from "@/data/web-interview/distdb.json";
import wiArch from "@/data/web-interview/arch.json";
import wiFeCore from "@/data/web-interview/fe-core.json";
import wiFeScale from "@/data/web-interview/fe-scale.json";
import wiFeSd from "@/data/web-interview/fe-sd.json";
import wiLlm from "@/data/web-interview/llm.json";
import wiRag from "@/data/web-interview/rag.json";
import wiGenaiEng from "@/data/web-interview/genai-eng.json";
import syllabusJson from "@/data/syllabus.json";
import systemDesignJson from "@/data/system-design.json";
import type { AptitudeBank } from "@/modules/aptitude/domain/aptitude";
import type { Company, TierProfile } from "@/modules/targets/domain/companies";
import type { DesignSectionId } from "@/modules/design/domain/design";
import type { NotesFile, SubtopicNote } from "@/modules/learn/domain/notes";
import type { WebLesson, WebProject, WebTrack } from "@/modules/learn/domain/webdev";
import type { InterviewFile, TrackedQuestion } from "@/modules/learn/domain/web-interview";
import { normaliseHints, type ArgType, type CompareMode, type HintLevel, type ReturnKind, type TestCase } from "@/modules/dsa/domain/dsa-runner";
import type { PracticeKind } from "@/modules/design/domain/practice-cases";
import type { Language } from "@/modules/dsa/domain/starters";
import type { ProblemTrack } from "@/modules/planner/domain/planner";

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

export interface ContentSheetItem {
  slug: string;
  /** Group heading inside the sheet (a topic, or a Striver day-block). */
  section: string;
  /** YouTube walkthrough, when the sheet's author has one. */
  video?: string;
}

/** A curated problem list (Blind 75, NeetCode 150, Striver SDE ...). Every item points at a problem in dsa-problems.json. */
export interface ContentSheet {
  id: string;
  name: string;
  source: string;
  url: string;
  description: string;
  /** Items left out of the original list because they are premium-only or hosted off LeetCode. */
  omitted: number;
  items: ContentSheetItem[];
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
export const dsaSheets = sheetsJson.sheets as ContentSheet[];
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
export const noteFiles: NotesFile[] = [notesHldAJson, notesHldBJson, notesHldCJson, notesCsJson, notesOsJson, notesOopJson, notesLldJson, notesJsJson, notesNodeJson, notesDsaJson, notesDbmsJson, notesAiJson, notesBehavioralJson] as NotesFile[];
export const subtopicNotes: ReadonlyMap<string, SubtopicNote> = new Map(noteFiles.flatMap((f) => Object.entries(f)));
export const mainProblemCount = problems.filter((p) => p.track === "main").length;

export interface EngineeringBlog {
  name: string;
  url: string;
  tags: string[];
}

/** Hand-picked engineering blogs for system design reading (data/engineering-blogs.json). */
export const engineeringBlogs = blogsJson.blogs as EngineeringBlog[];

/** Interview prep profiles by company tier, and the curated company list (data/companies.json). */
export const tierProfiles = companiesJson.tiers as unknown as TierProfile[];
export const tierById = new Map(tierProfiles.map((t) => [t.id, t]));
export const companyCatalog = companiesJson.companies as Company[];
export const companyById = new Map(companyCatalog.map((c) => [c.id, c]));

/** Web, frontend and AI lessons and guided projects (data/webdev.json plus one file per newer track in data/webdev/). Not part of the syllabus, so the plan never schedules them. */
type WebdevFile = { tracks: WebTrack[]; lessons: WebLesson[]; projects: WebProject[] };
const webdevFiles = [
  webdevJson, webFeCore, webFeScale, webFeSd, webLlm, webRag, webGenaiEng,
  webHtmlCss, webTypescript, webA11y, webFeTesting, webStateData, webHttpApis, webAuthSecurity, webCachingQueues,
  webCloudDevops, webObservability, webSdCases, webMlFoundations, webLlmEvalsOps, webAgents,
  webReactMore, webNextjsMore, webNodeMore, webSqlMore, webMongoMore, webDistdbMore, webArchMore, webLlmMore, webRagMore, webGenaiEngMore,
] as unknown as WebdevFile[];
/** Study order of the tracks: frontend from the browser up, then backend and data, architecture, and AI. */
const WEB_TRACK_ORDER = [
  "fe-core", "html-css", "typescript", "a11y", "react", "nextjs", "state-data", "fe-testing", "fe-scale", "fe-sd",
  "http-apis", "node", "sql", "mongo", "auth-security", "caching-queues", "distdb",
  "arch", "sd-cases", "cloud-devops", "observability",
  "ml-foundations", "llm", "rag", "genai-eng", "agents", "llm-evals-ops",
];
const trackRank = (id: string) => (WEB_TRACK_ORDER.indexOf(id) + 1 || WEB_TRACK_ORDER.length + 1);
export const webTracks = webdevFiles.flatMap((f) => f.tracks).toSorted((a, b) => trackRank(a.id) - trackRank(b.id));
export const webLessons = webdevFiles.flatMap((f) => f.lessons).toSorted((a, b) => trackRank(a.track) - trackRank(b.track));
export const webLessonById = new Map(webLessons.map((l) => [l.id, l]));
export const webProjects = webdevFiles.flatMap((f) => f.projects);
export const webProjectBySlug = new Map(webProjects.map((p) => [p.slug, p]));

/** Interview questions with model answers, one file per track (data/web-interview/*.json), in study order. */
export const interviewFiles = [
  wiHtmlCss, wiBrowserJs, wiFeCore, wiTypescript, wiA11y, wiReact, wiNext, wiStateData, wiPerf, wiFeTesting, wiFeScale, wiFeSd,
  wiHttp, wiHttpApis, wiNode, wiSql, wiMongo, wiAuthSecurity, wiSecurity, wiCachingQueues, wiDistdb, wiQuality,
  wiArch, wiSdCases, wiCloudDevops, wiObservability,
  wiMlFoundations, wiLlm, wiRag, wiGenaiEng, wiAgents, wiLlmEvalsOps,
] as InterviewFile[];
export const interviewTracks = interviewFiles.map((f) => f.track);
export const interviewQuestions: TrackedQuestion[] = interviewFiles.flatMap((f) => f.questions.map((q) => ({ ...q, track: f.track.id })));
export const interviewQuestionById = new Map(interviewQuestions.map((q) => [q.id, q]));

export interface CareerDeepLink {
  id: string;
  name: string;
  tier: string;
  careersUrl: string;
  /** `{q}` and `{l}` are replaced with your role and location. Absent when the site has no useful search URL. */
  searchTemplate?: string;
  companyId?: string;
}

/** Companies whose public job-board API PrepOS reads, and those it can only link to (data/careers.json). */
export const careerSources = careersJson.sources as unknown as import("@/modules/jobs/domain/job-postings").CareerSource[];
export const careerDeepLinks = careersJson.deepLinks as CareerDeepLink[];
