/** One channel's latest delivery as stored on its outbox row (event id `notify:<notificationId>:<channel>`). */
export interface DeliveryRow {
  status: string;
  attempts?: number | null;
  lastError?: string | null;
  createdAt?: Date | null;
  doneAt?: Date | null;
  result?: unknown;
}

export type DeliveryState = "sent" | "skipped" | "retrying" | "failed";

export interface DeliveryView {
  channel: string;
  state: DeliveryState;
  at: Date | null;
  provider?: string;
  id?: string;
  /** The provider's error or why nothing was sent. */
  note?: string;
}

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

/** Reads the handler result the outbox stored: `{ "notify.send-channel": { sent, provider, id, reason } }`. */
export function deliveryView(channel: string, row: DeliveryRow): DeliveryView {
  const at = row.doneAt ?? row.createdAt ?? null;
  if (row.status === "dead") return { channel, state: "failed", at, note: str(row.lastError) };
  if (row.status !== "done") return { channel, state: row.lastError ? "retrying" : "sent", at, note: str(row.lastError) };
  const result = row.result && typeof row.result === "object" ? Object.values(row.result as Record<string, unknown>)[0] : undefined;
  const r = (result && typeof result === "object" ? result : {}) as Record<string, unknown>;
  if (r.sent === false) return { channel, state: "skipped", at, note: str(r.reason) };
  return { channel, state: "sent", at, provider: str(r.provider), id: str(r.id) };
}
