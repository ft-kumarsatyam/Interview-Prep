import { z } from "zod";

/**
 * The assistant's read-only data tools. Each one is a view over an existing service; the planner picks
 * which to run for a question, the service layer runs them, and their output reaches the prompt as
 * capped, untrusted JSON. No tool can read resume or profile text, and none writes anything.
 */
export const TOOL_IDS = ["today", "streak", "stats", "reviews", "quizzes", "mistakes", "notes", "courses", "roadmaps", "jobs", "mocks", "targets", "settings", "app-guide"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export interface ToolSpec {
  label: string;
  /** What the planner reads to decide whether a question needs this tool. */
  description: string;
  /** Takes a search query (only `notes`). */
  takesQuery?: true;
  /** Cap on the tool's serialised output, so one tool cannot crowd out the others. */
  maxChars: number;
}

export const TOOLS: Record<ToolId, ToolSpec> = {
  today: { label: "Today's plan", description: "today's date, day kind, planned problems and theory subtopics, what is done, whether the quiz is unlocked or passed", maxChars: 3000 },
  streak: { label: "Streak", description: "current and best streak, freeze tokens, recent complete and missed days", maxChars: 1500 },
  stats: { label: "Progress stats", description: "totals: problems solved, sheet coverage, days complete, quizzes passed, mastered subtopics, per-track coverage, LeetCode counts", maxChars: 3000 },
  reviews: { label: "Revision queue", description: "solved problems due for spaced-repetition review today", maxChars: 1500 },
  quizzes: { label: "Quiz history", description: "recent daily and weekly quiz scores, attempts and pass/fail", maxChars: 2000 },
  mistakes: { label: "Weak spots", description: "questions answered wrong most often and the tracks they belong to", maxChars: 2500 },
  notes: { label: "Your notes", description: "search your authored lessons, subtopic notes and saved articles for a concept (needs a short search query)", takesQuery: true, maxChars: 4000 },
  courses: { label: "Courses", description: "course lessons completed", maxChars: 1500 },
  roadmaps: { label: "Roadmaps", description: "roadmaps joined and how far along each one is", maxChars: 1500 },
  jobs: { label: "Job applications", description: "tracked job applications: company, title, status, applied, follow-up and interview dates", maxChars: 2500 },
  mocks: { label: "Mock interviews", description: "mock interview sessions: type, date, status and score", maxChars: 1500 },
  targets: { label: "Target companies", description: "target companies, their tier and readiness score per area", maxChars: 2000 },
  settings: { label: "Settings", description: "plan dates, daily targets, quiz pass mark, timezone, notification choices (no secrets)", maxChars: 1500 },
  "app-guide": { label: "How PrepOS works", description: "how the app itself works: pages, the streak and quiz rules, the plan, where to find things", maxChars: 5000 },
};

export const MAX_TOOLS_PER_TURN = 4;

export const plannerSchema = z.object({
  tools: z
    .array(z.object({ name: z.enum(TOOL_IDS), query: z.string().trim().max(200).optional() }))
    .max(MAX_TOOLS_PER_TURN + 2),
});
export type ToolPlan = z.infer<typeof plannerSchema>["tools"];

/** Keep the first use of each tool, drop a notes call with no query, and cap the count. */
export function normalizePlan(plan: ToolPlan, question: string): ToolPlan {
  const seen = new Set<ToolId>();
  const out: ToolPlan = [];
  for (const t of plan) {
    if (seen.has(t.name)) continue;
    seen.add(t.name);
    out.push(t.name === "notes" ? { name: "notes", query: (t.query || question).slice(0, 200) } : { name: t.name });
    if (out.length >= MAX_TOOLS_PER_TURN) break;
  }
  return out;
}

const KEYWORDS: Array<[RegExp, ToolId]> = [
  [/\b(today|plan|todo|to-do|due today|left to do)\b/i, "today"],
  [/\bstreak|freeze|missed|in a row\b/i, "streak"],
  [/\b(stats|progress|how many|solved|coverage|leetcode|total)\b/i, "stats"],
  [/\b(review|revision|revise|spaced)\b/i, "reviews"],
  [/\bquiz(zes)?\b|\bscore/i, "quizzes"],
  [/\b(weak|mistake|wrong|struggl)/i, "mistakes"],
  [/\bcourse|lesson/i, "courses"],
  [/\broadmap/i, "roadmaps"],
  [/\b(job|application|applied|interview(s)? (with|at)|follow[- ]?up|offer|recruiter)/i, "jobs"],
  [/\bmock/i, "mocks"],
  [/\b(target|company|companies|readiness)\b/i, "targets"],
  [/\b(setting|timezone|notification|reminder)/i, "settings"],
  [/\b(how (do|does|can) i|where (is|do|can)|what is prepos|feature|page|button|work)\b/i, "app-guide"],
  [/\b(explain|what is|what are|difference|notes?|article)\b/i, "notes"],
];

/** A planner that needs no model: keyword matches, defaulting to today's plan and the app guide. */
export function fallbackPlan(question: string): ToolPlan {
  const hits = KEYWORDS.filter(([re]) => re.test(question)).map(([, id]) => ({ name: id }) as ToolPlan[number]);
  return normalizePlan(hits.length ? hits : [{ name: "today" }, { name: "app-guide" }], question);
}

/** Keys never sent to a model, whatever a service returns. */
const DENY_KEY = /resume|profile|password|secret|api_?key|email|phone|contact|cookie|^jd$|token$/i;
const MAX_STRING = 400;
const MAX_ARRAY = 25;

function prune(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (depth > 5) return "…";
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY).map((v) => prune(v, depth + 1));
    return value.length > MAX_ARRAY ? [...items, `…${value.length - MAX_ARRAY} more`] : items;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (DENY_KEY.test(k) || typeof v === "function") continue;
      out[k] = prune(v, depth + 1);
    }
    return out;
  }
  return null;
}

/** Serialise a tool result for the prompt: personal keys dropped, long strings and arrays cut, then capped at `maxChars`. */
export function compactJson(value: unknown, maxChars: number): string {
  const json = JSON.stringify(prune(value, 0));
  return json.length > maxChars ? `${json.slice(0, maxChars)}…(truncated)` : json;
}
