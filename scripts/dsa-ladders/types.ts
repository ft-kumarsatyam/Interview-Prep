export interface LadderRow {
  code: string;
  stage: string;
  difficulty: "Easy" | "Medium" | "Hard";
  pattern: string;
  signal: string;
  task: string;
  skill: string;
  /** The PrepOS problem this row opens (seeded or from scripts/dsa-extras). */
  slug: string;
  lc?: number;
  /** Product companies that ask it (from LeetCode company tags). */
  companies?: string[];
  priority?: "High" | "Medium-High" | "Medium";
  why?: string;
  /** Service companies with the page that lists the question for them. */
  service?: ReadonlyArray<readonly [string, string]>;
}

export interface LadderDef {
  id: string;
  /** Row code prefix ("A" for arrays). */
  prefix: string;
  title: string;
  description: string;
  stages: string[];
  rows: LadderRow[];
}
