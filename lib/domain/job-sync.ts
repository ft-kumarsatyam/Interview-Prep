/**
 * Scheduling rules for the job sync: which sources are due, how a failing source backs off, and how many
 * postings to keep from one. Pure, so the whole rotation can be tested without a network.
 */
import { isTechRole, type NormalizedPosting } from "./job-postings";

export const BOARD_MIN_INTERVAL_MIN = 180;
/** Remotive asks for at most about four requests a day, so aggregators wait longer. */
export const AGGREGATOR_MIN_INTERVAL_MIN = 360;
/** Newest 120 engineering roles per company, so a few huge ones (300+) cannot crowd out the rest. */
export const MAX_PER_SOURCE = 120;
export const MAX_POSTINGS_TOTAL = 4500;
export const MAX_COOLDOWN_HOURS = 24;
/** Stop starting new sources when this little of the run's time is left (a fetch can take 20 s). */
export const START_NEW_UNTIL_LEFT_MS = 15_000;

export interface SourceState {
  id: string;
  kind: "board" | "aggregator";
  enabled: boolean;
  lastTriedAt: Date | null;
  cooldownUntil: Date | null;
  consecutiveFailures: number;
}

/** Enabled sources that are not cooling down and were not tried recently, least recently tried first (so repeated runs rotate through everyone). */
export function dueSources<T extends SourceState>(sources: readonly T[], now: Date): T[] {
  const t = now.getTime();
  return sources
    .filter((s) => {
      if (!s.enabled) return false;
      if (s.cooldownUntil && s.cooldownUntil.getTime() > t) return false;
      const gap = (s.kind === "aggregator" ? AGGREGATOR_MIN_INTERVAL_MIN : BOARD_MIN_INTERVAL_MIN) * 60_000;
      return !s.lastTriedAt || t - s.lastTriedAt.getTime() >= gap;
    })
    .toSorted((a, b) => (a.lastTriedAt?.getTime() ?? 0) - (b.lastTriedAt?.getTime() ?? 0) || a.id.localeCompare(b.id));
}

export interface Health {
  consecutiveFailures: number;
  cooldownUntil: Date | null;
  lastError: string;
}

/** A success clears the record; each failure doubles the pause (30 min, 1 h, 2 h ... up to a day) so a dead board stops costing time. */
export function nextHealth(prev: { consecutiveFailures: number }, outcome: { ok: true } | { ok: false; error: string }, now: Date): Health {
  if (outcome.ok) return { consecutiveFailures: 0, cooldownUntil: null, lastError: "" };
  const failures = prev.consecutiveFailures + 1;
  const hours = Math.min(MAX_COOLDOWN_HOURS, 0.5 * 2 ** (failures - 1));
  return { consecutiveFailures: failures, cooldownUntil: new Date(now.getTime() + hours * 3_600_000), lastError: outcome.error.slice(0, 300) };
}

/** Engineering roles only, newest first, at most `max`, so one huge company can't fill the feed. */
export function selectPostings(postings: readonly NormalizedPosting[], max = MAX_PER_SOURCE): NormalizedPosting[] {
  return postings
    .filter((p) => isTechRole(p.title))
    .toSorted((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? "") || a.externalId.localeCompare(b.externalId))
    .slice(0, max);
}

export type HealthLabel = "ok" | "stale" | "cooling down" | "off" | "never run";

/** A short status for the Sources tab. */
export function healthLabel(s: SourceState & { lastOkAt: Date | null }, now: Date): HealthLabel {
  if (!s.enabled) return "off";
  if (s.cooldownUntil && s.cooldownUntil.getTime() > now.getTime()) return "cooling down";
  if (!s.lastOkAt) return "never run";
  return now.getTime() - s.lastOkAt.getTime() > 3 * 24 * 3_600_000 ? "stale" : "ok";
}
