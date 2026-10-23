/** Schemas for run history, saved DB Lab queries and DB Lab progress. Pure. */
import { z } from "zod";

export const RUN_KINDS = ["playground", "dsa", "dblab"] as const;
export const RUN_ACTIONS = ["run", "submit", "check"] as const;
export const DB_MODES = ["sql", "postgres", "mongo"] as const;
export const RUN_LOG_KEEP = 40;

export const runInputSchema = z.object({
  kind: z.enum(RUN_KINDS),
  ref: z.string().trim().min(1).max(120),
  language: z.string().trim().min(1).max(20),
  action: z.enum(RUN_ACTIONS),
  ok: z.boolean(),
  passed: z.number().int().min(0).max(10_000).default(0),
  total: z.number().int().min(0).max(10_000).default(0),
  ms: z.number().int().min(0).max(600_000).default(0),
});
export type RunInput = z.infer<typeof runInputSchema>;

export const savedQueryInputSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  title: z.string().trim().min(1, "Give the query a title").max(80),
  sql: z.string().trim().min(1, "Nothing to save").max(8000),
  mode: z.enum(DB_MODES),
  dataset: z.string().trim().max(40).default(""),
});
export type SavedQueryInput = z.infer<typeof savedQueryInputSchema>;

export const solvedInputSchema = z.object({
  challengeId: z.string().trim().min(1).max(80),
  mode: z.enum(DB_MODES),
});

/** The solved ids a browser had before progress was synced, merged in once. */
export const importSolvedSchema = z.object({
  solved: z.array(z.object({ challengeId: z.string().trim().min(1).max(80), mode: z.enum(DB_MODES) })).max(500),
});

export interface RunSummary {
  id: string;
  action: (typeof RUN_ACTIONS)[number];
  language: string;
  ok: boolean;
  passed: number;
  total: number;
  ms: number;
  on: string;
}

/** Best (lowest) time of the passing runs, or null when none passed. */
export function bestMs(runs: readonly RunSummary[]): number | null {
  const ok = runs.filter((r) => r.ok && r.action !== "run").map((r) => r.ms);
  return ok.length ? Math.min(...ok) : null;
}
