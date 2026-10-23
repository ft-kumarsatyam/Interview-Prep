/**
 * Seals hidden test cases before they reach the browser. A hidden case keeps its input (the code has to run on it) but
 * loses its expected answer; it carries the SHA-256 of that answer's stable text instead, and the sandbox judges by
 * hashing what your code returned. So you cannot read a hidden answer from the page, only fail or pass it.
 *
 * Limits: the inputs stay visible, and comparisons that are validity checks rather than equality (no-adjacent-repeat,
 * same-inorder and similar) cannot be hashed, so those cases are sent as they are. True hiding would need to run your
 * code on a server, which the free tier does not allow. Node-side only: it evaluates the worker library's source.
 */
import { workerLib } from "@/core/sandbox/worker-lib-node";
import type { CompareMode, TestCase } from "@/modules/dsa/domain/dsa-runner";

/** `revealed` are indices already shown to the learner after a failed Submit; those are sent in full. */
export function sealCases(cases: readonly TestCase[], compare: CompareMode | undefined, revealed: readonly number[] = []): TestCase[] {
  const lib = workerLib();
  if (!lib.sealable(compare)) return [...cases];
  return cases.map((c, i) => {
    if (!c.hidden || revealed.includes(i) || c.expectedHash) return c;
    const { expected: _expected, ...rest } = c;
    void _expected;
    return { ...rest, expected: null, expectedHash: lib.sha256(lib.sealText(c.expected, compare)) };
  });
}
