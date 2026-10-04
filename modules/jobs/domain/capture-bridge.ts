/**
 * Messages from the PrepOS extension carrying a job or profile page you chose to send.
 * extension/content-app.js mirrors the constants; keep both in sync. Pure.
 */
import { jobCaptureSchema, profileCaptureSchema, type JobCapture, type ProfileCapture } from "@/modules/jobs/domain/jobs";

export const CAPTURE_SOURCE_EXT = "prepos-ext";
export const CAPTURE_SOURCE_APP = "prepos-app";

export type Capture = { id: string; kind: "job"; data: JobCapture } | { id: string; kind: "profile"; data: ProfileCapture };

/**
 * Accepts only a well-formed capture. The payload is text lifted from a website, so it goes through the
 * same zod schemas as the add-a-job form; anything that fails is dropped.
 */
export function parseCapture(data: unknown): Capture | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.source !== CAPTURE_SOURCE_EXT || d.type !== "capture") return null;
  if (typeof d.id !== "string" || d.id.length === 0 || d.id.length > 64) return null;
  const p = d.payload;
  if (!p || typeof p !== "object") return null;
  const kind = (p as Record<string, unknown>).kind;
  if (kind === "job") {
    const parsed = jobCaptureSchema.safeParse(p);
    return parsed.success ? { id: d.id, kind: "job", data: parsed.data } : null;
  }
  if (kind === "profile") {
    const parsed = profileCaptureSchema.safeParse(p);
    return parsed.success ? { id: d.id, kind: "profile", data: parsed.data } : null;
  }
  return null;
}

export const drainRequest = () => ({ source: CAPTURE_SOURCE_APP, type: "drain-captures" });
export const captureAck = (id: string) => ({ source: CAPTURE_SOURCE_APP, type: "capture-ack", id });
