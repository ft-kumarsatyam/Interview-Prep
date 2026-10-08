/**
 * Runs trusted, repo-authored solutions in node:vm to compute `expected` values. node:vm is NOT a security
 * boundary: never pass model-written or user code here. The context also holds the Worker library
 * (ListNode, TreeNode and the array encodings) so references see exactly what the browser sandbox provides.
 */
import vm from "node:vm";
import type { ArgType, ReturnKind } from "@/modules/dsa/domain/dsa-runner";
import { WORKER_LIB_SOURCE } from "@/core/sandbox/worker-lib";

const TIMEOUT_MS = 2000;

export interface RunShape {
  argTypes?: ArgType[];
  returns?: ReturnKind;
}

const plain = (value: unknown): unknown => {
  if (value === undefined) throw new Error("the solution returned undefined");
  return JSON.parse(JSON.stringify(value));
};

/** Load a solution once; the returned function runs it on one input and gives the encoded, JSON-safe result. */
export function loadSolution(source: string, functionName: string, shape: RunShape = {}): (input: unknown[]) => unknown {
  const sandbox: Record<string, unknown> = { __input: [], __out: undefined };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(WORKER_LIB_SOURCE, ctx);
  vm.runInContext(source, ctx, { timeout: TIMEOUT_MS });
  const argTypes = JSON.stringify(shape.argTypes ?? []);
  const returns = JSON.stringify(shape.returns ?? "value");
  const call = new vm.Script(`
    var __types = ${argTypes};
    var __args = __buildArgs(__types, __input);
    __out = __encodeResult(${returns}, ${functionName}.apply(null, __args), __args, __types);
  `);
  return (input) => {
    sandbox.__input = JSON.parse(JSON.stringify(input));
    call.runInContext(ctx, { timeout: TIMEOUT_MS });
    return plain(sandbox.__out);
  };
}

/** Load a `function gen(rand)` input generator. The Worker library is available (ListNode, TreeNode, __treeToLevelOrder, ...). */
export function loadGenerator(source: string): (rand: () => number) => unknown[] {
  const sandbox: Record<string, unknown> = { __rand: () => 0, __out: undefined };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(WORKER_LIB_SOURCE, ctx);
  vm.runInContext(source, ctx, { timeout: TIMEOUT_MS });
  const call = new vm.Script("__out = gen(__rand);");
  return (rand) => {
    sandbox.__rand = rand;
    call.runInContext(ctx, { timeout: TIMEOUT_MS });
    return plain(sandbox.__out) as unknown[];
  };
}

/** Small deterministic PRNG so a fuzz failure reproduces. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
