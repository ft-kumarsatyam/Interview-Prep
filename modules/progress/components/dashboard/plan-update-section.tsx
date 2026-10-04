import type { DashboardData } from "@/modules/progress/services/dashboard";
import { getPlanUpdate } from "@/modules/progress/services/recap";
import { PlanUpdateBanner } from "./plan-update-banner";

/** Async section: carried-over work and the finish forecast. */
export async function PlanUpdateSection({ today, settings, solved }: { today: string; settings: DashboardData["settings"]; solved: number }) {
  const update = await getPlanUpdate(today, settings, solved);
  return <PlanUpdateBanner carryOver={update.carryOver} forecast={update.forecast} />;
}
