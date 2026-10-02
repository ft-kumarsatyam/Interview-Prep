import type { ProblemSpec } from "../types";
import { ARRAYS2 } from "./arrays2";
import { ARRAYS_HASHING } from "./arrays-hashing";
import { DP_GREEDY_BITS } from "./dp-greedy-bits";
import { LISTS } from "./lists";
import { STACK_SEARCH } from "./stack-search";
import { STRINGS_SEARCH } from "./strings-search";
import { TREES } from "./trees";
import { WINDOW_POINTERS } from "./window-pointers";

/** Every authored problem, in file order. Add a new batch file here. */
export const ALL_SPECS: ProblemSpec[] = [...ARRAYS_HASHING, ...STRINGS_SEARCH, ...ARRAYS2, ...WINDOW_POINTERS, ...STACK_SEARCH, ...DP_GREEDY_BITS, ...LISTS, ...TREES];
