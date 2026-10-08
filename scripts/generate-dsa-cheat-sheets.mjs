import { readFile, writeFile } from "node:fs/promises";
import { EXAMPLES, MORE_PATTERNS, MORE_TREE, NEW_SHEETS, WORKFLOW } from "./dsa-cheat-sheets/extras.mjs";

const row = (pattern, recognitionSignal, typicalProblems, typicalComplexity, firstQuestion) => ({ pattern, recognitionSignal, typicalProblems, typicalComplexity, firstQuestion });
const choice = (signal, thinkFirst) => ({ signal, thinkFirst });

function sheet(id, title, description, patterns, decisionTree) {
  return { id, title, level: "Interview pattern", description, patterns, decisionTree };
}

const sheets = [
  sheet("sorting", "Sorting Algorithms", "Sort only when order unlocks a simpler scan, merge, or greedy choice.", [
    row("Comparison sort", "Need a total order and n is large enough that O(n log n) is acceptable.", "sort colors, kth via sort, merge intervals", "O(n log n)", "Does a later linear scan become obvious after sorting?"),
    row("Custom comparator", "The order is not numeric: intervals, strings, or multi-key records.", "merge intervals, largest number, meeting order", "O(n log n)", "Which field must be ordered first, and which is the tie-break?"),
    row("Counting / bucket", "Values sit in a small known range.", "sort colors, relative sort, top-k by count", "O(n + range)", "Is the value range small enough to count instead of compare?"),
    row("Dutch national flag", "Exactly three categories must be partitioned in place.", "sort colors", "O(n), O(1) extra", "Can low, mid, and high pointers separate the three groups?"),
    row("Merge of sorted runs", "Two or more inputs are already ordered.", "merge sorted arrays, merge k lists", "O(n) or O(n log k)", "Am I merging two runs, or k runs that need a heap?"),
    row("Sort then scan", "Duplicates, neighbors, or pairs become adjacent after ordering.", "3Sum, duplicates, closest pair", "O(n log n) + scan", "After sorting, can two pointers or one pass finish the problem?"),
  ], [
    choice("Three categories in one array?", "Dutch national flag"),
    choice("Small integer range?", "Counting sort"),
    choice("Already-sorted pieces to combine?", "Merge"),
    choice("Order makes neighbors or pairs obvious?", "Sort, then one scan"),
    choice("k sorted lists?", "Heap merge, not a full sort"),
    choice("Need the original indexes afterwards?", "Sort pairs of value and index"),
  ]),
  sheet("binary-search", "Binary Search", "Use it when the answer space is ordered and each guess discards half of it.", [
    row("Classic search", "A sorted array and you need an exact value or its index.", "binary search, first/last occurrence", "O(log n)", "Is the array sorted, and do I need the leftmost or rightmost hit?"),
    row("Lower / upper bound", "You need the first position where a predicate becomes true.", "insert position, first bad version", "O(log n)", "Can I define a monotonic true/false predicate?"),
    row("Rotated array", "A sorted array was rotated, so one side is still sorted.", "search in rotated, find minimum", "O(log n)", "Which half is still sorted, and is the target inside it?"),
    row("Answer on a range", "You binary search the answer, not an index.", "koko, capacity to ship, split array", "O(n log answer)", "If mid is feasible, should I search lower or higher?"),
    row("Matrix search", "Rows and columns are sorted, or each row is sorted.", "search a 2D matrix", "O(log(mn)) or O(m + n)", "Can I treat the matrix as one sorted array, or walk from a corner?"),
    row("Peak / boundary", "Neighbors tell you which direction increases.", "find peak, mountain array", "O(log n)", "Does the midpoint's neighbor point left or right?"),
  ], [
    choice("Sorted and looking for a value?", "Classic or bound search"),
    choice("Need the first true in a yes/no range?", "Binary search the predicate"),
    choice("One half of a rotated array is sorted?", "Compare mid with the ends"),
    choice("Min or max value that still works?", "Search the answer"),
    choice("Sorted rows and columns?", "Matrix binary search or staircase"),
    choice("Loop does not shrink?", "Check the mid update and inclusive bounds"),
  ]),
  sheet("two-pointers", "Two Pointers", "Two indexes move toward each other or in the same direction when the array has order or a pair structure.", [
    row("Opposite ends", "A sorted array and a pair target.", "two sum II, container with most water", "O(n)", "If the sum is too small, which pointer must move?"),
    row("Same direction", "Read and write, or a slow and fast scan of one array.", "remove duplicates, move zeroes", "O(n), O(1) extra", "What does the slow pointer represent when the fast pointer moves?"),
    row("Fast and slow", "A linked list cycle, or the middle of a list.", "cycle detection, middle node", "O(n)", "If fast moves twice as fast, where do they meet?"),
    row("Three pointers after sort", "A pair becomes a triplet once the array is sorted.", "3Sum, 3Sum closest", "O(n^2)", "After fixing one index, can two pointers finish the rest?"),
    row("Shrink a window from both sides", "The answer is a pair of boundaries, not every subarray.", "trapping rain water, container", "O(n)", "Which side is the limiting height or value?"),
    row("Partition", "Values must be rearranged around a pivot or condition.", "sort colors, partition list", "O(n)", "Which region is already correct, and which index is next?"),
  ], [
    choice("Sorted pair target?", "Start at both ends"),
    choice("In-place compaction?", "Read pointer and write pointer"),
    choice("Cycle in a linked list?", "Fast and slow"),
    choice("Triplet in a sorted array?", "Fix one, then two pointers"),
    choice("Water, area, or trapping?", "Move the smaller side"),
    choice("Need every subarray, not a pair?", "This is a sliding window, not two pointers"),
  ]),
  sheet("sliding-window", "Sliding Window", "The answer is a contiguous segment. Expand the right edge and shrink the left edge.", [
    row("Fixed window", "The segment length is exactly k.", "max sum of size k, average of size k", "O(n)", "Add the new right element and drop the element that fell out."),
    row("Variable longest", "Longest segment that still satisfies a constraint.", "longest substring without repeat, at most k zeros", "O(n)", "Expand while valid. When invalid, shrink until valid again."),
    row("Variable shortest", "Shortest segment that reaches a target.", "minimum window substring, shortest subarray with sum", "O(n)", "Shrink while the window still meets the target, and record the best."),
    row("Count of windows", "Count segments with a property, not just the best one.", "subarrays with k odd numbers", "O(n)", "Can at most k minus at most k-1 give exactly k?"),
    row("Frequency window", "The constraint is about character or value counts.", "anagrams, permutation in string", "O(n)", "What count makes the window valid, and when do I shrink?"),
    row("Monotonic window", "Each step needs the min or max inside the current window.", "sliding window maximum", "O(n)", "Can a deque drop indexes that can never be the answer?"),
  ], [
    choice("Length is exactly k?", "Fixed window"),
    choice("Longest under a constraint?", "Expand, then shrink when broken"),
    choice("Shortest that reaches a goal?", "Shrink while still valid"),
    choice("Exactly k, and at most k is easy?", "At most k minus at most k-1"),
    choice("Need min or max of every window?", "Deque of indexes"),
    choice("The segment does not have to be contiguous?", "This is not a window"),
  ]),
  sheet("stack", "Stack & Monotonic Stack", "A stack remembers unmatched work, nesting, or values waiting for a greater or smaller neighbor.", [
    row("Bracket matching", "Open and close symbols must nest correctly.", "valid parentheses", "O(n)", "What should be on top when this closer arrives?"),
    row("Min stack", "You need push, pop, and the current minimum in O(1).", "min stack", "O(1) each", "Can each node store the minimum below it?"),
    row("Next greater", "Every index wants the first larger or smaller value to its right.", "daily temperatures, next greater element", "O(n)", "While the stack top is beaten, it has found its answer."),
    row("Histogram area", "A bar's width runs until a shorter bar on both sides.", "largest rectangle", "O(n)", "When a shorter bar arrives, which stored bars are now finished?"),
    row("Monotonic queue", "A window needs its max or min, and old indexes expire.", "sliding window maximum", "O(n)", "Pop from the back if the new value dominates, and from the front if the index expired."),
    row("Expression / calculator", "Operators and signs depend on what is still open.", "basic calculator", "O(n)", "What value and sign are waiting for the current number?"),
  ], [
    choice("Nesting or matching pairs?", "Stack of openers"),
    choice("Current minimum with push and pop?", "Stack of value and running min"),
    choice("Next greater or smaller?", "Monotonic stack"),
    choice("Largest rectangle or span?", "Monotonic stack of indexes"),
    choice("Window max?", "Monotonic deque"),
    choice("The order does not depend on neighbors?", "A stack is probably the wrong tool"),
  ]),
  sheet("linked-list", "Linked List", "You cannot index backward. Use pointers, a dummy head, or a reversal.", [
    row("Dummy head", "The real head might be deleted or replaced.", "remove nth, merge two lists", "O(n)", "Does a dummy node remove the empty-head special case?"),
    row("Reverse", "The next pointers must point the other way.", "reverse list, reverse between", "O(n), O(1) extra", "Save next before you overwrite it."),
    row("Fast and slow", "You need the middle, or proof of a cycle.", "middle, cycle, cycle start", "O(n)", "Where does slow stand when fast finishes or they meet?"),
    row("Merge sorted lists", "Two ordered lists become one ordered list.", "merge two, merge k", "O(n) or O(n log k)", "Always take the smaller current head."),
    row("Reorder / split", "The list must be cut, reversed, and woven.", "reorder list, palindrome list", "O(n)", "Find the middle, reverse the second half, then merge."),
    row("Design node", "The structure itself is the problem: LRU, browser history.", "LRU cache, copy list with random pointer", "O(1) per operation", "Which pointers must move together on get and put?"),
  ], [
    choice("Head may change?", "Dummy node"),
    choice("Need the middle or a cycle?", "Fast and slow"),
    choice("Direction must flip?", "Reverse in place"),
    choice("Two sorted lists?", "Merge by smaller head"),
    choice("Palindrome or reorder?", "Split, reverse, merge"),
    choice("O(1) get and put by key?", "Hash map plus a doubly linked list"),
  ]),
  sheet("bits", "Bit Manipulation", "Use bits when the question is about parity, uniqueness, subsets of flags, or powers of two.", [
    row("XOR uniqueness", "Every value appears twice except one.", "single number", "O(n), O(1) extra", "Does XOR cancel pairs and leave the odd one out?"),
    row("Bit count", "You need how many 1-bits a number has.", "number of 1 bits, counting bits", "O(bits)", "Can n & (n - 1) drop the lowest set bit?"),
    row("Mask subsets", "Every subset of a small set of flags.", "subsets by mask", "O(2^n)", "Is n small enough that a mask is the state?"),
    row("Power of two", "Exactly one bit is set.", "power of two", "O(1)", "Is n > 0 and n & (n - 1) == 0?"),
    row("Shift and isolate", "A particular bit position matters.", "reverse bits, missing number", "O(bits)", "Which shift isolates the bit I need to test or move?"),
    row("Add without plus", "Carry is a bit operation.", "sum of two integers", "O(bits)", "XOR is the sum without carry. AND shifted is the carry."),
  ], [
    choice("Pairs cancel?", "XOR"),
    choice("Count set bits?", "n & (n - 1)"),
    choice("Exactly one bit set?", "Power-of-two test"),
    choice("Small set of choices?", "Bit mask"),
    choice("Need a specific bit?", "Shift and mask"),
    choice("The values are not integers or flags?", "Bits are the wrong model"),
  ]),
  sheet("backtracking", "Backtracking", "Build a candidate, recurse, then undo. The state must be restored.", [
    row("Subsets", "Include or skip each element, order does not matter.", "subsets, subsets II", "O(2^n)", "Did I decide for this index, and did I skip duplicates?"),
    row("Permutations", "Every order of the same elements.", "permutations", "O(n!)", "Which values are still unused?"),
    row("Combinations with a target", "Pick numbers that sum to a target.", "combination sum", "exponential", "Can I reuse a number, and from which index do I continue?"),
    row("Grid search", "A path on a board must match a word or constraint.", "word search, N-queens", "exponential", "What do I mark as visited, and when do I unmark it?"),
    row("Partition", "Split a string or array into valid pieces.", "palindrome partitioning", "exponential", "Where can the current piece end?"),
    row("Prune", "A branch cannot lead to a valid answer.", "N-queens, combination sum", "still exponential, fewer nodes", "What constraint lets me return before recursing?"),
  ], [
    choice("Include or skip, order ignored?", "Subsets"),
    choice("Every order?", "Permutations"),
    choice("Sum to a target?", "Combination sum"),
    choice("Path on a board?", "Mark, recurse, unmark"),
    choice("Split into valid parts?", "Choose the next cut"),
    choice("Forgot to undo a choice?", "The next branch is reading dirty state"),
  ]),
  sheet("heap", "Heap / Priority Queue", "A heap gives you the current best of k candidates without sorting everything.", [
    row("Top k", "You need the k largest or smallest, not the full order.", "kth largest, top k frequent", "O(n log k)", "Does a size-k heap keep the boundary value?"),
    row("K-way merge", "Several sorted inputs must be merged.", "merge k lists", "O(n log k)", "Is the heap holding the current head of each list?"),
    row("Two heaps median", "A stream needs the median after every insert.", "find median from stream", "O(log n) insert", "Are the two heap sizes balanced, and which side receives the next value?"),
    row("Scheduling", "The next event is the one with the smallest time or frequency.", "task scheduler, meeting rooms", "O(n log n)", "What is the next time a resource becomes free?"),
    row("Dijkstra frontier", "The next graph node is the one with the smallest distance.", "network delay, cheapest flights", "O((V + E) log V)", "Did I skip a stale heap entry whose distance is already worse?"),
    row("Lazy deletion", "An old heap entry is no longer valid.", "Dijkstra, sliding window with heap", "O(log n) per push", "Can I ignore an entry when its key no longer matches the current best?"),
  ], [
    choice("Only the k best?", "Size-k heap"),
    choice("Merge k sorted inputs?", "Heap of heads"),
    choice("Running median?", "Max-heap left, min-heap right"),
    choice("Next earliest event?", "Heap ordered by time"),
    choice("Shortest path with weights?", "Dijkstra frontier"),
    choice("Need the full sorted order?", "Sort, do not use a heap"),
  ]),
  sheet("greedy", "Greedy", "Take the local choice that cannot hurt the best future answer. Prove the exchange.", [
    row("Interval end time", "Pick the interval that frees the resource soonest.", "non-overlapping intervals, activity selection", "O(n log n)", "If I sort by end time, is the earliest finish always safe?"),
    row("Jump reach", "The farthest index you can reach decides whether you continue.", "jump game, jump game II", "O(n)", "What is the farthest reach inside the current jump?"),
    row("Gas circuit", "A route works only if the total is enough and no prefix goes negative.", "gas station", "O(n)", "If I fail at i, can every start before i also fail?"),
    row("Stock one pass", "The best sell is after the cheapest earlier buy.", "best time to buy and sell", "O(n)", "Is today a new low, or a better sell against the current low?"),
    row("Huffman / merge cost", "Always combine the two cheapest pieces.", "minimum cost to connect sticks", "O(n log n)", "Does a heap of current costs give the next merge?"),
    row("Exchange argument", "Swapping two adjacent choices never improves the answer.", "task order, fractional knapsack", "depends", "If I swap the greedy choice with another, does the result get worse or stay equal?"),
  ], [
    choice("Intervals that must not overlap?", "Sort by end"),
    choice("Can I reach the last index?", "Track farthest reach"),
    choice("Circular gas route?", "One pass, restart after a failure"),
    choice("One buy and one sell?", "Running minimum"),
    choice("Always merge the two smallest?", "Greedy heap"),
    choice("No proof that a local choice is safe?", "This is DP, not greedy"),
  ]),
  sheet("trees", "Trees", "Most tree answers are a traversal plus what each subtree returns to its parent.", [
    row("DFS return value", "The parent needs a summary of each child.", "depth, diameter, balanced", "O(n)", "What does this node return, and what does it compute from the children?"),
    row("Level order", "The answer is grouped by depth.", "level order, right side view", "O(n)", "Process one queue size at a time so levels stay separate."),
    row("BST property", "The inorder sequence is sorted, or a range limits each node.", "validate BST, kth smallest", "O(n)", "What lower and upper bound reach this node?"),
    row("Path through a node", "The best path may bend through the current node.", "diameter, max path sum", "O(n)", "What can be returned upward, and what is only a local answer?"),
    row("Build from traversals", "Preorder says the root. Inorder says the split.", "construct tree", "O(n)", "Where does the root sit in the inorder list?"),
    row("Parent and LCA", "Two nodes share the deepest ancestor that covers both.", "LCA, path to node", "O(n)", "Does this subtree contain the left target, the right target, or both?"),
  ], [
    choice("One number from each subtree?", "Postorder DFS"),
    choice("Answers grouped by depth?", "BFS"),
    choice("Sorted tree question?", "BST bounds or inorder"),
    choice("Best path may bend?", "Return one side, record both sides"),
    choice("Rebuild the tree?", "Root from preorder, split from inorder"),
    choice("Need both children to decide?", "The answer is at the node that sees both"),
  ]),
  sheet("tries", "Tries", "Share prefixes. Each edge is one character, and a node marks the end of a word.", [
    row("Insert and search", "Many words share prefixes and you need exact lookup.", "implement trie", "O(length)", "Does this node end a word, or only a prefix?"),
    row("Prefix count", "You need how many words start with a string.", "prefix count, autocomplete", "O(length)", "What counter increments on every node along the word?"),
    row("Wildcard", "A dot or missing character can be any edge.", "add and search word", "O(26^dots * length)", "On a wildcard, do I try every child?"),
    row("Word search II", "A board must spell words from a dictionary.", "word search II", "board times trie", "Does pruning happen when a trie node has no child?"),
    row("XOR trie", "The best pair is the one with the largest XOR.", "maximum XOR", "O(n * bits)", "At each bit, does the opposite bit exist?"),
    row("Delete carefully", "Removing a word must not delete a shared prefix.", "trie delete", "O(length)", "Which nodes become unused after this word is removed?"),
  ], [
    choice("Exact word or prefix?", "Trie node with an end mark"),
    choice("How many words share a prefix?", "Counts on the path"),
    choice("One character can be anything?", "Branch to every child"),
    choice("Dictionary on a board?", "Walk the board and the trie together"),
    choice("Maximum XOR?", "Binary trie of bits"),
    choice("Only one word and no prefixes?", "A hash set is enough"),
  ]),
  sheet("graphs", "Graphs (BFS/DFS)", "Model the items as nodes and the allowed moves as edges, then search.", [
    row("Grid DFS / BFS", "A cell connects to its neighbors.", "number of islands, flood fill", "O(rows * cols)", "What marks a cell so I never enter it twice?"),
    row("Clone or copy", "Nodes point at other nodes and you must copy the structure.", "clone graph", "O(V + E)", "Which map remembers the copy of a node I already created?"),
    row("Shortest in an unweighted graph", "Every edge has the same cost.", "word ladder, rotting oranges", "O(V + E)", "Is BFS the first time I reach the target?"),
    row("Cycle in a directed graph", "A course or task depends on other tasks.", "course schedule", "O(V + E)", "Am I in the current stack, or only already finished?"),
    row("Topological order", "A directed acyclic graph has a valid build order.", "course schedule II", "O(V + E)", "Whose indegree just became zero?"),
    row("Multi-source", "Several cells start at once.", "rotting oranges, walls and gates", "O(V + E)", "Did I put every source in the queue before searching?"),
  ], [
    choice("Connected cells or components?", "DFS or BFS with a visited set"),
    choice("Fewest steps, equal edge cost?", "BFS"),
    choice("Can I finish every course?", "Cycle check"),
    choice("A valid order of tasks?", "Topological sort"),
    choice("Several starts at time zero?", "Multi-source BFS"),
    choice("Edges have different weights?", "Dijkstra, not plain BFS"),
  ]),
  sheet("advanced-graphs", "Advanced Graphs", "Weighted edges, unions, and shortest paths that plain BFS cannot answer.", [
    row("Dijkstra", "Non-negative weights and a shortest path.", "network delay, cheapest path", "O((V + E) log V)", "Did I pop a stale distance?"),
    row("Bellman-Ford", "Edges may be negative, or you need a negative cycle.", "cheapest flights with k stops", "O(k * E)", "Do I relax edges at most k times?"),
    row("Union-find", "Components merge, and you need which group a node is in.", "accounts merge, redundant connection", "almost O(1)", "Did I union by rank and compress the parent?"),
    row("Minimum spanning tree", "Connect every node with the cheapest edge set.", "Kruskal, Prim", "O(E log E)", "Does this edge join two different components?"),
    row("0-1 BFS", "Edge weights are only 0 or 1.", "shortest path with optional walls", "O(V + E)", "Do zero-cost edges go to the front of the deque?"),
    row("State graph", "The node is not enough. The state includes fuel, stops, or keys.", "cheapest flights, open the lock", "O(state * edges)", "What extra field makes two visits different?"),
  ], [
    choice("Non-negative weights?", "Dijkstra"),
    choice("Negative edges or a hop limit?", "Bellman-Ford"),
    choice("Merge groups and detect same group?", "Union-find"),
    choice("Cheapest way to connect all nodes?", "MST"),
    choice("Weights are only 0 and 1?", "0-1 BFS"),
    choice("The same node can be visited in different conditions?", "Add that condition to the state"),
  ]),
  sheet("dp-1d", "1-D Dynamic Programming", "The answer for i depends on a few earlier answers. Write the recurrence before the loop.", [
    row("Climb / Fibonacci", "Ways to reach i from i-1 and i-2.", "climbing stairs", "O(n)", "What are the last two states?"),
    row("House robber", "Take this house or skip it.", "house robber, house robber II", "O(n)", "Does the circular case split into two ranges?"),
    row("Coin change", "The fewest coins, or the number of ways, to make an amount.", "coin change, coin change II", "O(amount * coins)", "Does order of coins matter for this question?"),
    row("Decode / word break", "A prefix is valid if some earlier prefix is valid.", "decode ways, word break", "O(n^2) or better", "Which earlier cut leaves a valid piece?"),
    row("LIS", "The longest chain ending at i.", "longest increasing subsequence", "O(n log n) with patience", "Do I need the sequence or only the length?"),
    row("Kadane as DP", "Best subarray ending here.", "maximum subarray, maximum product", "O(n)", "Do I extend the previous answer or start over?"),
  ], [
    choice("Only the previous one or two states?", "Rolling variables"),
    choice("Take or skip a house?", "Robber recurrence"),
    choice("Fewest coins?", "Min over the last coin"),
    choice("Number of ways, order ignored?", "Iterate coins outside the amount"),
    choice("Longest increasing chain?", "Patience sorting or O(n^2) ends-at"),
    choice("The state needs two indexes?", "This is 2D DP"),
  ]),
  sheet("dp-2d", "2-D Dynamic Programming", "Two sequences, a grid, or a range. The state is a pair.", [
    row("Grid paths", "A cell comes from the top or the left.", "unique paths", "O(rows * cols)", "What cells are blocked or out of bounds?"),
    row("Two strings", "Match, skip left, or skip right.", "LCS, edit distance", "O(n * m)", "Are the current characters equal?"),
    row("Knapsack", "Each item is taken or not, with a capacity.", "target sum, partition equal subset", "O(n * capacity)", "Does this item get one chance, so the capacity loop runs backward?"),
    row("Intervals / ranges", "A range splits into two smaller ranges.", "burst balloons", "O(n^3)", "Have smaller lengths already been solved?"),
    row("Stocks with state", "Day and whether you hold a share.", "buy and sell with cooldown", "O(n * states)", "What does holding, sold, or cooldown mean tomorrow?"),
    row("Palindrome span", "A span is a palindrome if its ends match and the inside is.", "longest palindromic substring", "O(n^2)", "Do I expand by length so the inside is ready?"),
  ], [
    choice("Move only right or down?", "Grid DP"),
    choice("Two strings?", "Match or edit"),
    choice("Items and a capacity?", "0/1 knapsack"),
    choice("A range splits in the middle?", "Interval DP by length"),
    choice("Hold, sell, or rest?", "Add that choice to the state"),
    choice("Only one index changes?", "Reduce it to 1D DP"),
  ]),
  sheet("intervals", "Intervals", "Sort intervals, then merge, insert, or choose by end time.", [
    row("Merge overlaps", "Touching or overlapping ranges become one.", "merge intervals", "O(n log n)", "Does the next start fall before the current end?"),
    row("Insert", "A new range may overlap several existing ranges.", "insert interval", "O(n)", "Which ranges end before it, overlap it, or start after it?"),
    row("Remove overlaps", "Keep the interval that ends sooner.", "non-overlapping intervals", "O(n log n)", "If they overlap, which end do I keep?"),
    row("Meeting rooms", "How many rooms, or whether one room is enough.", "meeting rooms", "O(n log n)", "Do I need a count of active meetings, or only a conflict?"),
    row("Sweep line", "Starts and ends are events on a line.", "how many are active", "O(n log n)", "Do I process an end before a start at the same time?"),
    row("Interval graph coloring", "The minimum rooms equals the maximum overlap.", "meeting rooms II", "O(n log n)", "Does a heap of end times free a room before the next start?"),
  ], [
    choice("Combine overlapping ranges?", "Sort by start and merge"),
    choice("Place one new range?", "Insert interval"),
    choice("Delete the fewest overlaps?", "Sort by end"),
    choice("One room enough?", "Any overlap"),
    choice("How many rooms?", "Sweep or a heap of end times"),
    choice("The ranges are not on a line?", "This is not an interval problem"),
  ]),
  sheet("segment-tree", "Segment Tree / BIT / Union-Find", "Use a tree or parent array when many range updates or group merges must be fast.", [
    row("Prefix sums first", "The array never changes and you need range sums.", "range sum query immutable", "O(1) after O(n)", "If nothing updates, a segment tree is unnecessary."),
    row("Fenwick tree", "Point updates and prefix sums.", "range sum with updates", "O(log n)", "Does index math stay 1-based?"),
    row("Segment tree sum", "Range sum with point or range updates.", "mutable range sum", "O(log n)", "What does this node store, and how do children combine?"),
    row("Lazy range update", "A whole segment gets the same update.", "range add, range assign", "O(log n)", "Did I push the lazy tag before going deeper?"),
    row("Union-find", "Groups merge and you ask whether two items are connected.", "number of provinces, redundant connection", "almost O(1)", "Find the root, then union the roots."),
    row("Segment tree of ranges", "The stored value is a min, max, or count, not a sum.", "range minimum query", "O(log n)", "Is the combine function associative?"),
  ], [
    choice("No updates?", "Prefix sums"),
    choice("Point update and prefix sum?", "Fenwick tree"),
    choice("Range update?", "Lazy segment tree"),
    choice("Are these two connected after merges?", "Union-find"),
    choice("Range minimum?", "Segment tree of minima"),
    choice("Only one query?", "A scan is enough"),
  ]),
  sheet("math", "Math & Geometry", "Look for a formula, a modulo rule, or a geometry invariant before searching.", [
    row("Modulo arithmetic", "The answer is huge and only the remainder matters.", "pow(x, n), counting under mod", "O(log n) for powers", "Do I reduce after every multiply?"),
    row("GCD and primes", "Divisors, coprime numbers, or sieves.", "gcd, count primes", "sieve O(n log log n)", "Is a sieve cheaper than testing each number?"),
    row("Matrix geometry", "Rotate, spiral, or set a row and column.", "rotate image, spiral matrix, set zeroes", "O(n^2)", "Can I rotate by layers or by a transpose and a reverse?"),
    row("Coordinates", "Points, distances, or squares.", "detect squares, k closest", "depends", "What coordinate pair identifies the shape?"),
    row("Fast power", "Multiply an exponent by squaring.", "pow(x, n)", "O(log n)", "How do I handle a negative exponent?"),
    row("Overflow and bounds", "Intermediate sums exceed 32-bit integers.", "reverse integer", "O(digits)", "Do I check the bound before multiplying by ten?"),
  ], [
    choice("Only the remainder matters?", "Modulo after every operation"),
    choice("Many primality checks?", "Sieve"),
    choice("Rotate a matrix?", "Layers, or transpose then reverse"),
    choice("Walk a matrix in order?", "Spiral boundaries"),
    choice("Huge exponent?", "Binary exponentiation"),
    choice("The shape is a graph of cells?", "Treat it as a graph instead"),
  ]),
  sheet("design", "Design (Coding)", "The class is the problem. Name the operations, then pick the structure that makes each one cheap.", [
    row("Hash map plus list", "Get and put by key, and order matters.", "LRU cache", "O(1)", "Which structure remembers recency, and which finds the node?"),
    row("Two stacks", "A queue made from stacks, or a min stack.", "min stack, queue using stacks", "amortized O(1)", "When do I move items from one stack to the other?"),
    row("Heap plus map", "Fast lookup and fast removal of the best item.", "stock price tracker, lazy heap", "O(log n)", "How do I delete a key that is not at the top?"),
    row("Trie or nested map", "Keys are words or paths.", "file system, autocomplete", "O(length)", "What does each node store besides its children?"),
    row("Snapshot / version", "Old versions must stay readable.", "snapshot array", "depends", "Do I store every version, or only the changes?"),
    row("Capacity and eviction", "The structure has a maximum size.", "LRU, LFU", "O(1) target", "What exactly is evicted when the capacity is full?"),
  ], [
    choice("O(1) get and put with recency?", "Hash map and doubly linked list"),
    choice("Current minimum?", "Stack of running mins"),
    choice("Always remove the best score?", "Heap, with a map if you must delete arbitrary keys"),
    choice("Word or path keys?", "Trie"),
    choice("Read an old version?", "Store changes by version"),
    choice("The operations are a one-off algorithm?", "This is not a design problem"),
  ]),
  sheet("basics", "Basics & Complexity", "Before a clever structure, check whether one pass and a clear complexity target are enough.", [
    row("One pass accumulator", "The answer is a sum, count, min, or max.", "running sum, missing number", "O(n)", "Can I update the answer while I scan?"),
    row("Index meaning", "The position itself carries information.", "find the duplicate, first missing positive", "O(n)", "Can the value be placed at its own index?"),
    row("Complexity budget", "The interviewer expects a target before code.", "any core problem", "state it first", "What is the best time and extra memory I can justify?"),
    row("Edge cases", "Empty input, one element, duplicates, and overflow.", "every implementation", "part of the design", "Which input breaks the happy path?"),
    row("In-place versus copy", "Extra memory may be forbidden.", "rotate, move zeroes", "O(1) extra", "Am I allowed a second array?"),
    row("Stable output order", "The problem cares which duplicate or index survives.", "first unique, remove duplicates", "O(n)", "Do I keep the first occurrence or the last?"),
  ], [
    choice("Sum, count, min, or max?", "One pass"),
    choice("Value range matches indexes?", "Place each value at its index"),
    choice("No extra memory?", "In-place pointers"),
    choice("Need a target before coding?", "Say time and space first"),
    choice("Empty or single-element input?", "Handle it before the loop"),
    choice("The scan is not enough?", "Pick a pattern sheet and start again"),
  ]),
];

const current = JSON.parse(await readFile("data/dsa-cheat-sheets.json", "utf8"));
const arrays = current.sheets.find((item) => item.id === "arrays");
if (!arrays) throw new Error("arrays cheat sheet is missing");
const byId = new Map([[arrays.id, arrays], ...sheets.map((item) => [item.id, item])]);
const order = ["basics", "sorting", "arrays", "binary-search", "two-pointers", "sliding-window", "stack", "linked-list", "bits", "backtracking", "heap", "greedy", "trees", "tries", "graphs", "advanced-graphs", "dp-1d", "dp-2d", "intervals", "segment-tree", "math", "design"];

/** Appends rows whose key is not already present, so re-running never duplicates the arrays sheet read from disk. */
const mergeBy = (key, base, extra = []) => [...base, ...extra.filter((item) => !base.some((existing) => existing[key] === item[key]))];

const enriched = order.map((id) => {
  const base = byId.get(id);
  const examples = EXAMPLES[id] ?? {};
  const patterns = mergeBy("pattern", base.patterns, MORE_PATTERNS[id]).map((p) => (examples[p.pattern] && !p.examples ? { ...p, examples: examples[p.pattern] } : p));
  return { ...base, patterns, decisionTree: mergeBy("signal", base.decisionTree, MORE_TREE[id]), workflow: WORKFLOW[id] };
});
for (const extra of NEW_SHEETS) {
  const { after, ...rest } = extra;
  const at = enriched.findIndex((item) => item.id === after);
  enriched.splice(at + 1, 0, { level: "Interview pattern", ...rest });
}
await writeFile("data/dsa-cheat-sheets.json", `${JSON.stringify({ sheets: enriched }, null, 2)}\n`);
console.log(`Wrote ${enriched.length} cheat sheets.`);
