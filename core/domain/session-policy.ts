const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** "Remember me" sessions: 30 days, renewed while you keep using the app. */
export const REMEMBER_TTL_MS = 30 * DAY_MS;
/** Without "Remember me": a browser-session cookie whose token also expires after 12 hours. */
export const SHORT_TTL_MS = 12 * HOUR_MS;
/** A remembered token older than this is re-issued on the next request. */
export const RENEW_AFTER_MS = 7 * DAY_MS;

export function sessionTtlMs(remember: boolean): number {
  return remember ? REMEMBER_TTL_MS : SHORT_TTL_MS;
}

export interface SessionInfo {
  remember: boolean;
  /** JWT `iat`, in Unix seconds. */
  issuedAt: number;
}

/** Sliding renewal applies only to remembered sessions, once they are a week old. */
export function shouldRenew(session: SessionInfo, now: Date): boolean {
  return session.remember && now.getTime() - session.issuedAt * 1000 >= RENEW_AFTER_MS;
}
