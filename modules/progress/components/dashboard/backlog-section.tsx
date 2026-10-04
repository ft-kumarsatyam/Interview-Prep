import { BacklogCard, type BacklogCardData } from "@/modules/progress/components/backlog/backlog-card";
import { ensureBacklogQueue } from "@/modules/progress/services/backlog";
import type { DashboardData } from "@/modules/progress/services/dashboard";

type Props = { today: string; plan: DashboardData["plan"]; settings: DashboardData["settings"] };

/** Async section: what you owe beyond today's plan. A failure hides the card instead of breaking the page. */
export async function BacklogSection({ today, plan, settings }: Props) {
  const data: BacklogCardData | null = await ensureBacklogQueue({ today, plan, settings })
    .then((v) => ({
      owed: v.open.length,
      minutes: v.totalMinutes,
      budget: v.budget,
      queueDone: v.queueDone,
      queue: v.queue.map((i) => ({ key: i.key, title: i.title, path: i.path, ...(i.note ? { note: i.note } : {}) })),
    }))
    .catch(() => null);
  return data ? <BacklogCard data={data} /> : null;
}
