import { describe, expect, it } from "vitest";
import { buildStudyQueue, nextStudyItem, type StudyFlowItem } from "@/modules/study-flow/domain/study-flow";

const item = (id: string, kind: StudyFlowItem["kind"], extra: Partial<StudyFlowItem> = {}): StudyFlowItem => ({
  id,
  kind,
  title: id,
  href: `/${id}`,
  minutes: 20,
  bucket: "optional",
  done: false,
  reason: "test",
  ...extra,
});

describe("buildStudyQueue", () => {
  it("keeps required work first and adds the next learning actions", () => {
    const queue = buildStudyQueue({
      dayKind: "study",
      minutesAvailable: 140,
      required: [item("dsa-1", "dsa", { minutes: 40 }), item("daily-quiz", "quiz", { minutes: 10 })],
      reviews: [item("review-1", "review")],
      roadmap: [item("roadmap-must", "roadmap", { priority: "must" })],
      courses: [item("course-1", "course")],
      practice: [item("practice-1", "practice")],
    });

    expect(queue.slice(0, 2).map((entry) => entry.id)).toEqual(["dsa-1", "daily-quiz"]);
    expect(queue.slice(2).map((entry) => entry.id)).toEqual(["review-1", "roadmap-must", "course-1", "practice-1"]);
    expect(queue.slice(2).map((entry) => entry.bucket)).toEqual(["recommended", "recommended", "recommended", "optional"]);
  });

  it("does not add optional work on rest or outside days", () => {
    expect(buildStudyQueue({
      dayKind: "rest",
      minutesAvailable: 240,
      required: [],
      courses: [item("course-1", "course")],
      practice: [item("practice-1", "practice")],
    })).toEqual([]);
  });

  it("excludes skipped roadmap nodes and finds the first actionable item", () => {
    const queue = buildStudyQueue({
      dayKind: "study",
      minutesAvailable: 60,
      required: [item("done", "theory", { done: true })],
      roadmap: [
        item("skip", "roadmap", { priority: "skip" }),
        item("must", "roadmap", { priority: "must" }),
      ],
    });
    expect(queue.map((entry) => entry.id)).toEqual(["done", "must"]);
    expect(nextStudyItem(queue)?.id).toBe("must");
  });
});
