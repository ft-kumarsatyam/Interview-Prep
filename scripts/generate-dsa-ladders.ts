/**
 * Writes data/dsa-ladders.json from the ladder definitions in scripts/dsa-ladders/*.ts. Every row must open a
 * problem PrepOS has (seeded or extra) with a judge, so run generate-dsa-extras.ts and generate-dsa-testcases.ts first.
 *
 *   node --import tsx scripts/generate-dsa-ladders.ts
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { problemBySlug, testcaseBySlug } from "@/core/content";
import { externalCatalogueSchema, type CompanyTag, type ExternalLink, type ExternalQuestion, type ExternalSheet } from "@/modules/dsa/domain/external-catalogue";
import { ARRAY_LADDER } from "./dsa-ladders/arrays";
import { BINARY_SEARCH_LADDER } from "./dsa-ladders/binary-search";
import { HASHING_LADDER } from "./dsa-ladders/hashing";
import { LINKED_LIST_LADDER } from "./dsa-ladders/linked-list";
import { STACK_QUEUE_LADDER } from "./dsa-ladders/stack-queue";
import { SLIDING_WINDOW_LADDER } from "./dsa-ladders/sliding-window";
import { BITS_LADDER } from "./dsa-ladders/bits";
import { GREEDY_LADDER } from "./dsa-ladders/greedy";
import { HEAPS_LADDER } from "./dsa-ladders/heaps";
import { TREES_LADDER } from "./dsa-ladders/trees";
import { BST_LADDER } from "./dsa-ladders/bst";
import { GRAPHS_LADDER } from "./dsa-ladders/graphs";
import { DP_LADDER } from "./dsa-ladders/dp";
import { TRIES_LADDER } from "./dsa-ladders/tries";
import { RECURSION_LADDER } from "./dsa-ladders/recursion";
import { STRINGS_LADDER } from "./dsa-ladders/strings";
import type { LadderDef, LadderRow } from "./dsa-ladders/types";

const LADDERS: LadderDef[] = [ARRAY_LADDER, STRINGS_LADDER, HASHING_LADDER, BINARY_SEARCH_LADDER, RECURSION_LADDER, LINKED_LIST_LADDER, STACK_QUEUE_LADDER, SLIDING_WINDOW_LADDER, BITS_LADDER, GREEDY_LADDER, HEAPS_LADDER, TREES_LADDER, BST_LADDER, GRAPHS_LADDER, DP_LADDER, TRIES_LADDER];
const OUT = path.join(process.cwd(), "data", "dsa-ladders.json");
const TODAY = new Date().toISOString().slice(0, 10);
const HUBS: ExternalLink[] = [
  { kind: "practice", label: "GFG practice hub", url: "https://www.geeksforgeeks.org/practice-problems/", scope: "hub" },
  { kind: "practice", label: "Code360 hub", url: "https://www.naukri.com/code360/problems", scope: "hub" },
  { kind: "practice", label: "HackerRank kit", url: "https://www.hackerrank.com/interview/interview-preparation-kit", scope: "hub" },
];
const PRIORITY = { High: "high", "Medium-High": "medium", Medium: "medium" } as const;

const errors: string[] = [];

function toQuestion(ladder: LadderDef, row: LadderRow, index: number): ExternalQuestion {
  const problem = problemBySlug.get(row.slug);
  if (!problem) errors.push(`${row.code}: unknown problem ${row.slug}`);
  else if (!testcaseBySlug.has(row.slug)) errors.push(`${row.code}: ${row.slug} has no judge`);
  if (!row.code.startsWith(ladder.prefix)) errors.push(`${row.code}: code must start with ${ladder.prefix}`);
  if (!ladder.stages.includes(row.stage)) errors.push(`${row.code}: unknown stage ${row.stage}`);
  const url = problem?.url ?? "";
  const lcUrl = url.startsWith("https://leetcode.com/") ? url : undefined;
  const links: ExternalLink[] = [
    ...(lcUrl ? [{ kind: "practice" as const, label: "LeetCode", url: lcUrl, scope: "item" as const }] : []),
    ...(url.startsWith("https://takeuforward.org/") ? [{ kind: "practice" as const, label: "takeUforward practice", url, scope: "item" as const }] : []),
    ...(row.lc ? HUBS : []),
  ];
  const companies: CompanyTag[] = [
    ...(row.companies ?? []).map((company) => ({ company, confidence: "medium" as const, sourceKind: "leetcode" as const, ...(lcUrl ? { sourceUrl: lcUrl } : {}) })),
    ...(row.service ?? []).map(([company, sourceUrl]) => ({ company, confidence: "medium" as const, sourceUrl, sourceKind: sourceUrl.includes("naukri.com") ? ("code360" as const) : ("gfg" as const) })),
  ];
  const leetcodeId = row.lc ?? problem?.leetcodeId;
  return {
    id: `${ladder.id}-${row.code.toLowerCase()}`,
    sheetId: ladder.id,
    order: index + 1,
    code: row.code,
    section: row.stage,
    category: row.pattern,
    difficulty: row.difficulty,
    title: problem?.title ?? row.task,
    recognitionSignal: row.signal,
    prompt: row.task,
    technique: row.skill,
    ...(leetcodeId ? { leetcodeId } : {}),
    localSlug: row.slug,
    links,
    companies,
    ...(row.priority ? { priority: PRIORITY[row.priority] } : {}),
    ...(row.why ? { notes: row.why } : {}),
    sourceCoverage: links.some((l) => l.scope === "item") ? "exact" : "hub-only",
  };
}

const sheets: ExternalSheet[] = LADDERS.map((ladder) => {
  const codes = ladder.rows.map((r) => r.code);
  if (new Set(codes).size !== codes.length) errors.push(`${ladder.id}: duplicate row codes`);
  return {
    id: ladder.id,
    kind: "ladder",
    title: ladder.title,
    source: "PrepOS ladder",
    sourceUrl: "https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet",
    description: ladder.description,
    updatedAt: TODAY,
    sections: ladder.stages.filter((s) => ladder.rows.some((r) => r.stage === s)),
    questions: ladder.rows.map((row, i) => toQuestion(ladder, row, i)),
  };
});

if (errors.length) {
  for (const e of errors) console.error(`- ${e}`);
  console.error("\nNot written: fix the rows above.");
  process.exit(1);
}

const catalogue = externalCatalogueSchema.parse({ generatedAt: TODAY, source: "PrepOS pattern ladders", sheets });
writeFileSync(OUT, `${JSON.stringify(catalogue, null, 2)}\n`);
console.log(`Wrote ${sheets.length} ladder(s), ${sheets.reduce((n, s) => n + s.questions.length, 0)} rows, to ${path.relative(process.cwd(), OUT)}`);
