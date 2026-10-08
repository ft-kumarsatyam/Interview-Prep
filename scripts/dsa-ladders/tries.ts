import type { LadderDef } from "./types";

const TR = "Tries";

export const TRIES_LADDER: LadderDef = {
  id: "ladder-tries",
  prefix: "Y",
  title: "Tries Ladder",
  description: "22 trie questions from prefix counting to building a trie, wildcard and one-mismatch search, prefix queries, binary tries for XOR, and hard trie-plus-DFS or trie-plus-DP problems, easy to hard. Each row names the signal to spot, the task, and the skill it builds; every row opens in PrepOS with a judge.",
  stages: ["Prefix Basics", "Design a Trie", "Prefix Queries", "Advanced"],
  rows: [
    { code: "Y01", stage: "Prefix Basics", difficulty: "Easy", pattern: TR, signal: "How many words start with p", task: "Count the words with a given prefix.", skill: "Prefix check, or counts on trie nodes", slug: "counting-words-with-a-given-prefix", lc: 2185 },
    { code: "Y02", stage: "Prefix Basics", difficulty: "Easy", pattern: TR, signal: "Both a prefix and a suffix", task: "Count pairs where one word is a prefix and suffix of a later word.", skill: "Pair the ends of a word in one trie key", slug: "count-prefix-and-suffix-pairs-i", lc: 3042 },
    { code: "Y03", stage: "Design a Trie", difficulty: "Medium", pattern: TR, signal: "Insert, search, startsWith", task: "Implement a trie.", skill: "Child map + end flag", slug: "implement-trie-prefix-tree", lc: 208 },
    { code: "Y04", stage: "Design a Trie", difficulty: "Medium", pattern: "Trie", signal: "Counts and erase too", task: "Implement a trie with counts and erase.", skill: "Pass and end counters per node", slug: "trie-implementation-and-advanced-operations" },
    { code: "Y05", stage: "Design a Trie", difficulty: "Medium", pattern: TR, signal: "Sum of values under a prefix", task: "Design a map that sums values by prefix.", skill: "Store subtree totals, apply deltas", slug: "map-sum-pairs", lc: 677 },
    { code: "Y06", stage: "Design a Trie", difficulty: "Medium", pattern: TR, signal: "'.' matches any letter", task: "Design add and wildcard search.", skill: "DFS over all children on a dot", slug: "design-add-and-search-words-data-structure", lc: 211 },
    { code: "Y07", stage: "Design a Trie", difficulty: "Medium", pattern: TR, signal: "Exactly one letter changed", task: "Design a dictionary that allows one mismatch.", skill: "Trie walk with a used-mismatch flag", slug: "implement-magic-dictionary", lc: 676 },
    { code: "Y08", stage: "Prefix Queries", difficulty: "Medium", pattern: TR, signal: "Shortest root of each word", task: "Replace words by their shortest root.", skill: "Stop at the first word end", slug: "replace-words", lc: 648 },
    { code: "Y09", stage: "Prefix Queries", difficulty: "Medium", pattern: TR, signal: "Built one letter at a time", task: "Return the longest buildable word.", skill: "Every prefix must be a word", slug: "longest-word-in-dictionary", lc: 720 },
    { code: "Y10", stage: "Prefix Queries", difficulty: "Medium", pattern: "Trie", signal: "All prefixes present", task: "Return the longest word whose prefixes all exist.", skill: "Check end flags along the path", slug: "longest-word-with-all-prefixes" },
    { code: "Y11", stage: "Prefix Queries", difficulty: "Medium", pattern: TR, signal: "Top 3 per typed letter", task: "Return product suggestions while typing.", skill: "Sorted list + binary search, or trie", slug: "search-suggestions-system", lc: 1268 },
    { code: "Y12", stage: "Prefix Queries", difficulty: "Medium", pattern: TR, signal: "Digits as letters", task: "Return the longest common prefix across two arrays.", skill: "Trie of digit strings", slug: "find-the-length-of-the-longest-common-prefix", lc: 3043 },
    { code: "Y13", stage: "Prefix Queries", difficulty: "Medium", pattern: TR, signal: "Suffixes hide inside words", task: "Return the shortest reference string length.", skill: "Reversed trie: count the leaves", slug: "short-encoding-of-words", lc: 820 },
    { code: "Y14", stage: "Prefix Queries", difficulty: "Medium", pattern: TR, signal: "Leftovers after using dictionary words", task: "Return the fewest extra characters.", skill: "DP from the right + trie walk", slug: "extra-characters-in-a-string", lc: 2707 },
    { code: "Y15", stage: "Advanced", difficulty: "Hard", pattern: "Trie", signal: "Every substring once", task: "Count the distinct substrings.", skill: "Insert every suffix, count new nodes", slug: "number-of-distinct-substrings-in-a-string" },
    { code: "Y16", stage: "Advanced", difficulty: "Hard", pattern: TR, signal: "Best XOR under a cap", task: "Answer max-XOR queries with a value limit.", skill: "Offline sort + binary trie", slug: "maximum-xor-with-an-element-from-array", lc: 1707 },
    { code: "Y17", stage: "Advanced", difficulty: "Hard", pattern: TR, signal: "Score of every prefix", task: "Return each word's total prefix score.", skill: "Counts on nodes, sum along the path", slug: "sum-of-prefix-scores-of-strings", lc: 2416 },
    { code: "Y18", stage: "Advanced", difficulty: "Hard", pattern: TR, signal: "Many words on one board", task: "Find every word on the board.", skill: "Board DFS guided by a trie", slug: "word-search-ii", lc: 212 },
    { code: "Y19", stage: "Advanced", difficulty: "Hard", pattern: TR, signal: "Does the stream end with a word?", task: "Design a stream checker.", skill: "Trie of reversed words", slug: "stream-of-characters", lc: 1032 },
    { code: "Y20", stage: "Advanced", difficulty: "Hard", pattern: TR, signal: "Prefix and suffix together", task: "Return the largest index matching both.", skill: "Precompute prefix#suffix keys", slug: "prefix-and-suffix-search", lc: 745 },
    { code: "Y21", stage: "Advanced", difficulty: "Hard", pattern: TR, signal: "Two words form a palindrome", task: "Return every palindrome pair.", skill: "Split points + reversed-word lookup", slug: "palindrome-pairs", lc: 336 },
    { code: "Y22", stage: "Advanced", difficulty: "Hard", pattern: TR, signal: "Made of two or more shorter words", task: "Return every concatenated word.", skill: "Word Break over shorter words", slug: "concatenated-words", lc: 472 },
  ],
};
