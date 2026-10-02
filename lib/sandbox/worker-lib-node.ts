/**
 * Node-side access to the Worker library (lib/sandbox/worker-lib.ts). It evaluates the very same source
 * string the Worker embeds, so tests and the test-case generator exercise the real code. Never import this
 * from browser code: evaluating a string is for Node only.
 */
import { WORKER_LIB_SOURCE } from "./worker-lib";

export type ArgType = "value" | "ListNode" | "TreeNode" | "cycleList";
export type ReturnKind = "value" | "ListNode" | "TreeNode" | "arg0";

export interface WorkerLib {
  deepEqual(a: unknown, b: unknown): boolean;
  canonical(v: unknown): unknown;
  matches(actual: unknown, expected: unknown, compare?: "exact" | "unordered"): boolean;
  ListNode: new (val?: number, next?: unknown) => { val: number; next: unknown };
  TreeNode: new (val?: number, left?: unknown, right?: unknown) => { val: number; left: unknown; right: unknown };
  listFromArray(arr: unknown): unknown;
  listToArray(head: unknown): unknown[];
  cycleListFromSpec(spec: unknown): unknown;
  treeFromLevelOrder(arr: unknown): unknown;
  treeToLevelOrder(root: unknown): unknown[];
  buildArg(type: ArgType, value: unknown): unknown;
  encodeResult(returns: ReturnKind, out: unknown, args: unknown[], argTypes?: readonly ArgType[]): unknown;
  /** The raw source, for evaluating a reference solution in a context that has ListNode/TreeNode. */
  source: string;
}

let cached: Omit<WorkerLib, "source"> | undefined;

export function workerLib(): WorkerLib {
  cached ??= new Function(
    `${WORKER_LIB_SOURCE}
    return {
      deepEqual: __deepEqual, canonical: __canonical, matches: __matches, ListNode, TreeNode,
      listFromArray: __listFromArray, listToArray: __listToArray, cycleListFromSpec: __cycleListFromSpec,
      treeFromLevelOrder: __treeFromLevelOrder, treeToLevelOrder: __treeToLevelOrder,
      buildArg: __buildArg, encodeResult: __encodeResult,
    };`,
  )() as Omit<WorkerLib, "source">;
  return { ...cached, source: WORKER_LIB_SOURCE };
}
