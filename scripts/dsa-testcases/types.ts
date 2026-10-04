import type { ArgType, CompareMode, ReturnKind } from "@/modules/dsa/domain/dsa-runner";
import type { EdgeId } from "@/modules/dsa/domain/edge-cases";

export interface RawCase {
  /** One entry per argument, in the LeetCode encodings (arrays for lists, level order for trees). */
  input: unknown[];
  hidden: boolean;
  edge?: EdgeId;
  note?: string;
}

/**
 * One problem's authored content. `expected` is never written here: the generator computes it by running
 * `reference`, and cross-checks it against an independently written `brute` on every case and on random inputs.
 */
export interface ProblemSpec {
  slug: string;
  functionName: string;
  params: string[];
  returnType: string;
  starter: string;
  argTypes?: ArgType[];
  returns?: ReturnKind;
  compare?: CompareMode;
  /** nudge, approach, pseudocode. */
  hints: [string, string, string];
  /** A complete, correct JS solution. Runs in a sandbox with ListNode/TreeNode available, like the browser Worker. */
  reference: string;
  /** A different, simpler (usually slower) solution with the same function name. */
  brute: string;
  /** Source of `function gen(rand)` returning one input array (rand() is in [0,1)). Optional: used for 200 random cross-checks. */
  fuzz?: string;
  cases: RawCase[];
}
