import { readFile, writeFile } from "node:fs/promises";

type Problem = {
  slug: string;
  title: string;
  leetcodeId: number;
  difficulty: "Easy" | "Medium" | "Hard";
  pattern: string;
  track: string;
  tier: "core" | "extended";
  url: string;
  order: number;
};

type Catalogue = {
  generatedAt: string;
  source: string;
  sheets: Array<Record<string, unknown>>;
};

const topicOrder = [
  "Arrays",
  "Strings",
  "Sorting",
  "Searching",
  "Matrix",
  "Hashing",
  "Two Pointer Technique",
  "Prefix Sum",
  "Linked List",
  "Recursion and Backtracking",
  "Tree",
  "Heap",
  "Stack",
  "Queue and Deque",
  "Dynamic Programming",
  "Greedy",
  "Graph",
  "Tries",
  "Bit Manipulation",
] as const;

const sourceUrl = "https://www.geeksforgeeks.org/courses/gfg-160-series";
const practiceHub = "https://www.geeksforgeeks.org/explore";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function difficulty(title: string, local: Problem | undefined): "Easy" | "Medium" | "Hard" {
  if (local) return local.difficulty;
  if (/minimum weight cycle|n-queen|sudoku|word break|alien dictionary|floyd|bellman|trapping rain|largest|maximum/i.test(title)) return "Hard";
  if (/rotate|search|sort|count|sum|merge|minimum|maximum|longest|stock|subarray|closest|distance|diameter/i.test(title)) return "Medium";
  return "Easy";
}

async function main(): Promise<void> {
  const sourcePath = process.env.GFG_160_TREE;
  if (!sourcePath) throw new Error("Set GFG_160_TREE to the saved public GfG 160 source tree JSON.");

  const tree = JSON.parse(await readFile(sourcePath, "utf8")) as { tree: Array<{ path: string; type: string }> };
  const items = tree.tree.flatMap((entry) => {
    const match = entry.path.match(/GFG - 160 \(([^)]+)\)\/Day (\d+) - (.+)\.md$/);
    return match ? [{ topic: match[1]!, day: Number(match[2]), title: match[3]!.trim() }] : [];
  });
  if (items.length !== 161) throw new Error(`Expected the current public GfG 160 source inventory, found ${items.length} items.`);

  const catalogue = JSON.parse(await readFile("data/dsa-external.json", "utf8")) as Catalogue;
  const problems = JSON.parse(await readFile("data/dsa-problems.json", "utf8")) as Problem[];
  const localProblems = problems.filter((problem) => problem.track === "main");
  const byTitle = new Map(localProblems.map((problem) => [normalize(problem.title), problem]));
  const ordered = items.toSorted((a, b) => topicOrder.indexOf(a.topic as (typeof topicOrder)[number]) - topicOrder.indexOf(b.topic as (typeof topicOrder)[number]) || a.day - b.day);
  const questions = ordered.map((item, index) => {
    const local = byTitle.get(normalize(item.title));
    return {
      id: `gfg160-${String(index + 1).padStart(3, "0")}`,
      sheetId: "gfg-160",
      order: index + 1,
      section: item.topic,
      category: `Day ${item.day}`,
      difficulty: difficulty(item.title, local),
      title: item.title,
      recognitionSignal: `Practice the ${item.topic} pattern from the GfG 160 sequence.`,
      prompt: item.title,
      technique: local?.pattern ?? item.topic,
      ...(local ? { leetcodeId: local.leetcodeId, localSlug: local.slug } : {}),
      links: [
        { kind: "practice" as const, label: "GfG 160 course", url: sourceUrl, scope: "hub" as const },
        { kind: "practice" as const, label: "GfG practice", url: practiceHub, scope: "hub" as const },
      ],
      companies: [],
      priority: local?.tier === "core" ? "high" as const : "medium" as const,
      notes: "Ordered from the public GfG 160 source inventory; exact per-question URLs are not inferred.",
      sourceCoverage: "hub-only" as const,
    };
  });

  const withoutGfg = catalogue.sheets.filter((sheet) => sheet.id !== "gfg-160");
  catalogue.sheets = [
    ...withoutGfg,
    {
      id: "gfg-160",
      title: "GfG 160",
      source: "GeeksforGeeks",
      sourceUrl,
      description: "The ordered GfG 160 practice sequence, grouped by topic. GfG currently advertises 160 handpicked problems; the public source inventory contains 161 named day records, which are preserved transparently here.",
      updatedAt: new Date().toISOString().slice(0, 10),
      moduleCount: topicOrder.length,
      topicCount: topicOrder.length,
      practiceProblemCount: questions.length,
      sourceSnapshot: sourceUrl,
      sections: [...topicOrder],
      questions,
    },
  ];
  catalogue.generatedAt = new Date().toISOString().slice(0, 10);
  await writeFile("data/dsa-external.json", `${JSON.stringify(catalogue, null, 2)}\n`);
  console.log(`Imported ${questions.length} GfG 160 items.`);
}

void main();
