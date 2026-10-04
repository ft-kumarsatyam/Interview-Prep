import type { LogLine } from "./runner";

/** The worker ends a run that used `test(...)` with "N passed, M failed"; read it back for the console header. */
export function testSummary(logs: readonly LogLine[]): { passed: number; failed: number } | null {
  const last = logs.at(-1);
  const m = last && /^(\d+) passed, (\d+) failed$/.exec(last.text);
  return m ? { passed: Number(m[1]), failed: Number(m[2]) } : null;
}
