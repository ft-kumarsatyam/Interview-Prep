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

type ExtractedItem = {
  module: string;
  slug: string;
  title: string;
  text: string;
  links: string[];
};

type OfficialItem = {
  slug: string;
  title: string;
  duration: string;
  category: string;
  video?: string;
  article?: string;
  leetcode?: string;
};

const modules = [
  "Beginner Problems",
  "Sorting",
  "Arrays",
  "Hashing",
  "Binary Search",
  "Strings (Basic and Medium)",
  "Recursion",
  "Linked-List",
  "Bit Manipulation",
  "Greedy Algorithms",
  "Sliding Window / 2 Pointer",
  "Stack / Queues",
  "Binary Trees",
  "Binary Search Trees",
  "Heaps",
  "Graphs",
  "Dynamic Programming",
  "Tries",
  "Strings (Advanced Algo)",
  "Maths",
] as const;

const hubs = {
  takeuforward: "https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet",
  gfg: "https://www.geeksforgeeks.org/practice-problems/",
  code360: "https://www.naukri.com/code360/problems",
  hackerrank: "https://www.hackerrank.com/interview/interview-preparation-kit",
} as const;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function difficulty(category: string, local: Problem | undefined): "Easy" | "Medium" | "Hard" {
  if (local) return local.difficulty;
  if (category.includes("hard")) return "Hard";
  if (category.includes("medium")) return "Medium";
  return "Easy";
}

async function main(): Promise<void> {
  const sourcePath = process.env.TUF_A2Z_HTML;
  if (!sourcePath) throw new Error("Set TUF_A2Z_HTML to the saved official DOM extraction.");
  const rawSource = await readFile(sourcePath, "utf8");
  const wrapped = JSON.parse(rawSource) as { result?: { value?: string } };
  const payload = (wrapped.result?.value ?? rawSource).replaceAll('\\"', '"');
  const domSource = process.env.TUF_A2Z_DOM;
  const domWrapped = domSource ? JSON.parse(await readFile(domSource, "utf8")) as { result?: { value?: string } } : undefined;
  const domItems = domWrapped ? JSON.parse(domWrapped.result?.value ?? "[]") as ExtractedItem[] : [];
  const moduleBySlug = new Map(domItems.map((item) => [item.slug, item.module]));
  const itemStart = /\[\d+,\d+,"(?:\\.|[^"\\])*","item","practice",/g;
  const parseArray = (start: number): unknown[] => {
    let depth = 0;
    let quoted = false;
    let escaped = false;
    for (let index = start; index < payload.length; index += 1) {
      const character = payload[index]!;
      if (quoted) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') quoted = false;
      } else if (character === '"') quoted = true;
      else if (character === "[") depth += 1;
      else if (character === "]") {
        depth -= 1;
        if (depth === 0) return JSON.parse(payload.slice(start, index + 1)) as unknown[];
      }
    }
    throw new Error("Could not parse an official A2Z item record.");
  };
  const official: OfficialItem[] = [];
  let match: RegExpExecArray | null;
  while ((match = itemStart.exec(payload))) {
    const record = parseArray(match.index);
    const metadata = record[7] as { category?: string };
    const stringOrUndefined = (value: unknown): string | undefined => typeof value === "string" ? value : undefined;
    const sourceUrls = record.slice(8, 14).map(stringOrUndefined).filter((value): value is string =>
      value !== undefined && (value.startsWith("http") || value.startsWith("/")),
    );
    official.push({
      slug: record[2] as string,
      title: record[5] as string,
      duration: record[6] as string,
      category: metadata.category ?? "official A2Z",
      video: sourceUrls.find((url) => url.includes("youtu")),
      article: sourceUrls.find((url) => url.includes("/blogs/")),
      leetcode: sourceUrls.find((url) => url.startsWith("https://leetcode.com/problems/")),
    });
  }
  const problems = JSON.parse(await readFile("data/dsa-problems.json", "utf8")) as Problem[];
  const mainProblems = problems.filter((problem) => problem.track === "main");
  const byTitle = new Map(mainProblems.map((problem) => [normalize(problem.title), problem]));
  const bySlug = new Map(mainProblems.map((problem) => [problem.slug, problem]));

  if (official.length !== 452) {
    throw new Error(`Expected 452 official A2Z practice items, found ${official.length}.`);
  }

  const moduleIndexes = official.map((item, index) => {
    const exact = moduleBySlug.get(item.slug);
    if (exact) return modules.indexOf(exact as (typeof modules)[number]);
    if (index >= 234 && index < 247) return modules.indexOf("Sliding Window / 2 Pointer");
    if (index >= 247 && index < 276) return modules.indexOf("Stack / Queues");
    for (let previous = index - 1; previous >= 0; previous -= 1) {
      const previousModule = moduleBySlug.get(official[previous]!.slug);
      if (previousModule) return modules.indexOf(previousModule as (typeof modules)[number]);
    }
    return 0;
  });
  const questions = official.map((item, index) => {
    const section = modules[moduleIndexes[index] ?? 0]!;
    const local = bySlug.get(item.slug) ?? byTitle.get(normalize(item.title));
    const category = item.category;
    const video = item.video;
    const article = item.article && new URL(item.article, "https://takeuforward.org").toString();
    const leetcode = item.leetcode;
    const practice = `https://takeuforward.org/practice/dsa/${item.slug}`;
    const links = [
      ...(practice ? [{ kind: "practice" as const, label: "takeUforward practice", url: practice, scope: "item" as const }] : []),
      ...(leetcode ? [{ kind: "practice" as const, label: "LeetCode", url: leetcode, scope: "item" as const }] : []),
      ...(video ? [{ kind: "video" as const, label: "takeUforward video", url: video, scope: "item" as const }] : []),
      ...(article ? [{ kind: "article" as const, label: "takeUforward article", url: article, scope: "item" as const }] : []),
      { kind: "practice" as const, label: "GFG practice hub", url: hubs.gfg, scope: "hub" as const },
      { kind: "practice" as const, label: "Code360 hub", url: hubs.code360, scope: "hub" as const },
      { kind: "practice" as const, label: "HackerRank kit", url: hubs.hackerrank, scope: "hub" as const },
    ];
    return {
      id: `a2z-${String(index + 1).padStart(3, "0")}`,
      sheetId: "striver-a2z",
      order: index + 1,
      section,
      category,
      difficulty: difficulty(category.toLowerCase(), local),
      title: item.title,
      recognitionSignal: `Recognize the ${category} signal.`,
      prompt: item.title,
      technique: local?.pattern ?? section,
      ...(local ? { leetcodeId: local.leetcodeId, localSlug: local.slug } : {}),
      links,
      companies: [],
      priority: local?.tier === "core" ? "high" : "medium",
      notes: "Imported from the official takeUforward sheet.",
      sourceCoverage: "exact" as const,
    };
  });

  const arrayQuestions = questions.filter((question) => question.section === "Arrays").map((question, index) => ({
    ...question,
    id: `array-${String(index + 1).padStart(2, "0")}`,
    sheetId: "array-learning",
    order: index + 1,
    section: index < 12 ? "Foundation" : index < 25 ? "Easy Reinforcement" : "Pattern Practice",
  }));

  const output = {
    generatedAt: new Date().toISOString().slice(0, 10),
    source: "Official takeUforward Striver A2Z sheet import",
    sheets: [
      {
        id: "striver-a2z",
        title: "Striver A2Z",
        source: "takeUforward",
        sourceUrl: hubs.takeuforward,
        description: "The official 452-practice-item A2Z order from takeUforward. Item links are preserved when published; other sources remain clearly marked as hubs.",
        updatedAt: new Date().toISOString().slice(0, 10),
        moduleCount: 20,
        topicCount: 495,
        practiceProblemCount: 452,
        sourceSnapshot: hubs.takeuforward,
        sections: [...modules],
        questions,
      },
      {
        id: "array-learning",
        title: "Array Learning Sheet",
        source: "PrepOS curated sheet from official A2Z Arrays",
        sourceUrl: hubs.takeuforward,
        description: "A simpler Array-first view with the same exact source links and Easy, Medium, and Hard layers.",
        updatedAt: new Date().toISOString().slice(0, 10),
        sections: ["Foundation", "Easy Reinforcement", "Pattern Practice"],
        questions: arrayQuestions,
      },
    ],
  };
  await writeFile("data/dsa-external.json", `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Imported ${questions.length} official A2Z items and ${arrayQuestions.length} Array items.`);
}

void main();
