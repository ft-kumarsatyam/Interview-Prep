import type { DateStr } from "@/core/domain/dates";
import { carryStatus, type CarryStatus } from "@/modules/planner/domain/carry-limits";
import { loadCatchUp, type CatchUpState } from "@/modules/planner/services/catch-up";
import type { AppSettings } from "@/modules/settings/services/settings";

export interface CarryState {
  status: CarryStatus;
  catchUp: CatchUpState;
}

/** How much unfinished work has been pushed forward, against your limits. Read-only. `owed` is the backlog size. */
export async function getCarryState(input: { today: DateStr; settings: AppSettings; todayIsStudyDay: boolean; owed: number }): Promise<CarryState> {
  const catchUp = await loadCatchUp(input.settings, input.today);
  const status = carryStatus({ open: catchUp.open, owed: input.owed, today: input.today, limits: input.settings.carryLimits, todayIsStudyDay: input.todayIsStudyDay });
  return { status, catchUp };
}
