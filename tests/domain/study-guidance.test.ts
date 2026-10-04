import { describe, expect, it } from "vitest";
import { studyGuidance } from "@/modules/progress/domain/study-guidance";

describe("studyGuidance", () => {
  it("suggests a lighter session when available time is constrained", () => {
    expect(studyGuidance({ minutesAvailable: 30, requiredMinutes: 90, backlogMinutes: 0, paceRatio: 1 }).mode).toBe("lighter");
  });

  it("prioritises catch-up when backlog or pace needs attention", () => {
    expect(studyGuidance({ minutesAvailable: 180, requiredMinutes: 60, backlogMinutes: 180, paceRatio: 1 }).mode).toBe("catch-up");
    expect(studyGuidance({ minutesAvailable: 180, requiredMinutes: 60, backlogMinutes: 0, paceRatio: 0.5 }).mode).toBe("catch-up");
  });

  it("keeps a healthy plan normal", () => {
    expect(studyGuidance({ minutesAvailable: 180, requiredMinutes: 90, backlogMinutes: 0, paceRatio: 1 }).mode).toBe("normal");
  });
});
