import { dayOfWeek, type DateStr } from "@/lib/domain/dates";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** `2026-10-02` → `Fri, Oct 2`, straight from the date string (no timezone shifts). */
export function prettyDate(d: DateStr): string {
  return `${DAYS[dayOfWeek(d)]}, ${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;
}
