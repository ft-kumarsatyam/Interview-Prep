import { z } from "zod";
import { diffDays, type DateStr } from "@/core/domain/dates";

/** Saved planners are kept this long, then MongoDB's TTL index removes them. */
export const SNAPSHOT_RETENTION_DAYS = 60;
export const SNAPSHOT_LIST_LIMIT = 20;

export const SNAPSHOT_REASONS = ["reset", "restore", "manual"] as const;
export type SnapshotReason = (typeof SNAPSHOT_REASONS)[number];

export const SNAPSHOT_REASON_LABEL: Record<SnapshotReason, string> = {
  reset: "Saved before a reset",
  restore: "Saved before a restore",
  manual: "Saved by you",
};

export interface SnapshotPlanner {
  targetRole: string;
  targetCompany: string;
  startDate: DateStr;
  endDate: DateStr;
  hoursByDow: number[];
}

export interface SnapshotSummaryInput {
  planner: SnapshotPlanner;
  ratedTopics: number;
  completed: boolean;
}

export const snapshotExpiry = (now: Date): Date => new Date(now.getTime() + SNAPSHOT_RETENTION_DAYS * 86_400_000);

/** Whole days until a snapshot is removed; 0 on its last day. */
export const daysUntilExpiry = (expiresAt: Date, now: Date): number => Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 86_400_000));

/** One-line description of a saved planner, e.g. "Backend engineer at Acme · interview 21 Mar 2027 · 18 h a week · 12 topics rated". */
export function describeSnapshot(s: SnapshotSummaryInput, fmt: (d: DateStr) => string = (d) => d): string {
  const role = s.planner.targetRole || "No target role";
  const who = s.planner.targetCompany ? `${role} at ${s.planner.targetCompany}` : role;
  const weekly = Math.round(s.planner.hoursByDow.reduce((a, b) => a + b, 0) * 10) / 10;
  const rated = s.completed ? `${s.ratedTopics} topic${s.ratedTopics === 1 ? "" : "s"} rated` : "setup not finished";
  return `${who} · interview ${fmt(s.planner.endDate)} · ${weekly} h a week · ${rated}`;
}

export const resetOptionsSchema = z.object({
  /** Move the plan start to today, so week 1 begins again. Progress (solves, notes, streak) is never touched. */
  restartFromToday: z.boolean().default(false),
});
export type ResetOptions = z.infer<typeof resetOptionsSchema>;

/**
 * The plan window a restored snapshot gets. A past interview date can't be restored (the plan would have no days
 * left), so the current one is kept and the caller says so.
 */
export function restoredWindow(
  snap: Pick<SnapshotPlanner, "startDate" | "endDate">,
  current: { startDate: DateStr; endDate: DateStr },
  today: DateStr,
): { startDate: DateStr; endDate: DateStr; keptCurrentEnd: boolean } {
  const keptCurrentEnd = snap.endDate <= today;
  const endDate = keptCurrentEnd ? current.endDate : snap.endDate;
  const startDate = snap.startDate < endDate && diffDays(endDate, snap.startDate) <= 400 ? snap.startDate : current.startDate;
  return { startDate, endDate, keptCurrentEnd };
}

/** The start date a reset uses: today when restarting (if the interview is still ahead), otherwise unchanged. */
export const resetStartDate = (current: { startDate: DateStr; endDate: DateStr }, today: DateStr, restart: boolean): DateStr =>
  restart && today < current.endDate ? today : current.startDate;
