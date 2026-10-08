import type { ProblemSpec } from "../types";
import { ALL_EXTRAS } from "../../dsa-extras";
import { ARRAYS2 } from "./arrays2";
import { ARRAYS_HASHING } from "./arrays-hashing";
import { DP_GREEDY_BITS } from "./dp-greedy-bits";
import { LADDER_SEEDED } from "./ladder-seeded";
import { LADDER_BINARY_SEARCH_SEEDED } from "./ladder-binary-search-seeded";
import { LADDER_HASHING_SEEDED } from "./ladder-hashing-seeded";
import { LADDER_LISTS_SEEDED } from "./ladder-lists-seeded";
import { LADDER_RECURSION_SEEDED } from "./ladder-recursion-seeded";
import { LADDER_STACK_SEEDED } from "./ladder-stack-seeded";
import { LADDER_WINDOW_SEEDED } from "./ladder-window-seeded";
import { LADDER_BITS_SEEDED } from "./ladder-bits-seeded";
import { LADDER_GREEDY_SEEDED } from "./ladder-greedy-seeded";
import { LADDER_HEAPS_SEEDED } from "./ladder-heaps-seeded";
import { LADDER_TREES_SEEDED } from "./ladder-trees-seeded";
import { LADDER_TREES2_SEEDED } from "./ladder-trees2-seeded";
import { LADDER_BST_SEEDED } from "./ladder-bst-seeded";
import { LADDER_GRAPHS_SEEDED } from "./ladder-graphs-seeded";
import { LADDER_GRAPHS2_SEEDED } from "./ladder-graphs2-seeded";
import { LADDER_DP_SEEDED } from "./ladder-dp-seeded";
import { LADDER_DP2_SEEDED } from "./ladder-dp2-seeded";
import { LADDER_TRIES_SEEDED } from "./ladder-tries-seeded";
import { LADDER_STRINGS_SEEDED } from "./ladder-strings-seeded";
import { LISTS } from "./lists";
import { STACK_SEARCH } from "./stack-search";
import { STRINGS_SEARCH } from "./strings-search";
import { TREES } from "./trees";
import { WINDOW_POINTERS } from "./window-pointers";

/** Every authored problem, in file order. Add a new batch file here; problems outside dsa-problems.json go in scripts/dsa-extras. */
export const ALL_SPECS: ProblemSpec[] = [
  ...ARRAYS_HASHING, ...STRINGS_SEARCH, ...ARRAYS2, ...WINDOW_POINTERS, ...STACK_SEARCH, ...DP_GREEDY_BITS, ...LISTS, ...TREES, ...LADDER_SEEDED, ...LADDER_STRINGS_SEEDED, ...LADDER_HASHING_SEEDED, ...LADDER_BINARY_SEARCH_SEEDED, ...LADDER_RECURSION_SEEDED, ...LADDER_LISTS_SEEDED, ...LADDER_STACK_SEEDED, ...LADDER_WINDOW_SEEDED, ...LADDER_BITS_SEEDED, ...LADDER_GREEDY_SEEDED, ...LADDER_HEAPS_SEEDED, ...LADDER_TREES_SEEDED, ...LADDER_TREES2_SEEDED, ...LADDER_BST_SEEDED, ...LADDER_GRAPHS_SEEDED, ...LADDER_GRAPHS2_SEEDED, ...LADDER_DP_SEEDED, ...LADDER_DP2_SEEDED, ...LADDER_TRIES_SEEDED,
  ...ALL_EXTRAS.map((b) => b.spec),
];
