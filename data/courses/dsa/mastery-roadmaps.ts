import { masteryRoadmapSchema, type MasteryRoadmap } from "@/modules/course/domain/course";

type RoadmapEntry = {
  lessonId: string;
  roadmap: MasteryRoadmap;
};

const problem = (id: string, level: "Easy" | "Medium" | "Hard", pattern: string, prompt: string, slug?: string) => ({
  id,
  level,
  pattern,
  prompt,
  ...(slug ? { slug } : {}),
});

const phase = (id: string, title: string, focus: string, problemIds: string[]) => ({ id, title, focus, problemIds });

const roadmap = (input: MasteryRoadmap): MasteryRoadmap => masteryRoadmapSchema.parse(input);

const arrayStringProblems = [
  problem("a1", "Easy", "Traversal", "Find the sum of all elements in an array."),
  problem("a2", "Easy", "Traversal", "Find the maximum element without using Math.max()."),
  problem("a3", "Easy", "Traversal", "Count how many numbers are even."),
  problem("a4", "Easy", "Linear Search", "Find the first index where a target value appears."),
  problem("a5", "Easy", "String Traversal", "Count how many times a target character appears."),
  problem("a6", "Easy", "String Traversal", "Count vowels in a string."),
  problem("a7", "Easy", "String Traversal", "Reverse a string manually using a loop.", "reverse-string"),
  problem("a8", "Easy", "String Traversal", "Check whether a string is a palindrome.", "valid-palindrome"),
  problem("a9", "Easy", "Frequency", "Build a character-frequency counter for a string."),
  problem("a10", "Easy", "Search", "Return whether an array contains a target value."),
  problem("a11", "Medium", "Array Simulation", "Move all zeroes to the end while preserving non-zero order.", "move-zeroes"),
  problem("a12", "Medium", "In-place Array", "Remove all occurrences of a value in-place and return the new length."),
  problem("b1", "Medium", "Two Pointers", "Reverse an array in-place using left and right pointers."),
  problem("b2", "Medium", "Two Pointers", "Check whether a sorted array contains two values whose sum equals a target."),
  problem("b3", "Medium", "Two Pointers", "Remove duplicates from a sorted array in-place.", "remove-duplicates-from-sorted-array"),
  problem("b4", "Medium", "Two Pointers", "Check whether a string is a palindrome using two pointers.", "valid-palindrome"),
  problem("b5", "Medium", "Two Pointers", "Find the maximum water a pair of vertical lines can contain.", "container-with-most-water"),
  problem("b6", "Medium", "HashMap", "Solve Two Sum for an unsorted array.", "two-sum"),
  problem("b7", "Medium", "HashMap", "Find the first non-repeating character in a string."),
  problem("b8", "Medium", "HashMap", "Determine whether two strings are anagrams.", "valid-anagram"),
  problem("b9", "Medium", "HashMap / Set", "Find whether an array contains duplicates.", "contains-duplicate"),
  problem("b10", "Medium", "HashMap", "Determine whether a ransom note can be constructed from magazine characters.", "ransom-note"),
  problem("b11", "Medium", "Fixed Window", "Find the maximum sum of any subarray of size K."),
  problem("b12", "Medium", "Fixed Window", "Find the maximum number of vowels in any substring of length K."),
  problem("b13", "Medium", "Fixed Window", "Find the maximum average of a subarray of size K.", "maximum-average-subarray-i"),
  problem("b14", "Medium", "Variable Window", "Find the longest substring without repeating characters.", "longest-substring-without-repeating-characters"),
  problem("b15", "Medium", "Variable Window", "Find the minimum length subarray with sum at least a target.", "minimum-size-subarray-sum"),
  problem("b16", "Medium", "Variable Window", "Find the longest positive-only subarray whose sum is at most K."),
  problem("b17", "Medium", "Prefix Sum", "Answer multiple range-sum queries efficiently."),
  problem("b18", "Medium", "Prefix Sum + Map", "Count subarrays whose sum equals K.", "subarray-sum-equals-k"),
  problem("b19", "Medium", "Kadane / Running State", "Find the maximum sum contiguous subarray.", "maximum-subarray"),
  problem("b20", "Medium", "String + Two Pointers", "Reverse only the vowels in a string."),
  problem("b21", "Medium", "String Simulation", "Compare two strings containing backspace characters.", "backspace-string-compare"),
  problem("c1", "Medium", "Mixed Two Pointers", "Find all unique triplets in an array whose sum is zero.", "3sum"),
  problem("c2", "Medium", "Mixed HashMap", "Group a list of words into anagram groups.", "group-anagrams"),
  problem("c3", "Medium", "Sliding Window", "Find all starting indices of anagrams of a pattern inside a string.", "find-all-anagrams-in-a-string"),
  problem("c4", "Medium", "Sliding Window", "Find the longest substring after replacing at most K characters.", "longest-repeating-character-replacement"),
  problem("c5", "Hard", "Sliding Window", "Find the minimum window in a string containing all characters of another string.", "minimum-window-substring"),
  problem("c6", "Medium", "Two Pointers", "Calculate how much rainwater can be trapped.", "trapping-rain-water"),
  problem("c7", "Hard", "Hashing / In-place", "Find the first missing positive integer in O(n) time and O(1) extra space.", "first-missing-positive"),
  problem("c8", "Medium", "String / Greedy", "Find the longest possible palindrome length that can be built from given characters.", "longest-palindrome"),
  problem("c9", "Medium", "String + Two Pointers", "Check whether a string can become a palindrome after deleting at most one character.", "valid-palindrome-ii"),
  problem("c10", "Hard", "String DP / Expansion", "Find the longest palindromic substring.", "longest-palindromic-substring"),
  problem("c11", "Hard", "Prefix / Map", "Find the shortest subarray meeting a sum constraint and state the positivity assumption."),
  problem("c12", "Hard", "Mixed Pattern", "Solve an unfamiliar Array/String problem and explain the pattern choice before coding."),
];

const arraysAndStrings = roadmap({
  goal: "Recognise the underlying Array/String pattern in 30–60 seconds, implement a familiar Easy/Medium pattern in 5–15 minutes, and explain state, movement, stopping condition and complexity without looking at a solution.",
  doneWhen: [
    "I can name the likely pattern and explain why it applies before writing code.",
    "I can identify the state or data structure and what changes on every move.",
    "I can state the stopping condition and time/space complexity.",
    "I can implement a familiar Easy/Medium exercise from memory.",
    "I re-solve selected problems after a gap instead of treating one solve as mastery.",
  ],
  recognitionMap: [
    { signal: "Inspect every element once and keep a running answer.", pattern: "Basic traversal", tools: ["for / while", "index", "accumulator"] },
    { signal: "Find existence, an index, or the first/last occurrence.", pattern: "Linear search", tools: ["loop", "condition", "early return"] },
    { signal: "Sorted input, a pair, or an in-place transformation.", pattern: "Two pointers", tools: ["left / right", "slow / fast", "invariants"] },
    { signal: "Frequency, duplicates, complement, or fast membership.", pattern: "HashMap / Set", tools: ["Map", "Set", "canonical key"] },
    { signal: "Contiguous segment of exactly K items.", pattern: "Fixed sliding window", tools: ["left / right", "running sum / count"] },
    { signal: "Longest or shortest contiguous segment satisfying a rule.", pattern: "Variable sliding window", tools: ["expand right", "shrink left", "window state"] },
    { signal: "Repeated range or subarray sums.", pattern: "Prefix sum", tools: ["running sum", "prefix array", "Map"] },
    { signal: "Characters, palindrome, anagram, or normalisation.", pattern: "String manipulation", tools: ["indexing", "Map / Set", "character predicate"] },
    { signal: "Best contiguous total while deciding whether to extend or restart.", pattern: "Kadane / running state", tools: ["best ending here", "global best"] },
    { signal: "Two or more signals appear together, often after sorting.", pattern: "Mixed / advanced", tools: ["sort", "Map", "pointers / window"] },
  ],
  phases: [
    phase("foundation", "Foundation mechanics", "Build traversal, search, string indexing, frequency counting and in-place array habits.", ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "a10", "a11", "a12"]),
    phase("core", "Core interview patterns", "Learn two pointers, maps and sets, fixed and variable windows, prefix sums and Kadane.", ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "b10", "b11", "b12", "b13", "b14", "b15", "b16", "b17", "b18", "b19", "b20", "b21"]),
    phase("mixed", "Pattern mixing", "Combine sorting, hashing, windows and pointers on problems that do not announce the technique.", ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12"]),
  ],
  problems: arrayStringProblems,
  reruns: [
    { after: "24–48 hours", problemIds: ["a11", "b6", "b14"], objective: "Rebuild the invariant and implementation without notes." },
    { after: "7 days", problemIds: ["b5", "b15", "b18", "b19", "b21"], objective: "Choose the pattern from the prompt and explain complexity aloud." },
    { after: "21 days", problemIds: ["c1", "c4", "c5", "c7", "c10"], objective: "Timed interview set: identify, code, test edge cases, then communicate trade-offs." },
  ],
  interviewChecklist: [
    "Clarify whether the input is sorted, whether values can be negative, and whether the result must be in-place.",
    "State the invariant before moving a pointer or changing the window.",
    "Test empty input, one item, duplicates, all equal values, negative values and already-sorted input.",
    "Give time and auxiliary-space complexity, including the cost of sorting or copied strings.",
    "After coding, dry-run one normal case and one boundary case without reading the solution.",
  ],
});

const compactRoadmap = (
  goal: string,
  recognitionMap: MasteryRoadmap["recognitionMap"],
  phaseData: Array<[string, string, string, Array<[string, "Easy" | "Medium" | "Hard", string, string, string?]>]>,
  reruns: MasteryRoadmap["reruns"],
  interviewChecklist: string[],
): MasteryRoadmap => {
  const problems = phaseData.flatMap(([, , , entries]) => entries.map(([id, level, pattern, prompt, slug]) => problem(id, level, pattern, prompt, slug)));
  return roadmap({
    goal,
    doneWhen: [
      "I can identify the pattern from the constraint and wording before coding.",
      "I can state the state, transition or invariant and stopping condition.",
      "I can implement the core template from memory.",
      "I can re-solve representative problems after a gap and explain complexity.",
    ],
    recognitionMap,
    phases: phaseData.map(([id, title, focus, entries]) => phase(id, title, focus, entries.map(([problemId]) => problemId))),
    problems,
    reruns,
    interviewChecklist,
  });
};

const roadmaps: RoadmapEntry[] = [
  { lessonId: "arrays", roadmap: arraysAndStrings },
  { lessonId: "hash-tables", roadmap: compactRoadmap("Replace repeated scans with constant-time average lookup, frequency state, grouping keys and prefix-sum maps.", [
    { signal: "Need membership or duplicate detection.", pattern: "Set", tools: ["Set", "early return"] },
    { signal: "Need counts, indices, complements or groups.", pattern: "Map", tools: ["Map", "frequency counter", "canonical key"] },
    { signal: "Need subarray totals with negatives allowed.", pattern: "Prefix sum + Map", tools: ["running sum", "Map of counts"] },
  ], [
    ["foundation", "Foundation", "Build membership and frequency habits.", [["h1", "Easy", "Set", "Detect duplicates in an array.", "contains-duplicate"], ["h2", "Easy", "Frequency", "Check whether two strings are anagrams.", "valid-anagram"]]],
    ["core", "Core hashing", "Use complements, canonical keys and prefix sums.", [["h3", "Medium", "Complement", "Return indices of two values that sum to a target.", "two-sum"], ["h4", "Medium", "Grouping", "Group words by anagram signature.", "group-anagrams"], ["h5", "Medium", "Prefix + Map", "Count subarrays with sum equal to K.", "subarray-sum-equals-k"]]],
  ], [
    { after: "48 hours", problemIds: ["h3", "h5"], objective: "Explain why the current item is checked before insertion." },
    { after: "14 days", problemIds: ["h2", "h4"], objective: "Compare a sorted canonical key with a frequency signature." },
  ], ["Mention average versus worst-case hash complexity.", "Explain the key invariant and what the map stores.", "Test repeated values, empty input and negative numbers."]) },
  { lessonId: "two-pointers", roadmap: compactRoadmap("Use pointer movement to eliminate impossible pairs or transform an array in one pass while preserving an invariant.", [
    { signal: "Sorted input and a pair or triplet condition.", pattern: "Opposite ends", tools: ["left / right", "sort", "move smaller side"] },
    { signal: "Need in-place filtering or compaction.", pattern: "Slow / fast", tools: ["read", "write", "stable order"] },
    { signal: "Need to compare mirrored characters.", pattern: "Palindrome pointers", tools: ["left / right", "skip predicate"] },
  ], [
    ["foundation", "Pointer mechanics", "Move and compare from opposite ends.", [["p1", "Easy", "Palindrome", "Check a string from both ends.", "valid-palindrome"], ["p2", "Medium", "Compaction", "Remove duplicates from a sorted array.", "remove-duplicates-from-sorted-array"]]],
    ["core", "Pair and water patterns", "Use sorted movement and a provable greedy choice.", [["p3", "Medium", "Pair sum", "Find two values in sorted input that sum to a target."], ["p4", "Medium", "Container", "Maximise water between two vertical lines.", "container-with-most-water"], ["p5", "Medium", "Triplets", "Find unique triplets whose sum is zero.", "3sum"]]],
  ], [
    { after: "3 days", problemIds: ["p3", "p4"], objective: "Say exactly why the discarded side cannot produce a better answer." },
    { after: "21 days", problemIds: ["p2", "p5"], objective: "Solve in-place and explain duplicate handling." },
  ], ["Name the invariant before moving either pointer.", "Distinguish stable compaction from swapping.", "State the cost of sorting when it is part of the solution."]) },
  { lessonId: "sliding-window", roadmap: compactRoadmap("Maintain the smallest state needed for a contiguous segment, expanding and shrinking it without rescanning.", [
    { signal: "Exactly K consecutive items.", pattern: "Fixed window", tools: ["enter item", "remove item", "running total"] },
    { signal: "Longest valid segment.", pattern: "Variable window", tools: ["right expands", "left repairs", "best length"] },
    { signal: "Minimum segment containing requirements.", pattern: "Need / have counts", tools: ["Map", "formed count", "shrink"] },
  ], [
    ["foundation", "Fixed windows", "Update a window in O(1) per move.", [["w1", "Medium", "Fixed sum", "Find the maximum sum of a subarray of size K."], ["w2", "Medium", "Fixed average", "Find the maximum average of a subarray of size K.", "maximum-average-subarray-i"]]],
    ["core", "Variable windows", "Maintain validity while left catches up with right.", [["w3", "Medium", "Distinct state", "Find the longest substring without repeating characters.", "longest-substring-without-repeating-characters"], ["w4", "Medium", "Replacement budget", "Find the longest substring after at most K replacements.", "longest-repeating-character-replacement"], ["w5", "Hard", "Minimum cover", "Find the minimum window containing another string.", "minimum-window-substring"]]],
  ], [
    { after: "48 hours", problemIds: ["w1", "w3"], objective: "Write the enter/remove operations before coding." },
    { after: "14 days", problemIds: ["w4", "w5"], objective: "Explain why the window can be shrunk greedily." },
  ], ["Define what makes the current window valid.", "Show when and why the left pointer moves.", "Test K = 1, K = n, no valid window and repeated characters."]) },
  { lessonId: "prefix-sums-difference-arrays", roadmap: compactRoadmap("Turn repeated range or subarray queries into constant-time lookups by carrying the right running state.", [
    { signal: "Many immutable range-sum queries.", pattern: "Prefix array", tools: ["running sum", "prefix[r + 1] - prefix[l]"] },
    { signal: "Count subarrays meeting a sum with negative values.", pattern: "Prefix + Map", tools: ["running sum", "needed prefix", "frequency"] },
    { signal: "Many interval additions before one final read.", pattern: "Difference array", tools: ["boundary updates", "final prefix"] },
  ], [
    ["foundation", "Prefix mechanics", "Build and query a prefix array without off-by-one errors.", [["s1", "Easy", "Range sum", "Answer inclusive range sums after one preprocessing pass."], ["s2", "Medium", "Product prefix", "Return product of every element except self.", "product-of-array-except-self"]]],
    ["core", "Prefix state", "Use a map of earlier prefixes and boundary deltas.", [["s3", "Medium", "Prefix + Map", "Count subarrays whose sum equals K.", "subarray-sum-equals-k"], ["s4", "Medium", "Difference array", "Apply interval increments and return the final array."]]],
  ], [
    { after: "3 days", problemIds: ["s1", "s3"], objective: "Derive the query formula from the prefix definition." },
    { after: "14 days", problemIds: ["s2", "s4"], objective: "Choose between prefix, difference and direct traversal." },
  ], ["Write the meaning of prefix[i] before using it.", "Call out whether negative values are allowed.", "Check empty ranges, boundaries and inclusive versus exclusive endpoints."]) },
  { lessonId: "palindromes", roadmap: compactRoadmap("Recognise mirrored character structure and choose two pointers, centre expansion, frequency counting or DP instead of brute force.", [
    { signal: "Compare both ends with optional skipping.", pattern: "Two-pointer palindrome", tools: ["left / right", "skip one"] },
    { signal: "Need the longest or count of palindromic substrings.", pattern: "Centre expansion", tools: ["odd centres", "even gaps", "best length"] },
    { signal: "Build the longest palindrome from a character multiset.", pattern: "Frequency / greedy", tools: ["Map", "pairs", "one odd centre"] },
  ], [
    ["foundation", "Mirror checks", "Handle normalised and almost-palindromes.", [["t1", "Easy", "Palindrome", "Check a string while ignoring non-alphanumeric characters.", "valid-palindrome"], ["t2", "Medium", "One deletion", "Allow at most one deleted character.", "valid-palindrome-ii"]]],
    ["core", "Palindrome construction", "Count usable pairs and expand around every centre.", [["t3", "Medium", "Frequency", "Build the longest palindrome from given characters.", "longest-palindrome"], ["t4", "Hard", "Expansion", "Return the longest palindromic substring.", "longest-palindromic-substring"]]],
  ], [
    { after: "72 hours", problemIds: ["t2", "t4"], objective: "Handle both odd and even centres without slicing inside the loop." },
    { after: "21 days", problemIds: ["t3"], objective: "Explain why at most one odd count can occupy the centre." },
  ], ["Try both odd centres and gaps between characters.", "State whether substring, subsequence or rearrangement is required.", "Avoid repeated slicing that changes the claimed complexity."]) },
  { lessonId: "binary-search", roadmap: compactRoadmap("Use a monotonic predicate to eliminate half the search space and stop on the correct boundary.", [
    { signal: "Sorted values and exact lookup.", pattern: "Classic binary search", tools: ["lo / hi", "mid", "discard half"] },
    { signal: "Find first or last valid position.", pattern: "Boundary search", tools: ["lower bound", "upper bound", "answer invariant"] },
    { signal: "Minimise or maximise a value subject to a monotonic feasibility test.", pattern: "Binary search on answer", tools: ["feasible(x)", "bounds", "monotonicity"] },
  ], [
    ["foundation", "Template", "Write a loop with a clear inclusive or half-open interval.", [["bs1", "Easy", "Exact search", "Find a target in sorted input."], ["bs2", "Medium", "Boundary", "Find the first position at least target."]]],
    ["core", "Search on answer", "Binary search a numeric answer and prove feasibility is monotonic.", [["bs3", "Medium", "Capacity", "Split work into at most K groups while minimising the largest sum."], ["bs4", "Medium", "Speed", "Find the minimum rate needed to finish work by a deadline."]]],
  ], [
    { after: "48 hours", problemIds: ["bs1", "bs2"], objective: "Write the invariant and test one-element intervals." },
    { after: "14 days", problemIds: ["bs3", "bs4"], objective: "Define the feasibility predicate before writing binary search." },
  ], ["Say what is known to be valid and invalid at every iteration.", "Avoid integer overflow and infinite loops in midpoint calculation.", "Test target absent, one element, duplicates and boundary answers."]) },
  { lessonId: "monotonic-stack-queue", roadmap: compactRoadmap("Use a stack or deque to keep unresolved candidates in monotonic order so each item is pushed and popped once.", [
    { signal: "Need the next greater or smaller item.", pattern: "Monotonic stack", tools: ["indices", "pop while violated", "answer array"] },
    { signal: "Need a maximum/minimum over every fixed window.", pattern: "Monotonic deque", tools: ["remove expired indices", "front is best"] },
    { signal: "Nested delimiters or undo order.", pattern: "Stack simulation", tools: ["push", "pop", "matching state"] },
  ], [
    ["foundation", "Stack invariants", "Use LIFO state for matching and next-element questions.", [["st1", "Easy", "Stack", "Validate a string of brackets."], ["st2", "Medium", "Next greater", "Find the next greater element for each item."]]],
    ["core", "Monotonic structures", "Keep only candidates that can still win a future query.", [["st3", "Medium", "Daily temperatures", "Find days until a warmer temperature."], ["st4", "Hard", "Window maximum", "Return the maximum in each sliding window."]]],
  ], [
    { after: "3 days", problemIds: ["st2", "st3"], objective: "Explain what a popped index has learned permanently." },
    { after: "21 days", problemIds: ["st4"], objective: "Rebuild the deque with expiry and dominance rules." },
  ], ["Store indices when distance or expiry matters.", "State the monotonic direction and the pop condition.", "Account for every push and pop to justify O(n)."]) },
  { lessonId: "linked-list-patterns", roadmap: compactRoadmap("Recognise pointer topology and use sentinel nodes, fast/slow movement, reversal or merge invariants instead of indexing.", [
    { signal: "Need to find a midpoint or cycle.", pattern: "Fast / slow pointers", tools: ["slow", "fast", "meeting point"] },
    { signal: "Reverse links or process a list from the tail.", pattern: "Pointer reversal", tools: ["prev", "current", "next"] },
    { signal: "Merge sorted chains or remove a node near an edge.", pattern: "Sentinel / merge", tools: ["dummy", "tail", "lookahead"] },
  ], [
    ["foundation", "Pointer safety", "Use sentinels and preserve the next node before rewiring.", [["ll1", "Easy", "Reverse", "Reverse a singly linked list."], ["ll2", "Easy", "Merge", "Merge two sorted linked lists."]]],
    ["core", "Fast / slow", "Find cycles, middles and positional relationships.", [["ll3", "Easy", "Cycle", "Detect a cycle in a linked list."], ["ll4", "Medium", "Middle", "Remove the Nth node from the end."], ["ll5", "Medium", "Reorder", "Reorder a list by splitting, reversing and weaving."]]],
  ], [
    { after: "48 hours", problemIds: ["ll1", "ll3"], objective: "Draw pointers before changing any next link." },
    { after: "14 days", problemIds: ["ll4", "ll5"], objective: "Use a sentinel and explain the fast-pointer gap." },
  ], ["Draw the list and pointer targets for empty and one-node cases.", "Save next before rewiring.", "State whether the algorithm mutates nodes or allocates a new list."]) },
  { lessonId: "binary-trees", roadmap: compactRoadmap("Choose DFS or BFS from the required information, define the recursive state, and preserve tree invariants through traversal.", [
    { signal: "Need depth, path, subtree or postorder information.", pattern: "DFS", tools: ["base case", "return value", "recursive state"] },
    { signal: "Need level order, distance or nearest layer.", pattern: "BFS", tools: ["queue", "level size", "visited"] },
    { signal: "Ordered property on a binary search tree.", pattern: "BST invariant", tools: ["min / max bounds", "inorder", "pruning"] },
  ], [
    ["foundation", "Traversal", "Implement recursive and iterative preorder, inorder, postorder and level order.", [["tr1", "Easy", "DFS", "Return the maximum depth of a binary tree."], ["tr2", "Easy", "BFS", "Return level-order traversal of a tree."]]],
    ["core", "Tree state", "Carry bounds, paths and subtree answers through recursion.", [["tr3", "Medium", "BST", "Validate a binary search tree."], ["tr4", "Medium", "LCA", "Find the lowest common ancestor."], ["tr5", "Medium", "Path", "Find the maximum path sum."]]],
  ], [
    { after: "3 days", problemIds: ["tr1", "tr3"], objective: "Define the meaning of the recursive return value." },
    { after: "21 days", problemIds: ["tr4", "tr5"], objective: "Explain postorder decisions and null handling." },
  ], ["Name the traversal that matches the required output.", "State the base case before the recursive transition.", "Test null root, one child, skewed tree and duplicate values."]) },
  { lessonId: "heaps", roadmap: compactRoadmap("Use a heap when the problem repeatedly asks for the smallest/largest remaining item, top K, or a median under streaming updates.", [
    { signal: "Repeatedly extract the current minimum or maximum.", pattern: "Priority queue", tools: ["heap", "push", "pop"] },
    { signal: "Keep only K best or worst candidates.", pattern: "Top K", tools: ["heap of size K", "threshold"] },
    { signal: "Need the median of a stream.", pattern: "Two heaps", tools: ["max heap", "min heap", "balance"] },
  ], [
    ["foundation", "Heap mechanics", "Know the parent/child invariant and implement push/pop.", [["hp1", "Medium", "Kth largest", "Find the Kth largest value using a heap."], ["hp2", "Medium", "Top K", "Return the K most frequent values."]]],
    ["core", "Streaming state", "Combine heaps or heap ordering with a second constraint.", [["hp3", "Hard", "Median", "Maintain the median while values arrive."], ["hp4", "Medium", "Merge", "Merge K sorted lists using a min heap."]]],
  ], [
    { after: "72 hours", problemIds: ["hp1", "hp2"], objective: "Choose min versus max heap from the retained side." },
    { after: "21 days", problemIds: ["hp3", "hp4"], objective: "Explain heap size and balance invariants." },
  ], ["State what the heap contains, not just what it returns.", "Give O(log n) insertion/extraction and O(k) or O(n) space honestly.", "Test K = 1, K = n and duplicate priorities."]) },
  { lessonId: "backtracking", roadmap: compactRoadmap("Explore a decision tree with choose, recurse, un-choose, pruning branches that cannot produce a valid answer.", [
    { signal: "Enumerate combinations, permutations or subsets.", pattern: "Decision tree", tools: ["path", "start index", "backtrack"] },
    { signal: "Place values under row/column/diagonal constraints.", pattern: "Constraint backtracking", tools: ["used sets", "prune", "restore"] },
    { signal: "A board path must not reuse cells.", pattern: "Grid DFS", tools: ["visited", "restore", "directions"] },
  ], [
    ["foundation", "Template", "Write the state, choices, base case and undo step.", [["bt1", "Easy", "Subsets", "Generate all subsets."], ["bt2", "Medium", "Combinations", "Generate combinations of size K."]]],
    ["core", "Pruning", "Use constraints to cut impossible branches early.", [["bt3", "Medium", "Permutations", "Generate all permutations."], ["bt4", "Medium", "Grid", "Find words in a character board."], ["bt5", "Hard", "Queens", "Place queens without attacks."]]],
  ], [
    { after: "48 hours", problemIds: ["bt1", "bt3"], objective: "Trace one branch and every undo operation." },
    { after: "21 days", problemIds: ["bt4", "bt5"], objective: "Explain the pruning rule and worst-case branching." },
  ], ["Separate the immutable input from the mutable path state.", "State the base case and when a result is copied.", "Estimate branching and depth; mention pruning separately."]) },
  { lessonId: "dp-intro", roadmap: compactRoadmap("Recognise overlapping subproblems and optimal substructure, define a state and transition, then compress memory only after correctness.", [
    { signal: "Count or optimise choices over a line.", pattern: "1-D DP", tools: ["dp[i]", "base cases", "rolling state"] },
    { signal: "Choices depend on two positions or capacities.", pattern: "2-D DP", tools: ["dp[i][j]", "transition", "table order"] },
    { signal: "State is a subset of a small n.", pattern: "Bitmask DP", tools: ["mask", "transition", "2^n"] },
  ], [
    ["foundation", "State and transition", "Turn recursion into memoisation and tabulation.", [["dp1", "Easy", "1-D DP", "Count ways to climb stairs."], ["dp2", "Medium", "Choices", "Maximise non-adjacent house loot."]]],
    ["core", "Grid and sequences", "Use 2-D state and optimise space when dependencies allow.", [["dp3", "Medium", "Grid", "Find the minimum path sum in a grid."], ["dp4", "Medium", "Sequence", "Find the longest increasing subsequence."], ["dp5", "Hard", "Two strings", "Find the edit distance between two strings."]]],
  ], [
    { after: "3 days", problemIds: ["dp1", "dp2"], objective: "Write the recursive definition before the table." },
    { after: "21 days", problemIds: ["dp4", "dp5"], objective: "Explain state dimensions, transition and table order." },
  ], ["Define dp[state] in one sentence.", "List base cases and dependencies before coding.", "Compare memoisation, tabulation and space complexity."]) },
  { lessonId: "greedy", roadmap: compactRoadmap("Choose a locally optimal action only after identifying an exchange argument, a deadline ordering, or a monotonic resource invariant.", [
    { signal: "Intervals must be selected without overlap.", pattern: "Earliest finish", tools: ["sort", "end time", "exchange argument"] },
    { signal: "A local choice preserves the best possible remaining capacity.", pattern: "Greedy invariant", tools: ["sort", "remaining resource", "proof"] },
    { signal: "Need to merge or sweep interval boundaries.", pattern: "Intervals / sweep line", tools: ["sort endpoints", "active count", "merge"] },
  ], [
    ["foundation", "Greedy proof", "Sort by the decision that leaves the most room.", [["gr1", "Medium", "Intervals", "Select the maximum number of non-overlapping intervals."], ["gr2", "Medium", "Jump reachability", "Determine whether the final index is reachable."]]],
    ["core", "Scheduling and merging", "Apply interval ordering, coverage and sweep-line state.", [["gr3", "Medium", "Merge", "Merge overlapping intervals."], ["gr4", "Medium", "Coverage", "Find the minimum arrows or points to cover intervals."], ["gr5", "Hard", "Scheduling", "Schedule tasks with deadlines for maximum value."]]],
  ], [
    { after: "72 hours", problemIds: ["gr1", "gr3"], objective: "State the exchange argument or invariant before coding." },
    { after: "21 days", problemIds: ["gr4", "gr5"], objective: "Compare greedy against DP and explain why greedy is valid." },
  ], ["Do not call a solution greedy without a proof idea.", "State the sort order and why it preserves optimality.", "Test touching intervals, nested intervals and already sorted input."]) },
  { lessonId: "graph-traversal", roadmap: compactRoadmap("Model relationships explicitly, choose BFS/DFS/topological traversal from the question, and track visited state to avoid repeated work.", [
    { signal: "Reachability, components or path existence.", pattern: "DFS / BFS", tools: ["adjacency list", "visited", "queue / stack"] },
    { signal: "Shortest path in an unweighted graph.", pattern: "BFS", tools: ["levels", "queue", "distance"] },
    { signal: "Prerequisites or dependency ordering.", pattern: "Topological sort", tools: ["indegree", "Kahn queue", "cycle detection"] },
  ], [
    ["foundation", "Traversal", "Represent a graph and visit each node/edge once.", [["gh1", "Easy", "Components", "Count connected components."], ["gh2", "Easy", "Grid BFS", "Count islands in a grid."]]],
    ["core", "Shortest and directed", "Use levels, indegrees and cycle detection.", [["gh3", "Medium", "BFS", "Find the shortest path in an unweighted graph."], ["gh4", "Medium", "Topo sort", "Return a valid course order."], ["gh5", "Medium", "Union-Find", "Connect and query components."]]],
  ], [
    { after: "48 hours", problemIds: ["gh1", "gh2"], objective: "Choose adjacency representation and visited timing." },
    { after: "21 days", problemIds: ["gh3", "gh4", "gh5"], objective: "Explain why BFS gives shortest unweighted distance or why a cycle blocks ordering." },
  ], ["State whether edges are directed, weighted or bidirectional.", "Mark visited at the correct time to avoid duplicate queue entries.", "Give O(V + E) for adjacency-list traversal."]) },
  { lessonId: "shortest-paths", roadmap: compactRoadmap("Match the shortest-path algorithm to edge weights and constraints instead of defaulting to BFS.", [
    { signal: "All edges have equal cost.", pattern: "BFS", tools: ["queue", "levels", "distance"] },
    { signal: "Non-negative weighted edges.", pattern: "Dijkstra", tools: ["min heap", "relaxation", "stale entry"] },
    { signal: "Negative edges or all-pairs distances.", pattern: "Bellman-Ford / Floyd-Warshall", tools: ["relax V-1 times", "matrix DP"] },
  ], [
    ["foundation", "Unweighted paths", "Build distance with BFS and recognise when it is invalid.", [["sp1", "Medium", "BFS", "Find shortest distance in an unweighted graph."], ["sp2", "Medium", "Grid", "Find the shortest path through a binary matrix."]]],
    ["core", "Weighted paths", "Relax edges with a heap and detect negative cycles.", [["sp3", "Medium", "Dijkstra", "Find network delay from one source."], ["sp4", "Hard", "Negative edges", "Find cheapest paths with a stop limit."], ["sp5", "Hard", "All pairs", "Compute shortest distances between every pair."]]],
  ], [
    { after: "3 days", problemIds: ["sp1", "sp3"], objective: "Choose the algorithm from the weight constraints." },
    { after: "21 days", problemIds: ["sp4", "sp5"], objective: "Explain relaxation and why a stale heap entry is harmless." },
  ], ["Inspect edge weights before selecting an algorithm.", "Define relaxation precisely.", "State time and space in terms of V and E."]) },
  { lessonId: "bit-manipulation", roadmap: compactRoadmap("Use a small set of bit identities and represent small subsets compactly, while handling JavaScript's signed 32-bit operators correctly.", [
    { signal: "Pairs cancel except one value.", pattern: "XOR", tools: ["^", "associativity", "zero identity"] },
    { signal: "Need set/test/clear or count bits.", pattern: "Bit identities", tools: ["&", "|", "<<", "x & (x - 1)"] },
    { signal: "n is around 20 and choices are subsets.", pattern: "Bitmask DP", tools: ["mask", "popcount", "2^n"] },
  ], [
    ["foundation", "Bit toolkit", "Memorise the identities and language-specific pitfalls.", [["bit1", "Easy", "XOR", "Find the single value when every other value appears twice."], ["bit2", "Easy", "Popcount", "Count set bits in an unsigned 32-bit number."], ["bit3", "Easy", "Missing", "Find the missing value from 0 through n."]]],
    ["core", "Masks and DP", "Use masks for sets, subsets and bounded state.", [["bit4", "Medium", "Reverse bits", "Reverse all bits in a 32-bit integer."], ["bit5", "Medium", "Bit DP", "Count set bits for every value from 0 through n."], ["bit6", "Medium", "Mask", "Find the maximum length concatenation with unique characters."]]],
  ], [
    { after: "48 hours", problemIds: ["bit1", "bit2", "bit3"], objective: "Explain the identity with a four-bit example." },
    { after: "21 days", problemIds: ["bit4", "bit6"], objective: "Handle signed shifts and state when BigInt is required." },
  ], ["Mention JavaScript's 32-bit signed conversion for bitwise operators.", "Use parentheses around bit comparisons.", "Test zero, the sign bit and duplicate values."]) },
];

export const dsaMasteryRoadmaps = new Map(roadmaps.map(({ lessonId, roadmap: value }) => [lessonId, value]));
