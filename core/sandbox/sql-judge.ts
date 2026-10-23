import { columnNameNote, compareRows } from "@/modules/dsa/domain/db-lab";
import { adaptSeedForPostgres, type DbEngine } from "@/modules/dsa/domain/db-dialect";
import { resetPgDatabase, runPg } from "@/core/sandbox/pg-run";
import { resetSqlDatabase, runSql, type SqlResultSet, type SqlRun } from "@/core/sandbox/sql-run";

export type QueryOutput = { kind: "sets"; sets: SqlResultSet[]; ms: number } | { kind: "error"; message: string };

export interface QueryVerdict {
  ok: boolean;
  text: string;
  /** Secondary hint, e.g. a column-name mismatch. */
  note?: string;
}

/** Runs on SQLite (the default) or Postgres. A Postgres seed is adapted from the SQLite script here. */
export function runOn(engine: Exclude<DbEngine, "mongo">, seed: string, sql: string, opts: { fresh?: boolean } = {}): Promise<SqlRun> {
  return engine === "postgres" ? runPg(adaptSeedForPostgres(seed), sql, opts) : runSql(seed, sql, opts);
}

/** Drops the loaded database of both engines so the next run starts from the seed again. */
export function resetEngines() {
  resetSqlDatabase();
  resetPgDatabase();
}

/** Runs `sql` against `seed`; with `verify`, also runs that on the same database and appends its result. */
export async function runQuery(seed: string, sql: string, opts: { fresh?: boolean; verify?: string; engine?: Exclude<DbEngine, "mongo"> } = {}): Promise<QueryOutput> {
  const engine = opts.engine ?? "sqlite";
  const res = await runOn(engine, seed, sql, { fresh: opts.fresh });
  if (!res.ok) return { kind: "error", message: res.error };
  if (!opts.verify) return { kind: "sets", sets: res.sets, ms: res.ms };
  const after = await runOn(engine, seed, opts.verify);
  if (!after.ok) return { kind: "error", message: after.error };
  return { kind: "sets", sets: [...res.sets, ...after.sets], ms: res.ms + after.ms };
}

/** Compares the last result set of each side. Column names never decide the verdict; a mismatch becomes a note. */
export function judgeOutputs(mine: QueryOutput, expected: QueryOutput, ordered: boolean): QueryVerdict {
  if (mine.kind === "error") return { ok: false, text: "Your query has an error. Fix it, then submit again." };
  if (expected.kind === "error") return { ok: false, text: "Couldn't evaluate the reference answer. Try again." };
  const a = mine.sets.at(-1);
  const e = expected.sets.at(-1);
  if (!e) return { ok: false, text: "The reference returned no result set." };
  if (!a) return { ok: false, text: "Your query returned no result set. End with a SELECT." };
  const v = compareRows(a.rows, e.rows, ordered);
  const note = columnNameNote(a.columns, e.columns);
  if (v.ok) return { ok: true, text: e.total === 1 ? "Your row matches the expected output." : `All ${e.total} of your rows match the expected output.`, note: note && `${note} LeetCode checks names.` };
  return { ok: false, text: v.reason, note };
}

/** Runs both queries on fresh copies of the data, then leaves the engine to rebuild on the next run. */
export async function judgeSql(input: { seed: string; mine: string; reference: string; ordered: boolean; verify?: string; engine?: Exclude<DbEngine, "mongo"> }): Promise<{ mine: QueryOutput; expected: QueryOutput; verdict: QueryVerdict }> {
  const mine = await runQuery(input.seed, input.mine, { fresh: true, verify: input.verify, engine: input.engine });
  const expected = await runQuery(input.seed, input.reference, { fresh: true, verify: input.verify, engine: input.engine });
  resetEngines();
  return { mine, expected, verdict: judgeOutputs(mine, expected, input.ordered) };
}
