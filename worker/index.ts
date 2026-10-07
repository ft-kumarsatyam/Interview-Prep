/**
 * Long-lived outbox worker: the same handlers the QStash route runs, polling MongoDB instead. For Docker or a
 * GitHub Actions job when you want delivery without Vercel. `npm run worker` (add `-- --once` to drain and exit).
 */
import mongoose from "mongoose";
import { MongoPollBroker } from "@/core/broker/mongo-poll";
import { relayOutbox } from "@/core/events/relay";
import { ensureEventHandlers } from "@/core/services/event-handlers";

const INTERVAL_MS = Math.min(60_000, Math.max(1_000, Number(process.env.WORKER_INTERVAL_MS ?? 5000)));
const once = process.argv.includes("--once");
let stopping = false;
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => (stopping = true));

async function main() {
  ensureEventHandlers();
  const broker = new MongoPollBroker();
  console.log(`[worker] started (${once ? "once" : `every ${INTERVAL_MS}ms`})`);
  do {
    try {
      const r = await relayOutbox({ broker });
      if (r.claimed) console.log(`[worker] claimed ${r.claimed}: ${r.done} done, ${r.retried} retried, ${r.dead} dead`);
    } catch (err) {
      // A transient database or broker outage must not permanently stop the long-lived worker.
      console.error("[worker] relay failed:", err instanceof Error ? err.message : err);
    }
    if (once || stopping) break;
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  } while (!stopping);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
