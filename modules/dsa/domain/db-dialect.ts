/**
 * The three engines DB Lab can run on, and the small adapter that turns a SQLite seed script into Postgres.
 * Pure: the engines themselves live in core/sandbox.
 */
import type { DbMode } from "@/modules/dsa/domain/db-lab";

export type DbEngine = "sqlite" | "postgres" | "mongo";
export type SavedMode = "sql" | "postgres" | "mongo";

export const ENGINES: readonly { id: DbEngine; label: string; blurb: string }[] = [
  { id: "sqlite", label: "SQL", blurb: "SQLite in your browser, with MySQL helpers" },
  { id: "postgres", label: "Postgres", blurb: "Real PostgreSQL (PGlite) in your browser" },
  { id: "mongo", label: "MongoDB", blurb: "A practice subset of the Mongo shell" },
];

export const engineLabel = (e: DbEngine) => ENGINES.find((x) => x.id === e)?.label ?? e;

/** Challenges are written for SQL or Mongo; Postgres runs the SQL ones. */
export const challengeMode = (e: DbEngine): DbMode => (e === "mongo" ? "mongo" : "sql");

export const toSavedMode = (e: DbEngine): SavedMode => (e === "sqlite" ? "sql" : e);
export const fromSavedMode = (m: SavedMode): DbEngine => (m === "sql" ? "sqlite" : m);

/** Which engine runs a Check: Postgres only for challenges whose reference answer is known to pass there. */
export function checkEngine(engine: DbEngine, challengeId: string, checkable: ReadonlySet<string> = PG_CHECKABLE): DbEngine {
  return engine === "postgres" && !checkable.has(challengeId) ? "sqlite" : engine;
}

/**
 * Rewrites SQLite DDL into what Postgres accepts. The seeds are plain (INTEGER, TEXT, dates as ISO text), so this only
 * covers the type names and keywords that differ.
 */
export function adaptSeedForPostgres(seed: string): string {
  return seed
    .replace(/\bINTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT\b/gi, "SERIAL PRIMARY KEY")
    .replace(/\bAUTOINCREMENT\b/gi, "")
    .replace(/\bREAL\b/gi, "DOUBLE PRECISION")
    .replace(/\bBLOB\b/gi, "BYTEA")
    .replace(/\bDATETIME\b/gi, "TIMESTAMP")
    .replace(/\bINSERT\s+OR\s+(?:IGNORE|REPLACE)\s+INTO\b/gi, "INSERT INTO");
}

/**
 * Ids of SQL challenges whose reference solution runs on Postgres and returns the same rows as on SQLite.
 * tests/domain/db-dialect.test.ts re-checks this list against PGlite, so it cannot go stale.
 */
export const PG_CHECKABLE: ReadonlySet<string> = new Set<string>([
  "sql-above-average", "sql-above-overall-average", "sql-account-balance", "sql-account-owners", "sql-accounts-big-withdrawal",
  "sql-algebra-scoreboard", "sql-all-reports", "sql-artist-initial", "sql-average-order-value", "sql-big-depositors",
  "sql-big-withdrawals", "sql-category-revenue", "sql-cheap-accessories", "sql-city-fallback", "sql-course-average",
  "sql-course-champions", "sql-course-teachers", "sql-cumulative-loans", "sql-customer-products", "sql-distinct-cities", "sql-everyone",
  "sql-headcount", "sql-heavy-listeners", "sql-high-earners", "sql-latest-play", "sql-managers", "sql-mid-length-songs",
  "sql-missing-scores", "sql-name-badge", "sql-never-borrowed", "sql-no-account", "sql-no-department", "sql-no-enrollment",
  "sql-no-orders", "sql-no-project", "sql-oldest-students", "sql-plays-per-genre", "sql-premium-only-songs", "sql-previous-loan",
  "sql-pricey-for-category", "sql-project-hours", "sql-prolific-authors", "sql-pune-students", "sql-rank-students", "sql-recent-hires",
  "sql-repeat-customers", "sql-rich-departments", "sql-running-balance", "sql-running-total", "sql-salary-range", "sql-salary-tiers",
  "sql-score-vs-course", "sql-second-highest", "sql-spend-per-category", "sql-still-out", "sql-students-per-grade", "sql-teacher-reach",
  "sql-tech-history", "sql-term-pivot", "sql-top-per-dept", "sql-top-songs-per-genre", "sql-uncategorised", "sql-unplayed-songs",
  "sql-unsold-products", "sql-who-borrowed",
]);
