/**
 * Turns an authored ProblemSpec into the entry stored in data/dsa-testcases.json. `expected` comes only from
 * running the reference solution; an independently written brute force must agree on every case and on 200
 * seeded random inputs, and the spec must pass the quality lint. Pure of file I/O so tests can reuse it.
 */
import type { HintLevel, TestCase } from "@/lib/domain/dsa-runner";
import { workerLib } from "@/lib/sandbox/worker-lib-node";
import { lintSpec } from "./lint";
import type { ProblemSpec } from "./types";
import { loadGenerator, loadSolution, mulberry32, seedFrom } from "./vm-runner";

export const FUZZ_RUNS = 200;

export interface TestcaseEntryV2 {
  version: 2;
  signature: { functionName: string; params: string[]; returnType: string };
  starter: string;
  argTypes?: ProblemSpec["argTypes"];
  returns?: ProblemSpec["returns"];
  compare?: ProblemSpec["compare"];
  cases: TestCase[];
  hints: HintLevel[];
}

export interface BuildResult {
  entry: TestcaseEntryV2;
  errors: string[];
}

const KINDS = ["nudge", "approach", "pseudocode"] as const;

const describe = (v: unknown) => (JSON.stringify(v) ?? String(v)).slice(0, 120);

export function buildEntry(spec: ProblemSpec, ctx: { slugExists: boolean }): BuildResult {
  const errors: string[] = [];
  const shape = { argTypes: spec.argTypes, returns: spec.returns };
  const ref = loadSolution(spec.reference, spec.functionName, shape);
  const brute = loadSolution(spec.brute, spec.functionName, shape);
  const lib = workerLib();
  const compare = spec.compare ?? "exact";

  const cases: TestCase[] = [];
  for (const c of spec.cases) {
    let expected: unknown;
    try {
      expected = ref(c.input);
    } catch (e) {
      errors.push(`reference failed on ${describe(c.input)}: ${(e as Error).message}`);
      continue;
    }
    try {
      const other = brute(c.input);
      if (!lib.matches(other, expected, compare)) errors.push(`brute force disagrees on ${describe(c.input)}: reference ${describe(expected)}, brute ${describe(other)}`);
    } catch (e) {
      errors.push(`brute force failed on ${describe(c.input)}: ${(e as Error).message}`);
    }
    cases.push({ input: c.input, expected, hidden: c.hidden, ...(c.edge ? { edge: c.edge } : {}), ...(c.note ? { note: c.note } : {}) });
  }

  if (spec.fuzz) {
    const gen = loadGenerator(spec.fuzz);
    const rand = mulberry32(seedFrom(spec.slug));
    for (let i = 0; i < FUZZ_RUNS; i++) {
      const input = gen(rand);
      try {
        const a = ref(input);
        const b = brute(input);
        if (!lib.matches(a, b, compare)) {
          errors.push(`fuzz disagreement on ${describe(input)}: reference ${describe(a)}, brute ${describe(b)}`);
          break;
        }
      } catch (e) {
        errors.push(`fuzz run failed on ${describe(input)}: ${(e as Error).message}`);
        break;
      }
    }
  }

  // How many cases the unmodified starter passes. An in-place problem passes any case already in its final state; that's unavoidable.
  let starterPasses = 0;
  try {
    const starter = loadSolution(spec.starter, spec.functionName, shape);
    for (const c of cases) {
      let out: unknown;
      try {
        out = starter(c.input);
      } catch {
        continue;
      }
      const alreadyDone = spec.returns === "arg0" && lib.matches(c.input[0], c.expected, compare);
      if (!alreadyDone && lib.matches(out, c.expected, compare)) starterPasses++;
    }
  } catch (e) {
    errors.push(`starter does not load: ${(e as Error).message}`);
  }

  errors.push(...lintSpec(spec, { slugExists: ctx.slugExists, starterPasses }));

  const entry: TestcaseEntryV2 = {
    version: 2,
    signature: { functionName: spec.functionName, params: spec.params, returnType: spec.returnType },
    starter: spec.starter,
    ...(spec.argTypes ? { argTypes: spec.argTypes } : {}),
    ...(spec.returns && spec.returns !== "value" ? { returns: spec.returns } : {}),
    ...(spec.compare && spec.compare !== "exact" ? { compare: spec.compare } : {}),
    cases,
    hints: spec.hints.map((text, i) => ({ level: (i + 1) as 1 | 2 | 3, kind: KINDS[i]!, text })),
  };
  return { entry, errors };
}
