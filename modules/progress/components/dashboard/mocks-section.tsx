import { WeeklyMocksCard } from "@/modules/mock/components/weekly-mocks-card";
import { weeklyMocks } from "@/modules/mock/services/mock";
import type { DashboardData } from "@/modules/progress/services/dashboard";

/** Async section: this week's scheduled mocks. */
export async function MocksSection({ today, schedule }: { today: string; schedule: DashboardData["settings"]["mockSchedule"] }) {
  const slots = await weeklyMocks(today, schedule);
  return <WeeklyMocksCard slots={slots} today={today} compact />;
}
