/**
 * Shared types for the static catalogue. Keep this file import-only (no JSON) so
 * client components can take the types without pulling a content barrel.
 */
import type { AptitudeBank } from "@/modules/aptitude/domain/aptitude";
import type { Company, TierProfile } from "@/modules/targets/domain/companies";
import type { DesignSectionId } from "@/modules/design/domain/design";
import type { PracticeKind } from "@/modules/design/domain/practice-cases";
import type { ArgType, CompareMode, HintLevel, ReturnKind, TestCase } from "@/modules/dsa/domain/dsa-runner";
import type { Language } from "@/modules/dsa/domain/starters";
import type { ProblemTrack } from "@/modules/planner/domain/planner";

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface ContentProblem {
  slug: string;
  title: string;
  leetcodeId?: number;
  difficulty: Difficulty;
  pattern: string;
  step?: string;
  track: ProblemTrack;
  tier: "core" | "extended";
  url: string;
  order: number;
  catalog?: "extra";
}

export interface ContentSheetItem {
  slug: string;
  section: string;
  video?: string;
}

export interface ContentSheet {
  id: string;
  name: string;
  source: string;
  url: string;
  description: string;
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
  diagram: string;
  deepDives: Array<{ title: string; body: string }>;
  tradeoffs: string[];
  probes: string[];
  blocks: string[];
  readings: Array<{ title: string; url: string }>;
}

export interface PracticeCase {
  kind: PracticeKind;
  slug: string;
  title: string;
  topicId?: string;
  practiceRef: string;
  level: "core" | "advanced";
  summary: string;
  keywords: string[];
  prompt: string[];
  talkingPoints: string[];
  diagram?: string;
  tradeoffs: string[];
  probes: string[];
  readings: Array<{ title: string; url: string }>;
}

export type ProblemTestCase = TestCase;

export interface ProblemTestcaseEntry {
  version?: 2;
  signature: { functionName: string; params: string[]; returnType: string };
  starter: string;
  starters?: Partial<Record<Language, string>>;
  argTypes?: ArgType[];
  returns?: ReturnKind;
  compare?: CompareMode;
  cases: ProblemTestCase[];
  hints: HintLevel[];
}

export interface SubtopicInfo {
  id: string;
  topicId: string;
  topicTitle: string;
  track: string;
  title: string;
  week: number;
  position: number;
}

export interface EngineeringBlog {
  name: string;
  url: string;
  tags: string[];
}

export interface CareerDeepLink {
  id: string;
  name: string;
  tier: string;
  careersUrl: string;
  searchTemplate?: string;
  companyId?: string;
}

export type { AptitudeBank, Company, TierProfile, Language };
