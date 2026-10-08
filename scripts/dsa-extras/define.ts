/**
 * One definition per problem that isn't in data/dsa-problems.json: its catalogue entry (statement for authored
 * problems, LeetCode id for LeetCode-backed ones) and its judge spec. Hidden cases beyond the hand-picked ones are
 * drawn from the problem's own fuzz generator with a fixed seed, so regenerating never changes them.
 */
import type { ArgType, CompareMode, ReturnKind } from "@/modules/dsa/domain/dsa-runner";
import type { EdgeId } from "@/modules/dsa/domain/edge-cases";
import type { ExtraProblem } from "@/modules/dsa/domain/extra-problems";
import { MIN_HIDDEN_SHARE } from "../dsa-testcases/lint";
import type { ProblemSpec, RawCase } from "../dsa-testcases/types";
import { loadGenerator, mulberry32, seedFrom } from "../dsa-testcases/vm-runner";

export type Edge = [EdgeId, unknown[], string?];

export interface ProblemDef {
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  pattern: string;
  /** LeetCode-backed: the statement is fetched from LeetCode, so the slug must be LeetCode's own. */
  leetcodeId?: number;
  /** Source page (takeUforward, LeetCode). */
  url?: string;
  /** Markdown statement for authored problems. Examples are rendered from the visible cases. */
  statement?: string;
  constraints?: string[];
  fn: string;
  /** [name, JSDoc type]. */
  params: Array<[string, string]>;
  returns: string;
  argTypes?: ArgType[];
  returnKind?: ReturnKind;
  compare?: CompareMode;
  /** Replaces the generated JSDoc starter (class-based problems). */
  starter?: string;
  hints: [string, string, string];
  reference: string;
  brute: string;
  fuzz?: string;
  examples: unknown[][];
  /** The first edge case is visible, the rest are hidden. */
  edges: Edge[];
  hidden?: unknown[][];
  /** Fuzz-drawn hidden cases to add (at least this many; more if the hidden share needs them). */
  fuzzHidden?: number;
}

export interface Built {
  extra: ExtraProblem;
  spec: ProblemSpec;
}

const LIST_DOC = "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *   this.val = (val === undefined ? 0 : val)\n *   this.next = (next === undefined ? null : next)\n * }\n */";
const DLIST_DOC = "/**\n * Doubly linked list: ListNode objects with val, next and prev (prev is null on the head).\n * Keep both next and prev correct in what you return.\n */";
const TREE_DOC = "/**\n * Definition for a binary tree node.\n * function TreeNode(val, left, right) {\n *   this.val = (val === undefined ? 0 : val)\n *   this.left = (left === undefined ? null : left)\n *   this.right = (right === undefined ? null : right)\n * }\n */";

function starterFor(d: ProblemDef): string {
  const kinds = [...(d.argTypes ?? []), d.returnKind ?? "value"];
  const types = [d.returns, ...d.params.map(([, t]) => t)].join(" ");
  const head = kinds.includes("DListNode") ? `${DLIST_DOC}\n` : kinds.includes("ListNode") || kinds.includes("cycleList") ? `${LIST_DOC}\n` : /TreeNode/.test(types) ? `${TREE_DOC}\n` : "";
  const doc = [...d.params.map(([n, t]) => ` * @param {${t}} ${n}`), ` * @return {${d.returns}}`].join("\n");
  return `${head}/**\n${doc}\n */\nfunction ${d.fn}(${d.params.map(([n]) => n).join(", ")}) {\n  \n}`;
}

function drawHidden(d: ProblemDef, taken: Set<string>, visible: number, hiddenSoFar: number): unknown[][] {
  if (!d.fuzz) return [];
  const gen = loadGenerator(d.fuzz);
  const rand = mulberry32(seedFrom(`${d.slug}:hidden`));
  const out: unknown[][] = [];
  const wanted = d.fuzzHidden ?? 6;
  for (let tries = 0; tries < 400; tries++) {
    const total = visible + hiddenSoFar + out.length;
    if (out.length >= wanted && (hiddenSoFar + out.length) / total >= MIN_HIDDEN_SHARE + 0.05) break;
    const input = gen(rand);
    const key = JSON.stringify(input);
    if (taken.has(key) || key.length > 4000) continue;
    taken.add(key);
    out.push(input);
  }
  return out;
}

export function define(d: ProblemDef): Built {
  const cases: RawCase[] = [];
  const taken = new Set<string>();
  const push = (c: RawCase) => {
    const key = JSON.stringify(c.input);
    if (taken.has(key)) throw new Error(`${d.slug}: duplicate case ${key.slice(0, 80)}`);
    taken.add(key);
    cases.push(c);
  };
  for (const input of d.examples) push({ input, hidden: false });
  d.edges.forEach(([edge, input, note], i) => push({ input, hidden: i > 0, edge, ...(note ? { note } : {}) }));
  for (const input of d.hidden ?? []) push({ input, hidden: true });
  const visible = cases.filter((c) => !c.hidden).length;
  for (const input of drawHidden(d, taken, visible, cases.length - visible)) cases.push({ input, hidden: true });

  const spec: ProblemSpec = {
    slug: d.slug,
    functionName: d.fn,
    params: d.params.map(([n]) => n),
    returnType: d.returns,
    starter: d.starter ?? starterFor(d),
    ...(d.argTypes ? { argTypes: d.argTypes } : {}),
    ...(d.returnKind ? { returns: d.returnKind } : {}),
    ...(d.compare ? { compare: d.compare } : {}),
    hints: d.hints,
    reference: d.reference,
    brute: d.brute,
    ...(d.fuzz ? { fuzz: d.fuzz } : {}),
    cases,
  };
  const extra: ExtraProblem = d.leetcodeId
    ? { slug: d.slug, title: d.title, difficulty: d.difficulty, pattern: d.pattern, source: "leetcode", leetcodeId: d.leetcodeId, url: d.url ?? `https://leetcode.com/problems/${d.slug}/` }
    : {
        slug: d.slug,
        title: d.title,
        difficulty: d.difficulty,
        pattern: d.pattern,
        source: "authored",
        ...(d.url ? { url: d.url } : {}),
        statementMd: (d.statement ?? "").trim(),
        ...(d.constraints?.length ? { constraints: d.constraints } : {}),
      };
  return { extra, spec };
}

/** The same judge under another slug and statement (e.g. the recursive or algorithm-specific version of a problem). */
export function variant(base: ProblemDef, over: Partial<ProblemDef> & Pick<ProblemDef, "slug" | "title" | "statement">): ProblemDef {
  return { ...base, ...over };
}

export const tuf = (slug: string) => `https://takeuforward.org/practice/dsa/${slug}`;
