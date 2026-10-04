/**
 * What the live channel carries: small, typed notices that something changed ("12 new jobs", "sync 40 of
 * 86"), never personal text. The page decides what to do (usually refresh a server component). Also the
 * server-sent-events wire format. Pure.
 */
import { z } from "zod";

export const liveEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("sync.progress"), done: z.number().int().min(0), total: z.number().int().min(0) }),
  z.object({ type: z.literal("sync.done"), ok: z.number().int().min(0), failed: z.number().int().min(0), added: z.number().int().min(0) }),
  z.object({ type: z.literal("jobs.new"), count: z.number().int().min(1) }),
  z.object({ type: z.literal("notification"), kind: z.string().max(20) }),
  z.object({ type: z.literal("capture"), kind: z.enum(["job", "profile"]) }),
]);
export type LiveEvent = z.infer<typeof liveEventSchema>;
export type LiveEventType = LiveEvent["type"];

export const LIVE_CHANNEL = "live";

export function encodeEvent(e: LiveEvent): string {
  return JSON.stringify(liveEventSchema.parse(e));
}

/** A stored or received message back into a typed event, or null for anything malformed. */
export function decodeEvent(raw: string): LiveEvent | null {
  try {
    const r = liveEventSchema.safeParse(JSON.parse(raw));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/* ---------------------------------- the wire format ---------------------------------- */

/** One server-sent event. Newlines in data are split across `data:` lines, as the format requires. */
export function sseMessage(m: { id?: string; event?: string; data: string }): string {
  const head = [m.id !== undefined ? `id: ${m.id.replace(/[\r\n]/g, "")}` : null, m.event ? `event: ${m.event.replace(/[\r\n]/g, "")}` : null].filter(Boolean);
  const data = m.data.split(/\r?\n/).map((l) => `data: ${l}`);
  return `${[...head, ...data].join("\n")}\n\n`;
}

/** A comment line: keeps the connection alive through proxies and is ignored by the browser. */
export const sseComment = (text: string): string => `: ${text.replace(/[\r\n]/g, " ")}\n\n`;
export const sseRetry = (ms: number): string => `retry: ${Math.max(0, Math.floor(ms))}\n\n`;

/** The id to resume from, from the header the browser sends on reconnect or a `?after=` fallback. Ids are opaque but never contain whitespace. */
export function resumeId(header: string | null, query: string | null): string | null {
  const v = (header ?? query ?? "").trim();
  return v && v.length <= 64 && /^[\w.-]+$/.test(v) ? v : null;
}

/** Collapses a burst of events into the few the page needs to react to once. */
export function summarise(events: readonly LiveEvent[]): { newJobs: number; syncing: { done: number; total: number } | null; syncDone: boolean; notifications: number; captures: number } {
  let newJobs = 0;
  let syncing: { done: number; total: number } | null = null;
  let syncDone = false;
  let notifications = 0;
  let captures = 0;
  for (const e of events) {
    if (e.type === "jobs.new") newJobs += e.count;
    else if (e.type === "sync.progress") {
      syncing = { done: e.done, total: e.total };
      syncDone = false;
    } else if (e.type === "sync.done") {
      syncing = null;
      syncDone = true;
    } else if (e.type === "notification") notifications++;
    else captures++;
  }
  return { newJobs, syncing, syncDone, notifications, captures };
}
