import type { Broker } from "@/core/broker/types";
import { deliverEvent } from "@/core/events/deliver";

/** The always-available broker: run the handlers right here. A long-lived worker or the relay cron polls the outbox. */
export class MongoPollBroker implements Broker {
  readonly name = "mongo" as const;
  async dispatch(eventId: string): Promise<"done"> {
    const r = await deliverEvent(eventId);
    if (!r.ok) throw Object.assign(new Error(r.error), { permanent: r.permanent });
    return "done";
  }
}
