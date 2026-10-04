import { isValidObjectId } from "mongoose";
import { connectDb } from "@/core/db";
import { plannerInputSchema } from "@/modules/planner/domain/planner-profile";
import {
  daysUntilExpiry,
  describeSnapshot,
  resetStartDate,
  restoredWindow,
  SNAPSHOT_LIST_LIMIT,
  snapshotExpiry,
  type ResetOptions,
  type SnapshotReason,
} from "@/modules/planner/domain/planner-snapshot";
import { formatDate } from "@/core/plan-clock";
import { PLANNER_INTAKE_ID, PlannerIntake, PlannerSnapshot } from "@/core/models/planner";
import { Settings, SETTINGS_ID } from "@/core/models/system";
import { logPlanChange } from "@/modules/planner/services/plan-log";
import { todayIn } from "@/modules/planner/services/plan";
import { savePlanner } from "@/modules/planner/services/planner";
import { getSettings, invalidateSettings } from "@/modules/settings/services/settings";

export interface SnapshotItem {
  id: string;
  reason: SnapshotReason;
  takenOn: string;
  summary: string;
  daysLeft: number;
}

const fmt = (d: string) => formatDate(d, { day: "numeric", month: "short", year: "numeric" });

/** Saves the current planner (intake answers and the planner fields in Settings). Progress is never copied or changed. */
export async function takeSnapshot(reason: SnapshotReason, now = new Date()): Promise<string> {
  const s = await getSettings();
  await connectDb();
  const intake = await PlannerIntake.findById(PLANNER_INTAKE_ID).lean();
  const doc = await PlannerSnapshot.create({
    reason,
    takenOn: todayIn(s, now),
    expiresAt: snapshotExpiry(now),
    intake: intake ? { ...intake, proposal: null } : null,
    planner: { ...s.profile, startDate: s.startDate, endDate: s.endDate, hoursByDow: [...(s.hoursByDow ?? [])] },
  });
  return String(doc._id);
}

/** Saved planners still inside the 60-day window, newest first. Filtered by date too: the TTL sweep runs about once a minute. */
export async function listSnapshots(now = new Date()): Promise<SnapshotItem[]> {
  await connectDb();
  const rows = await PlannerSnapshot.find({ expiresAt: { $gt: now } }).sort({ createdAt: -1 }).limit(SNAPSHOT_LIST_LIMIT).lean();
  return rows.map((r) => {
    const intake = r.intake as { topicRatings?: unknown[]; completedAt?: Date | null } | null;
    return {
      id: String(r._id),
      reason: r.reason,
      takenOn: r.takenOn,
      daysLeft: daysUntilExpiry(r.expiresAt, now),
      summary: describeSnapshot(
        {
          planner: { targetRole: r.planner?.targetRole ?? "", targetCompany: r.planner?.targetCompany ?? "", startDate: r.planner!.startDate, endDate: r.planner!.endDate, hoursByDow: r.planner?.hoursByDow ?? [] },
          ratedTopics: intake?.topicRatings?.length ?? 0,
          completed: !!intake?.completedAt,
        },
        fmt,
      ),
    };
  });
}

/**
 * Starts the planner over: saves a copy, clears the intake answers (ratings, check scores, date-range hours) and sends
 * you back through setup. Optionally restarts the plan window from today. Solves, notes, quizzes and the streak stay.
 */
export async function resetPlanner(opts: ResetOptions, now = new Date()): Promise<{ snapshotId: string }> {
  const s = await getSettings();
  const today = todayIn(s, now);
  const snapshotId = await takeSnapshot("reset", now);
  const startDate = resetStartDate(s, today, opts.restartFromToday);
  await connectDb();
  await PlannerIntake.deleteOne({ _id: PLANNER_INTAKE_ID });
  await Settings.updateOne({ _id: SETTINGS_ID }, { $set: { plannerSetupAt: null, startDate } }, { upsert: true });
  invalidateSettings();
  const restarted = startDate !== s.startDate ? ` The plan now starts today (${today}) instead of ${s.startDate}.` : "";
  await logPlanChange(
    {
      type: "reset",
      summary: `Planner reset. Ratings and setup answers were cleared; a copy is kept for 60 days.${restarted} Progress, notes and the streak are unchanged.`,
      before: { startDate: s.startDate, snapshotId },
      after: { startDate },
    },
    today,
  );
  return { snapshotId };
}

/** Puts a saved planner back. The current one is saved first, so a restore can itself be undone. */
export async function restoreSnapshot(id: string, now = new Date()): Promise<{ keptCurrentEnd: boolean; endDate: string }> {
  if (!isValidObjectId(id)) throw new Error("That saved plan doesn't exist");
  await connectDb();
  const snap = await PlannerSnapshot.findOne({ _id: id, expiresAt: { $gt: now } }).lean();
  if (!snap?.planner) throw new Error("That saved plan has expired or doesn't exist");
  const s = await getSettings();
  const today = todayIn(s, now);
  const window = restoredWindow(snap.planner, s, today);
  const input = plannerInputSchema.safeParse({
    targetRole: snap.planner.targetRole ?? "",
    targetCompany: snap.planner.targetCompany ?? "",
    preferredLanguage: snap.planner.preferredLanguage,
    priorities: snap.planner.priorities?.length ? snap.planner.priorities : s.profile.priorities,
    endDate: window.endDate,
    hoursByDow: snap.planner.hoursByDow?.length === 7 ? snap.planner.hoursByDow : s.hoursByDow,
  });
  if (!input.success) throw new Error("That saved plan can't be restored: some of its values are no longer valid");

  await takeSnapshot("restore", now);
  await connectDb();
  if (window.startDate !== s.startDate) {
    await Settings.updateOne({ _id: SETTINGS_ID }, { $set: { startDate: window.startDate } }, { upsert: true });
    invalidateSettings();
  }
  await savePlanner(input.data, now);
  const intake = snap.intake as Record<string, unknown> | null;
  if (intake) await PlannerIntake.replaceOne({ _id: PLANNER_INTAKE_ID }, { ...intake, _id: PLANNER_INTAKE_ID, proposal: null }, { upsert: true });
  else await PlannerIntake.deleteOne({ _id: PLANNER_INTAKE_ID });

  await logPlanChange(
    {
      type: "restore",
      summary: `Restored the plan saved on ${fmt(snap.takenOn)}.${window.keptCurrentEnd ? ` Its interview date (${snap.planner.endDate}) has passed, so ${window.endDate} was kept.` : ""} The plan you had before is saved for 60 days.`,
      before: { startDate: s.startDate, endDate: s.endDate },
      after: { startDate: window.startDate, endDate: window.endDate, snapshotId: id },
    },
    today,
  );
  return { keptCurrentEnd: window.keptCurrentEnd, endDate: window.endDate };
}
