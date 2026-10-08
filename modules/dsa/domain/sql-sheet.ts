import type { ContentProblem } from "@/core/content";
import type { DbChallenge } from "@/modules/dsa/domain/db-lab";
import { topicLabel } from "@/modules/dsa/domain/db-lab-topics";
import type { ExternalDifficulty } from "@/modules/dsa/domain/external-catalogue";

export interface SqlSheetRow {
  id: string;
  title: string;
  difficulty: ExternalDifficulty;
  source: "LeetCode" | "DB Lab";
  topic: string;
  href: string;
  /** Where the solved state lives: problem progress on the server, or the DB Lab's on-device list. */
  solvedBy: { kind: "problem"; slug: string } | { kind: "lab"; id: string };
}

const RANK: Record<ExternalDifficulty, number> = { Easy: 0, Medium: 1, Hard: 2 };

/** The SQL sheet: LeetCode's SQL problems (in-app IDE) and every DB Lab SQL challenge, easy to hard. */
export function sqlSheetRows(problems: readonly ContentProblem[], challenges: readonly DbChallenge[]): SqlSheetRow[] {
  const leetcode = problems
    .filter((p) => p.track === "sql")
    .map<SqlSheetRow>((p) => ({ id: p.slug, title: p.title, difficulty: p.difficulty, source: "LeetCode", topic: "Interview classics", href: `/dsa/${p.slug}`, solvedBy: { kind: "problem", slug: p.slug } }));
  const lab = challenges
    .filter((c) => c.mode === "sql")
    .map<SqlSheetRow>((c) => ({ id: c.id, title: c.title, difficulty: c.difficulty, source: "DB Lab", topic: topicLabel("sql", c.topic), href: `/playground/db?challenge=${c.id}`, solvedBy: { kind: "lab", id: c.id } }));
  return [...leetcode, ...lab].sort((a, b) => RANK[a.difficulty] - RANK[b.difficulty]);
}
