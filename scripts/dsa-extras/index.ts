import type { Built } from "./define";
import { A2Z_BASICS } from "./a2z-basics";
import { A2Z_DP } from "./a2z-dp";
import { A2Z_GRAPHS } from "./a2z-graphs";
import { A2Z_LEETCODE } from "./a2z-leetcode";
import { A2Z_LISTS } from "./a2z-lists";
import { A2Z_PATTERNS } from "./a2z-patterns";
import { A2Z_SORTING_SEARCH } from "./a2z-sorting-search";
import { A2Z_STACK_HEAP } from "./a2z-stack-heap";
import { A2Z_STRINGS_GREEDY } from "./a2z-strings-greedy";
import { A2Z_TREES } from "./a2z-trees";
import { A2Z_TRIES_MATH } from "./a2z-tries-math";
import { LADDER_ARRAYS } from "./ladder-arrays";
import { LADDER_HASHING } from "./ladder-hashing";
import { LADDER_LISTS } from "./ladder-lists";
import { LADDER_BITS } from "./ladder-bits";
import { LADDER_GREEDY } from "./ladder-greedy";
import { LADDER_HEAPS } from "./ladder-heaps";
import { LADDER_BST } from "./ladder-bst";
import { LADDER_TRIES } from "./ladder-tries";
import { LADDER_RECURSION } from "./ladder-recursion";
import { LADDER_STRINGS } from "./ladder-strings";

/** Every problem outside data/dsa-problems.json, in catalogue order. Add a new batch file here. */
export const ALL_EXTRAS: Built[] = [
  ...LADDER_ARRAYS, ...A2Z_LEETCODE, ...A2Z_PATTERNS, ...A2Z_BASICS, ...A2Z_SORTING_SEARCH, ...A2Z_STRINGS_GREEDY,
  ...A2Z_LISTS, ...A2Z_STACK_HEAP, ...A2Z_TREES, ...A2Z_GRAPHS, ...A2Z_DP,
  ...A2Z_TRIES_MATH, ...LADDER_STRINGS, ...LADDER_HASHING, ...LADDER_RECURSION, ...LADDER_LISTS, ...LADDER_BITS, ...LADDER_GREEDY, ...LADDER_HEAPS, ...LADDER_BST, ...LADDER_TRIES,
];
