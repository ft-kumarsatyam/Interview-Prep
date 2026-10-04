import { CarryBanner } from "@/modules/planner/components/carry-banner";
import { getCarryState } from "@/modules/planner/services/carry";
import { REPLAN_MAX_HOURS, type TodayState } from "@/modules/planner/services/plan";
import { getBacklog } from "@/modules/progress/services/backlog";

type Props = Pick<TodayState, "today" | "plan" | "settings">;

/** Async section: warns when unfinished work pushed forward passes your limits. A failure hides it instead of breaking the page. */
export async function CarrySection({ today, plan, settings }: Props) {
  const status = await getBacklog({ today, plan, settings })
    .then((view) => getCarryState({ today, settings, todayIsStudyDay: plan.kind === "study" || plan.kind === "revision", owed: view.open.length }))
    .then((s) => s.status)
    .catch(() => null);
  return status ? <CarryBanner status={status} hours={plan.hours ?? null} maxHours={REPLAN_MAX_HOURS} today={today} /> : null;
}
