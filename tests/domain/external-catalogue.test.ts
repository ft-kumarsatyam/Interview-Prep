import { describe, expect, it } from "vitest";
import { elapsedSecondsAt, minutesFromSeconds, toggleTimer, type TimerState } from "@/modules/dsa/domain/external-catalogue";

describe("external question timer", () => {
  it("starts, pauses, and rounds saved time to minutes", () => {
    const started = toggleTimer({ elapsedSeconds: 0, running: false, startedAt: null }, 1_000);
    expect(started.running).toBe(true);
    expect(elapsedSecondsAt(started, 91_000)).toBe(90);
    const paused = toggleTimer(started, 91_000);
    expect(paused).toEqual({ elapsedSeconds: 90, running: false, startedAt: null });
    expect(minutesFromSeconds(paused.elapsedSeconds)).toBe(2);
  });

  it("does not allow a clock to run backwards", () => {
    const state: TimerState = { elapsedSeconds: 30, running: true, startedAt: 2_000 };
    expect(elapsedSecondsAt(state, 1_000)).toBe(30);
  });
});
