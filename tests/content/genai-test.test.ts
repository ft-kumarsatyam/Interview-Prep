import { describe, expect, it } from "vitest";
import { genaiPlaybookPlan as plan } from "@/core/genai-playbook";
import { genaiTestWeekMap, levelMcqs, levelTopics, roadmapNodeKeys, testPool } from "@/core/genai-test";

describe("data/genai-test", () => {
  it("maps every playbook week to real roadmap levels", () => {
    expect(genaiTestWeekMap.weeks.map((w) => w.week)).toEqual(plan.weeks.map((w) => w.id));
    const levels = new Set(levelTopics().map((l) => l.level));
    for (const w of genaiTestWeekMap.weeks) {
      expect(w.levels.length, w.week).toBeGreaterThan(0);
      for (const l of w.levels) expect(levels.has(l), `${w.week} level ${l}`).toBe(true);
    }
  });

  it("has valid, unique level MCQs for every module node", () => {
    const nodes = roadmapNodeKeys();
    const ids = levelMcqs.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    const per = new Map<string, number>();
    for (const m of levelMcqs) {
      expect(nodes.has(m.node), `${m.id}: node ${m.node}`).toBe(true);
      expect(Number(m.node.match(/^m(\d+)-/)![1]), m.id).toBe(m.level);
      expect(new Set(m.options.map((o) => o.toLowerCase())).size, m.id).toBe(m.options.length);
      per.set(m.node, (per.get(m.node) ?? 0) + 1);
    }
    for (const node of nodes.keys()) expect(per.get(node) ?? 0, node).toBeGreaterThanOrEqual(2);
  });

  it("does not skew the correct option towards one position", () => {
    const counts = [0, 0, 0, 0];
    for (const m of levelMcqs) counts[m.answer]++;
    for (const c of counts) expect(c / levelMcqs.length).toBeLessThan(0.4);
  });

  it("builds a pool with questions for every playbook week", async () => {
    const pool = await testPool();
    const ids = [...pool.mcq, ...pool.written].map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const w of plan.weeks) {
      expect(pool.mcq.filter((q) => q.weekId === w.id).length, w.id).toBeGreaterThan(0);
      expect(pool.written.filter((q) => q.weekId === w.id).length, w.id).toBeGreaterThan(0);
    }
    for (const q of pool.mcq) expect(q.answer).toBeLessThan(q.options.length);
  });
});
