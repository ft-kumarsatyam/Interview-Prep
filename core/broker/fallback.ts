import type { Broker } from "@/core/broker/types";

/** QStash first; if publishing fails, deliver in-process so the event is not stuck behind a queue outage. */
export class FallbackBroker implements Broker {
  readonly name: Broker["name"];
  constructor(
    private readonly primary: Broker,
    private readonly secondary: Broker,
    private readonly onFallback: (err: unknown) => void = () => undefined,
  ) {
    this.name = primary.name;
  }
  async dispatch(eventId: string, type: string) {
    try {
      return await this.primary.dispatch(eventId, type);
    } catch (err) {
      this.onFallback(err);
      return this.secondary.dispatch(eventId, type);
    }
  }
}
