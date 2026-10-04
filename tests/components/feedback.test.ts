import { describe, expect, it } from "vitest";
import { FEEDBACK } from "@/components/shared/feedback";

describe("feedback cues", () => {
  it.each(Object.entries(FEEDBACK))("%s stays short, audible and gentle", (_kind, cue) => {
    expect(cue.tones.length).toBeGreaterThan(0);
    for (const t of cue.tones) {
      expect(t.freq).toBeGreaterThanOrEqual(200);
      expect(t.freq).toBeLessThanOrEqual(2000);
      expect(t.gain ?? 0.18).toBeLessThanOrEqual(0.2);
    }
    expect(Math.max(...cue.tones.map((t) => t.at + t.dur))).toBeLessThanOrEqual(1);
    expect(cue.vibrate.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(300);
  });
});
