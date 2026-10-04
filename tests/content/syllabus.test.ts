import { describe, expect, it } from "vitest";
import { topics, tracks } from "@/core/content";

function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

/**
 * Frozen baseline: [topicId, subtopicCount, hash-of-those-subtopics] as they
 * existed before Phase 12/13 appended new topics/subtopics. AGENTS.md's hard
 * rule is "never reorder or delete subtopics within an existing topic" (their
 * id is `${topicId}:${index}`, and progress is keyed by it) — appending MORE
 * subtopics after this frozen count is fine and expected over time; this
 * only catches a topic's *recorded* subtopics being reordered, edited or
 * deleted. A legitimate future append must update both the count and the
 * hash below for that topic, deliberately, in the same change.
 */
const BASELINE: ReadonlyArray<readonly [string, number, string]> = [
  ["js-basics", 10, "acf78d91"],
  ["js-functions", 10, "65229bd3"],
  ["js-objects", 8, "892c4211"],
  ["js-async", 10, "a1b90454"],
  ["js-advanced", 10, "bc59d01c"],
  ["ts", 9, "b8846d1e"],
  ["node-internals", 9, "297a0dec"],
  ["node-backend", 9, "2bf265d6"],
  ["node-production", 8, "e23c0af1"],
  ["dsa-complexity", 5, "219391b8"],
  ["dsa-hashing-pointers", 5, "1fd9124f"],
  ["dsa-stack-search-sort", 5, "8be6a02c"],
  ["dsa-lists-trees", 5, "298d152c"],
  ["dsa-heaps-tries", 5, "9b0cd787"],
  ["dsa-backtracking-graphs", 6, "39b06bf5"],
  ["dsa-dp", 5, "2136271f"],
  ["dbms-intro", 6, "d62b203d"],
  ["dbms-relational", 5, "252c2750"],
  ["sql-basics", 6, "c5b36aab"],
  ["sql-advanced", 6, "f01cb3d4"],
  ["dbms-normalization", 6, "107554e0"],
  ["dbms-storage-indexing", 7, "ead50217"],
  ["dbms-query", 6, "70fbf5e7"],
  ["dbms-transactions", 6, "d91b457b"],
  ["dbms-concurrency-recovery", 7, "a6a0c743"],
  ["dbms-nosql", 7, "e2bd4045"],
  ["oop-pillars", 6, "6bf03267"],
  ["solid", 7, "bf314b42"],
  ["patterns-1", 8, "55b297c3"],
  ["patterns-2", 8, "c227eec2"],
  ["lld-method", 4, "e758373c"],
  ["lld-cache-ratelimiter", 3, "4fd0175f"],
  ["lld-booking-splitwise", 3, "9585a5d8"],
  ["lld-games", 3, "2a3b7fea"],
  ["lld-logger-pubsub", 3, "8a4ad087"],
  ["lld-vending-atm", 3, "5baa0565"],
  ["net-basics", 7, "886e5e22"],
  ["api-design", 7, "dc3f49dd"],
  ["os-concurrency", 7, "665558bb"],
  ["hld-scale-zero-to-million", 12, "e3721a77"],
  ["hld-framework", 5, "330ebd8f"],
  ["hld-building-blocks", 6, "bb70b924"],
  ["hld-url-shortener", 5, "ac28782b"],
  ["hld-partitioning", 6, "aa3209e8"],
  ["hld-kv-store", 3, "cdf06396"],
  ["hld-consistency", 7, "54d72936"],
  ["hld-ratelimiter-idgen", 3, "2d253974"],
  ["hld-messaging", 6, "28e29f9c"],
  ["hld-microservices", 6, "7785edc9"],
  ["hld-notification", 4, "8e562a4a"],
  ["hld-storage-observability", 6, "25a73f6b"],
  ["hld-feed-chat", 5, "7778cc46"],
  ["security", 6, "34bbba9d"],
  ["hld-video-uber", 5, "16d3f0"],
  ["hld-payments-ticketing", 5, "11014331"],
  ["hld-bigtech-cases", 8, "f680df8a"],
  ["hld-crawler-dropbox", 2, "971b521"],
  ["hld-analytics-scheduler", 4, "abba4482"],
  ["ai-ml-basics", 6, "2aad9d7e"],
  ["ai-deep-learning", 6, "d7cdff2c"],
  ["ai-llm-engineering", 6, "8365cfda"],
  ["ai-rag", 6, "6d489b50"],
  ["ai-agents", 5, "88086117"],
  ["ai-system-design", 6, "a638570f"],
  ["behavioral-stories", 5, "86e8288a"],
  ["resume-apply", 4, "9ca81af7"],
  ["mock-interviews", 4, "a2d2488e"],
  ["revision-1", 3, "1f748e9"],
  ["revision-2", 3, "9ea98c84"],
  ["revision-3", 2, "7786f64b"],
];

describe("data/syllabus.json", () => {
  it("has unique topic ids", () => {
    const ids = topics.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(topics)("$id has a valid track, week, level and non-empty subtopics", (t) => {
    expect(tracks.some((tr) => tr.id === t.track)).toBe(true);
    expect(t.week).toBeGreaterThanOrEqual(1);
    expect(t.level).toBeGreaterThanOrEqual(1);
    expect(t.level).toBeLessThanOrEqual(4);
    expect(t.subtopics.length).toBeGreaterThan(0);
  });

  it.each(BASELINE)("%s's recorded subtopics are never reordered, edited or deleted", (id, count, hash) => {
    const topic = topics.find((t) => t.id === id);
    expect(topic, `${id} must still exist`).toBeDefined();
    expect(topic!.subtopics.length, `${id} lost subtopics — only appending is allowed`).toBeGreaterThanOrEqual(count);
    expect(djb2(topic!.subtopics.slice(0, count).join("\u0000")), `${id}'s first ${count} subtopics changed`).toBe(hash);
  });
});
