import { describe, expect, it } from "vitest";
import { continueTarget, neighbours, searchTopics, topicIdFromHash, topicProgress, trackTopics, type LearnTopic } from "@/modules/learn/domain/learn";

const t = (id: string, track: string, week: number, n = 3, title = id): LearnTopic => ({
  id,
  track,
  week,
  title,
  subtopics: Array.from({ length: n }, (_, i) => `${title} part ${i}`),
});

const topics = [t("js-1", "js", 1), t("node-1", "node", 1), t("js-2", "js", 2), t("node-2", "node", 2, 2, "Streams"), t("js-3", "js", 3)];
const doneSet = (...ids: string[]) => {
  const s = new Set(ids);
  return (id: string) => s.has(id);
};

describe("topicProgress", () => {
  it("counts ticks and finds the first unticked subtopic", () => {
    expect(topicProgress(topics[0]!, doneSet("js-1:0", "js-1:2"), false)).toEqual({ done: 2, total: 3, status: "progress", mastered: false, next: 1 });
  });
  it("is todo with nothing ticked, done when all ticked or mastered", () => {
    expect(topicProgress(topics[0]!, doneSet(), false).status).toBe("todo");
    expect(topicProgress(topics[0]!, doneSet("js-1:0", "js-1:1", "js-1:2"), false)).toMatchObject({ status: "done", next: null });
    expect(topicProgress(topics[0]!, doneSet(), true)).toMatchObject({ status: "done", next: 0, mastered: true });
  });
});

describe("trackTopics and neighbours", () => {
  it("orders a track by week", () => {
    expect(trackTopics(topics, "js").map((x) => x.id)).toEqual(["js-1", "js-2", "js-3"]);
  });
  it("gives prev and next within the same track only", () => {
    expect(neighbours(topics, "js-2")).toMatchObject({ prev: { id: "js-1" }, next: { id: "js-3" } });
    expect(neighbours(topics, "js-1").prev).toBeNull();
    expect(neighbours(topics, "node-2")).toMatchObject({ prev: { id: "node-1" }, next: null });
    expect(neighbours(topics, "missing")).toEqual({ prev: null, next: null });
  });
});

describe("continueTarget", () => {
  const base = { topics, isMastered: () => false, lastTouched: () => null, currentWeek: 2 };

  it("prefers the in-progress topic touched most recently", () => {
    const touched: Record<string, string> = { "js-1": "2026-10-01", "node-2": "2026-10-03" };
    const res = continueTarget({ ...base, isDone: doneSet("js-1:0", "node-2:0"), lastTouched: (id) => touched[id] ?? null });
    expect(res).toMatchObject({ topic: { id: "node-2" }, reason: "recent", progress: { next: 1 } });
  });

  it("falls back to an unfinished topic scheduled this week", () => {
    expect(continueTarget({ ...base, isDone: doneSet() })).toMatchObject({ topic: { id: "js-2" }, reason: "this-week" });
  });

  it("falls back to the first unfinished topic in study order", () => {
    const res = continueTarget({ ...base, currentWeek: 9, isDone: doneSet("js-1:0", "js-1:1", "js-1:2") });
    expect(res).toMatchObject({ topic: { id: "node-1" }, reason: "next" });
  });

  it("skips mastered topics and returns null when everything is done", () => {
    expect(continueTarget({ ...base, currentWeek: 1, isDone: doneSet(), isMastered: (id) => id === "js-1" })?.topic.id).toBe("node-1");
    expect(continueTarget({ ...base, isDone: doneSet(), isMastered: () => true })).toBeNull();
  });
});

describe("searchTopics", () => {
  it("matches topic titles and subtopic titles, case-insensitively", () => {
    const res = searchTopics(topics, "  STREAMS part 1 ");
    expect(res).toEqual([{ topic: topics[3], subtopics: [1] }]);
    expect(searchTopics(topics, "streams").map((m) => m.subtopics)).toEqual([[0, 1]]);
    expect(searchTopics(topics, "js-")).toHaveLength(3);
  });
  it("matches nothing for an empty query", () => {
    expect(searchTopics(topics, "   ")).toEqual([]);
  });
});

describe("topicIdFromHash", () => {
  it("reads old #topic-<id> links", () => {
    expect(topicIdFromHash("#topic-node-streams")).toBe("node-streams");
    expect(topicIdFromHash("topic-a%20b")).toBe("a b");
    expect(topicIdFromHash("#topic-")).toBeNull();
    expect(topicIdFromHash("#theory")).toBeNull();
  });
});
