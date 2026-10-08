import type { ContentProblem, ContentSheet } from "@/core/content";
import { companiesForQuestion, problemLeetcodeSlug, type CompanyDataset } from "@/modules/dsa/domain/company-tags";
import { EXTERNAL_DIFFICULTIES, type ExternalDifficulty, type ExternalLink, type ExternalProgress, type ExternalQuestion, type ExternalSheet } from "@/modules/dsa/domain/external-catalogue";

/** How the hub groups its cards. */
export const SHEET_GROUPS = ["Popular sheets", "Pattern and ladder sheets", "Company and package sheets"] as const;
export type SheetGroup = (typeof SHEET_GROUPS)[number];

export interface SheetCard {
  href: string;
  title: string;
  source: string;
  description: string;
  total: number;
  completed: number;
  topics: number;
  byDifficulty: Record<ExternalDifficulty, number>;
}

/** Hub cards grouped in display order: counts and progress only, so a page lists every sheet without sending its rows. */
export function sheetCardGroups(
  entries: readonly { sheet: ExternalSheet; group: SheetGroup }[],
  statuses: Readonly<Record<string, ExternalProgress>>,
): { title: SheetGroup; cards: SheetCard[] }[] {
  const cards = entries.map(({ sheet, group }) => {
    const byDifficulty = Object.fromEntries(EXTERNAL_DIFFICULTIES.map((d) => [d, 0])) as Record<ExternalDifficulty, number>;
    for (const q of sheet.questions) byDifficulty[q.difficulty] += 1;
    const card: SheetCard = {
      href: `/dsa/sheets/${sheet.id}`,
      title: sheet.title,
      source: sheet.source,
      description: sheet.description,
      total: sheet.questions.length,
      completed: sheet.questions.filter((q) => statuses[q.id] === "completed").length,
      topics: sheet.sections.length,
      byDifficulty,
    };
    return { group, card };
  });
  return SHEET_GROUPS.map((title) => ({ title, cards: cards.filter((c) => c.group === title).map((c) => c.card) })).filter((g) => g.cards.length > 0);
}

function problemLinks(problem: ContentProblem, video?: string): ExternalLink[] {
  const links: ExternalLink[] = [];
  if (problem.url) links.push({ kind: "practice", label: problem.url.includes("leetcode.com") ? "LeetCode" : "Problem", url: problem.url, scope: "item" });
  if (video) links.push({ kind: "video", label: "Video", url: video, scope: "item" });
  return links;
}

function localQuestion(sheetId: string, idPrefix: string, order: number, problem: ContentProblem, section: string, category: string, video?: string): ExternalQuestion {
  return {
    id: `${idPrefix}-${problem.slug}`,
    sheetId,
    order,
    section,
    category,
    difficulty: problem.difficulty,
    title: problem.title,
    localSlug: problem.slug,
    ...(problem.leetcodeId ? { leetcodeId: problem.leetcodeId } : {}),
    links: problemLinks(problem, video),
    companies: [],
    sourceCoverage: "exact",
  };
}

/** A PrepOS list sheet (Blind 75, NeetCode 150, Striver SDE...) in the shape the sheet browser reads. */
export function contentSheetAsExternal(sheet: ContentSheet, problemBySlug: ReadonlyMap<string, ContentProblem>, updatedAt: string): ExternalSheet {
  const seen = new Set<string>();
  const questions: ExternalQuestion[] = [];
  for (const item of sheet.items) {
    const problem = problemBySlug.get(item.slug);
    if (!problem || seen.has(item.slug)) continue;
    seen.add(item.slug);
    questions.push(localQuestion(sheet.id, sheet.id, questions.length + 1, problem, item.section, problem.pattern, item.video));
  }
  const sections = [...new Set(questions.map((q) => q.section))];
  return {
    id: sheet.id,
    title: sheet.name,
    source: sheet.source,
    sourceUrl: sheet.url,
    description: sheet.description,
    updatedAt,
    topicCount: sections.length,
    practiceProblemCount: questions.length,
    sections,
    questions,
  };
}

/**
 * The essential interview patterns, grouped the way hynts.in lists them. Each group lists LeetCode slugs in
 * learning order; only the ones PrepOS has are kept.
 */
export const ESSENTIAL_PATTERNS: readonly { name: string; slugs: readonly string[] }[] = [
  { name: "Fast and Slow Pointer", slugs: ["middle-of-the-linked-list", "linked-list-cycle", "happy-number", "linked-list-cycle-ii", "palindrome-linked-list", "remove-nth-node-from-end-of-list", "reorder-list", "find-the-duplicate-number"] },
  { name: "Overlapping Intervals", slugs: ["meeting-rooms", "merge-intervals", "insert-interval", "non-overlapping-intervals", "minimum-number-of-arrows-to-burst-balloons", "meeting-rooms-ii", "interval-list-intersections", "minimum-interval-to-include-each-query"] },
  { name: "Prefix Sum", slugs: ["running-sum-of-1d-array", "range-sum-query-immutable", "find-pivot-index", "product-of-array-except-self", "subarray-sum-equals-k", "contiguous-array", "continuous-subarray-sum", "subarray-sums-divisible-by-k", "range-sum-query-2d-immutable"] },
  { name: "Sliding Window", slugs: ["best-time-to-buy-and-sell-stock", "maximum-average-subarray-i", "longest-substring-without-repeating-characters", "minimum-size-subarray-sum", "longest-repeating-character-replacement", "permutation-in-string", "fruit-into-baskets", "minimum-window-substring", "sliding-window-maximum"] },
  { name: "Two Pointers", slugs: ["valid-palindrome", "move-zeroes", "remove-duplicates-from-sorted-array", "two-sum-ii-input-array-is-sorted", "3sum", "sort-colors", "container-with-most-water", "4sum", "trapping-rain-water"] },
  { name: "Cyclic Sort", slugs: ["missing-number", "find-all-numbers-disappeared-in-an-array", "set-mismatch", "find-all-duplicates-in-an-array", "find-the-duplicate-number", "first-missing-positive"] },
  { name: "In-place Linked List Reversal", slugs: ["reverse-linked-list", "reverse-linked-list-ii", "swap-nodes-in-pairs", "rotate-list", "reorder-list", "reverse-nodes-in-k-group"] },
  { name: "Matrix Manipulation", slugs: ["transpose-matrix", "set-matrix-zeroes", "rotate-image", "spiral-matrix", "spiral-matrix-ii", "valid-sudoku", "game-of-life", "search-a-2d-matrix"] },
  { name: "Breadth-First Search", slugs: ["binary-tree-level-order-traversal", "minimum-depth-of-binary-tree", "binary-tree-right-side-view", "rotting-oranges", "01-matrix", "shortest-path-in-binary-matrix", "walls-and-gates", "open-the-lock", "word-ladder"] },
  { name: "Depth-First Search", slugs: ["flood-fill", "path-sum", "number-of-islands", "max-area-of-island", "clone-graph", "surrounded-regions", "pacific-atlantic-water-flow", "course-schedule"] },
  { name: "Backtracking", slugs: ["subsets", "permutations", "combination-sum", "letter-combinations-of-a-phone-number", "generate-parentheses", "subsets-ii", "combination-sum-ii", "palindrome-partitioning", "word-search", "n-queens"] },
  { name: "Modified Binary Search", slugs: ["binary-search", "search-insert-position", "find-first-and-last-position-of-element-in-sorted-array", "search-in-rotated-sorted-array", "find-minimum-in-rotated-sorted-array", "find-peak-element", "koko-eating-bananas", "capacity-to-ship-packages-within-d-days", "time-based-key-value-store", "median-of-two-sorted-arrays"] },
  { name: "Bitwise XOR", slugs: ["single-number", "missing-number", "hamming-distance", "number-of-1-bits", "counting-bits", "reverse-bits", "single-number-ii", "single-number-iii", "sum-of-two-integers"] },
  { name: "Top K Elements", slugs: ["kth-largest-element-in-a-stream", "last-stone-weight", "kth-largest-element-in-an-array", "top-k-frequent-elements", "k-closest-points-to-origin", "sort-characters-by-frequency", "top-k-frequent-words", "task-scheduler", "reorganize-string"] },
  { name: "K-way Merge", slugs: ["merge-sorted-array", "merge-two-sorted-lists", "merge-k-sorted-lists", "kth-smallest-element-in-a-sorted-matrix", "find-k-pairs-with-smallest-sums", "smallest-range-covering-elements-from-k-lists"] },
  { name: "Two Heaps", slugs: ["find-median-from-data-stream", "sliding-window-median", "ipo", "kth-largest-element-in-a-stream", "last-stone-weight"] },
  { name: "Monotonic Stack", slugs: ["next-greater-element-i", "daily-temperatures", "online-stock-span", "next-greater-element-ii", "remove-k-digits", "car-fleet", "sum-of-subarray-minimums", "largest-rectangle-in-histogram", "maximal-rectangle"] },
  { name: "Trees", slugs: ["maximum-depth-of-binary-tree", "invert-binary-tree", "same-tree", "diameter-of-binary-tree", "subtree-of-another-tree", "lowest-common-ancestor-of-a-binary-tree", "validate-binary-search-tree", "kth-smallest-element-in-a-bst", "construct-binary-tree-from-preorder-and-inorder-traversal", "binary-tree-maximum-path-sum", "serialize-and-deserialize-binary-tree"] },
  { name: "Dynamic Programming", slugs: ["climbing-stairs", "house-robber", "house-robber-ii", "decode-ways", "coin-change", "maximum-product-subarray", "word-break", "longest-increasing-subsequence", "unique-paths", "longest-common-subsequence", "partition-equal-subset-sum", "edit-distance"] },
  { name: "Graphs", slugs: ["number-of-provinces", "is-graph-bipartite", "course-schedule-ii", "redundant-connection", "number-of-connected-components-in-an-undirected-graph", "graph-valid-tree", "network-delay-time", "cheapest-flights-within-k-stops", "min-cost-to-connect-all-points", "swim-in-rising-water", "alien-dictionary"] },
  { name: "Greedy", slugs: ["assign-cookies", "lemonade-change", "jump-game", "jump-game-ii", "gas-station", "hand-of-straights", "partition-labels", "merge-triplets-to-form-target-triplet", "valid-parenthesis-string", "candy"] },
  { name: "Design Data Structure", slugs: ["implement-queue-using-stacks", "min-stack", "design-hashmap", "implement-trie-prefix-tree", "design-add-and-search-words-data-structure", "insert-delete-getrandom-o1", "lru-cache", "time-based-key-value-store", "design-twitter", "lfu-cache"] },
];

export function patternSheet(problemBySlug: ReadonlyMap<string, ContentProblem>, updatedAt: string): ExternalSheet {
  const questions: ExternalQuestion[] = [];
  for (const group of ESSENTIAL_PATTERNS) {
    for (const slug of group.slugs) {
      const problem = problemBySlug.get(slug);
      if (problem) questions.push(localQuestion("essential-patterns", `pat-${ESSENTIAL_PATTERNS.indexOf(group) + 1}`, questions.length + 1, problem, group.name, problem.pattern));
    }
  }
  const sections = ESSENTIAL_PATTERNS.map((g) => g.name).filter((name) => questions.some((q) => q.section === name));
  return {
    id: "essential-patterns",
    title: "Essential DSA Patterns",
    source: "hynts.in pattern list, problems from PrepOS",
    sourceUrl: "https://hynts.in/preparation/",
    description: `${sections.length} recurring interview patterns, from Fast and Slow Pointer to Design Data Structure, each a short ladder from the first easy problem to the classic hard one.`,
    updatedAt,
    topicCount: sections.length,
    practiceProblemCount: questions.length,
    sections,
    questions,
  };
}

/**
 * Package tiers (approximate fresher / SDE-1 CTC in India) with the companies that usually pay in that band and
 * the difficulties their rounds lean on.
 */
export const PACKAGE_TIERS: readonly { name: string; companies: readonly string[]; difficulties: readonly ExternalDifficulty[] }[] = [
  { name: "3-5 LPA", companies: ["TCS", "Infosys", "Wipro", "Cognizant", "Capgemini", "Accenture", "HCL", "Tech Mahindra", "LTI", "MindTree", "Deloitte", "Virtusa"], difficulties: ["Easy"] },
  { name: "5-10 LPA", companies: ["Zoho", "IBM", "Amdocs", "Persistent Systems", "EPAM Systems", "Publicis Sapient", "HashedIn", "Josh Technology", "Siemens", "Nagarro", "MAQ Software", "Zopsmart"], difficulties: ["Easy", "Medium"] },
  { name: "10-20 LPA", companies: ["Samsung", "Paytm", "MakeMyTrip", "Ola Cabs", "Swiggy", "Zomato", "Myntra", "Meesho", "Accolite", "Juspay", "Tekion", "Sprinklr", "Media.net", "Oracle", "SAP", "Qualcomm", "Wells Fargo", "Morgan Stanley"], difficulties: ["Easy", "Medium"] },
  { name: "20-30 LPA", companies: ["Flipkart", "Walmart Labs", "PayPal", "Goldman Sachs", "Visa", "American Express", "PhonePe", "Intuit", "Adobe", "Cisco", "Nutanix", "ServiceNow", "Salesforce"], difficulties: ["Medium", "Hard"] },
  { name: "30-60 LPA", companies: ["Amazon", "Microsoft", "Atlassian", "Uber", "LinkedIn", "Apple", "Bloomberg", "DE Shaw", "Nvidia", "Rubrik", "Snowflake", "Arcesium"], difficulties: ["Medium", "Hard"] },
  { name: "60+ LPA", companies: ["Google", "Meta", "Netflix", "Databricks", "Stripe", "Citadel", "Jane Street", "Hudson River Trading", "Tower Research Capital", "Two Sigma", "Optiver", "OpenAI"], difficulties: ["Medium", "Hard"] },
];

/**
 * Problems per package tier: main-track problems the tier's companies asked, in the difficulties that tier
 * leans on, most asked first. A problem can sit in more than one tier.
 */
export function packageSheet(problems: readonly ContentProblem[], dataset: CompanyDataset, updatedAt: string, perTier = 50): ExternalSheet {
  const questions: ExternalQuestion[] = [];
  PACKAGE_TIERS.forEach((tier, ti) => {
    const wanted = new Set(tier.companies);
    const scored = problems.flatMap((problem) => {
      if (problem.track !== "main" || !tier.difficulties.includes(problem.difficulty)) return [];
      const asked = companiesForQuestion(dataset, problemLeetcodeSlug(problem)).filter((c) => wanted.has(c.company));
      const score = asked.reduce((sum, c) => sum + c.frequency, 0);
      return score > 0 ? [{ problem, asked, score }] : [];
    });
    scored.sort((a, b) => b.score - a.score || a.problem.order - b.problem.order);
    for (const { problem, asked } of scored.slice(0, perTier)) {
      questions.push({
        ...localQuestion("package-wise", `pkg-${ti + 1}`, questions.length + 1, problem, tier.name, asked[0].company),
        companies: asked.slice(0, 6).map((c) => ({ company: c.company, confidence: "medium", sourceKind: "leetcode" })),
      });
    }
  });
  const sections = PACKAGE_TIERS.map((t) => t.name).filter((name) => questions.some((q) => q.section === name));
  return {
    id: "package-wise",
    title: "Package-wise Sheet",
    source: "PrepOS, from community company tags",
    sourceUrl: "https://github.com/liquidslr/leetcode-company-wise-problems",
    description: "Problems grouped by the salary band of the companies that ask them (approximate fresher / SDE-1 CTC in India), most asked first. Bands are a rough guide, not offer data.",
    updatedAt,
    topicCount: sections.length,
    practiceProblemCount: questions.length,
    sections,
    questions,
  };
}
