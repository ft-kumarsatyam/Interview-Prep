import { registerJobHandlers } from "@/modules/jobs/services/event-handlers";
import { registerNotificationHandlers } from "@/modules/notifications/services/event-handlers";

/** Registers every event consumer. Call it in any runtime that delivers events (queue route, worker, relay cron). */
export function ensureEventHandlers(): void {
  registerNotificationHandlers();
  registerJobHandlers();
}
