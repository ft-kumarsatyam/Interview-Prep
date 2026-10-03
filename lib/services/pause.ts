import type { DateStr } from "@/lib/domain/dates";
import type { FeasibilityStatus } from "@/lib/domain/feasibility";
import { diffPlannerChanges } from "@/lib/domain/plan-changes";
import { pauseNext, resume, skipRestOfWeek, type PauseResult } from "@/lib/domain/pause";
import { revisionStart } from "@/lib/domain/planner";
import { todayIn } from "./plan";
import { getFeasibility } from "./planner-intake";
import { logPlanChange } from "./plan-log";
import { getSettings, updateSettings, type AppSettings } from "./settings";

export type PauseRequest = { mode: "rest-of-week" } | { mode: "days"; count: number } | { mode: "resume" };

export interface PauseOutcome extends PauseResult {
  today: DateStr;
  /** Feasibility after the change, so a pause that makes the plan tight is called out. */
  status: FeasibilityStatus;
  coverage: number;
}

const state = (s: AppSettings) => ({ profile: s.profile, startDate: s.startDate, endDate: s.endDate, hoursByDow: s.hoursByDow ?? [], restDays: s.restDays });

/** Pause or resume future days through the rest-day setting. Today and earlier never change. The change is logged like any other rest-day edit. */
export async function applyPause(request: PauseRequest, now = new Date()): Promise<PauseOutcome> {
  const before = await getSettings();
  const today = todayIn(before, now);
  const window = { today, existingRest: before.restDays, planStart: before.startDate, planEnd: before.endDate, revisionStart: revisionStart(before) };
  const result =
    request.mode === "resume" ? resume(window) : request.mode === "rest-of-week" ? skipRestOfWeek(window) : pauseNext({ ...window, count: request.count });

  if (result.added.length > 0 || result.removed.length > 0) {
    await updateSettings({ restDays: result.restDays });
    const after = await getSettings();
    for (const change of diffPlannerChanges(state(before), state(after))) await logPlanChange(change, today);
  }
  const feasibility = await getFeasibility(now);
  return { ...result, today, status: feasibility.status, coverage: feasibility.coverage };
}
