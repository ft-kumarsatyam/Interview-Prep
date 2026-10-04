/**
 * How an outbox row gets to its consumers, in the same style as KvStore. `dispatch` either finishes the work
 * ("done": the Mongo poller runs handlers in-process) or hands it to a queue ("published": QStash will call
 * /api/queue/[topic] and the consumer finishes it). It throws when the row could not be delivered or published.
 */
export interface Broker {
  readonly name: "qstash" | "mongo";
  dispatch(eventId: string, type: string): Promise<"done" | "published">;
}
