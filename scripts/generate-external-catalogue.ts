import { readFile, writeFile } from "node:fs/promises";

type Problem = { slug: string; title: string; leetcodeId: number; difficulty: "Easy" | "Medium" | "Hard"; pattern: string; track: string; tier: "core" | "extended"; url: string; order: number };

const steps = [
  ["basics", "Learn the basics"],
  ["sorting", "Learn Important Sorting Techniques"],
  ["arrays", "Solve Problems on Arrays"],
  ["hashing", "Hashing"],
  ["binary-search", "Binary Search"],
  ["strings", "Strings"],
  ["linked-list", "Learn LinkedList"],
  ["recursion", "Recursion"],
  ["bit-manipulation", "Bit Manipulation"],
  ["stack-queue", "Stack and Queues"],
  ["sliding-window", "Sliding Window & Two Pointer"],
  ["heaps", "Heaps"],
  ["greedy", "Greedy Algorithms"],
  ["binary-trees", "Binary Trees"],
  ["bst", "Binary Search Trees"],
  ["graphs", "Graphs"],
  ["dynamic-programming", "Dynamic Programming"],
  ["tries", "Tries"],
  ["advanced-strings", "Advanced Strings"],
  ["maths", "Maths"],
] as const;

function stepFor(problem: Problem): (typeof steps)[number] {
  const pattern = problem.pattern.toLowerCase();
  if (pattern.includes("array") || pattern.includes("pointer") || pattern.includes("window")) return steps[2];
  if (pattern.includes("hash")) return steps[3];
  if (pattern.includes("binary search")) return steps[4];
  if (pattern.includes("string")) return steps[5];
  if (pattern.includes("linked")) return steps[6];
  if (pattern.includes("recurs")) return steps[7];
  if (pattern.includes("bit")) return steps[8];
  if (pattern.includes("stack") || pattern.includes("queue")) return steps[9];
  if (pattern.includes("heap") || pattern.includes("priority")) return steps[11];
  if (pattern.includes("greedy") || pattern.includes("interval")) return steps[12];
  if (pattern.includes("tree") && pattern.includes("binary search")) return steps[14];
  if (pattern.includes("tree")) return steps[13];
  if (pattern.includes("graph") || pattern.includes("union")) return steps[15];
  if (pattern.includes("dynamic") || pattern.includes("dp")) return steps[16];
  if (pattern.includes("trie")) return steps[17];
  if (pattern.includes("sort")) return steps[1];
  if (pattern.includes("math")) return steps[19];
  return steps[0];
}

const companyTags: Record<number, string[]> = {
  1: ["Amazon", "Google", "Microsoft", "Meta", "Apple", "Bloomberg", "Zoho", "TCS", "Infosys"],
  11: ["Amazon", "Google", "Meta", "Microsoft", "Apple", "Bloomberg", "Adobe"],
  15: ["Amazon", "Meta", "Google", "Microsoft", "Apple", "Adobe", "Bloomberg", "Uber", "Oracle"],
  26: ["Amazon", "Google", "Meta", "Microsoft", "Bloomberg"],
  27: ["Apple", "Uber", "Microsoft", "Meta", "Amazon", "Google"],
  41: ["Amazon", "Apple", "Google", "Meta", "Microsoft", "Netflix"],
  42: ["Amazon", "Google", "Meta", "Microsoft", "Bloomberg", "Apple"],
  53: ["Amazon", "Google", "Meta", "Microsoft", "Zoho", "TCS", "Infosys"],
  128: ["Amazon", "Google", "Meta", "Microsoft"],
  169: ["Amazon", "Google", "Meta", "Microsoft", "Bloomberg"],
  189: ["Amazon", "Google", "Microsoft", "Meta", "Apple", "Zoho"],
  209: ["Amazon", "Google", "Microsoft", "Meta"],
  217: ["Amazon", "Google", "Microsoft", "Bloomberg", "Apple"],
  238: ["Amazon", "Meta", "Google", "Apple", "Microsoft", "Zoho"],
  268: ["Amazon", "Microsoft", "Zoho"],
  283: ["Amazon", "Microsoft", "Google", "Zoho"],
  560: ["Google", "Meta", "Microsoft", "LinkedIn"],
  1004: ["Amazon", "Google", "Meta", "Microsoft"],
};

function companiesFor(problem: Problem) {
  return (companyTags[problem.leetcodeId] ?? []).map((company) => ({
    company,
    confidence: "medium" as const,
    sourceUrl: "https://www.geeksforgeeks.org/gfg-academy/company-preparation/",
    sourceKind: "gfg" as const,
  }));
}

async function main(): Promise<void> {
  const raw = JSON.parse(await readFile("data/dsa-problems.json", "utf8")) as Problem[];
  const problems = raw.filter((problem) => problem.track === "main").toSorted((a, b) => a.order - b.order);
  const counts = new Map<string, number>();
  const questions = problems.map((problem, index) => {
  const [sectionId, section] = stepFor(problem);
  const sectionOrder = (counts.get(sectionId) ?? 0) + 1;
  counts.set(sectionId, sectionOrder);
  return {
    id: `a2z-${String(index + 1).padStart(3, "0")}`,
    sheetId: "striver-a2z",
    order: index + 1,
    section,
    category: problem.pattern,
    difficulty: problem.difficulty,
    title: problem.title,
    recognitionSignal: `Recognize the ${problem.pattern.toLowerCase()} pattern.`,
    prompt: problem.title,
    technique: problem.pattern,
    leetcodeId: problem.leetcodeId,
    localSlug: problem.slug,
    links: [
      { kind: "practice", label: "LeetCode", url: problem.url, scope: "item" as const },
      { kind: "article", label: "takeUforward A2Z catalogue", url: "https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet", scope: "hub" as const },
      { kind: "practice", label: "GFG practice hub", url: "https://www.geeksforgeeks.org/practice-problems/", scope: "hub" as const },
      { kind: "practice", label: "Code360 hub", url: "https://www.naukri.com/code360/problems", scope: "hub" as const },
      { kind: "practice", label: "HackerRank kit", url: "https://www.hackerrank.com/interview/interview-preparation-kit", scope: "hub" as const },
    ],
    companies: companiesFor(problem),
    priority: problem.tier === "core" ? "high" : "medium",
    notes: `A2Z section item ${sectionOrder}; local PrepOS problem match is ${problem.slug}.`,
    sourceCoverage: "partial",
  };
  });

  const output = {
  generatedAt: new Date().toISOString().slice(0, 10),
  source: "PrepOS local DSA catalogue aligned to the public takeUforward A2Z module order",
  sheets: [
    {
      id: "striver-a2z",
      title: "Striver A2Z",
      source: "takeUforward",
      sourceUrl: "https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet",
      description: "Basics to advanced topics, ordered by the A2Z learning path. Local matches are linked to PrepOS problems.",
      updatedAt: new Date().toISOString().slice(0, 10),
      moduleCount: 20,
      topicCount: 495,
      practiceProblemCount: 400,
      sourceSnapshot: "https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet",
      sections: steps.map(([, title]) => title),
      questions,
    },
  ],
  };

  await writeFile("data/dsa-external.json", `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Generated ${questions.length} A2Z-aligned questions.`);
}

void main();
