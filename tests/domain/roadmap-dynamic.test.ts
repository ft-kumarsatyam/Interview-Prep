import { describe, expect, it } from "vitest";
import { collectResources, demandByNode, nextNodes, roadmapProblems, roadmapSchema, trackProgress, type NodeStatus } from "@/modules/roadmap/domain/roadmap";

const node = (id: string, priority: "must" | "can" | "skip", extra: Record<string, unknown> = {}) => ({
  id,
  title: id.toUpperCase(),
  summary: `Summary for ${id} node`,
  priority,
  checklist: ["one", "two", "three", "four"],
  links: [{ title: `${id} docs`, url: `https://example.com/${id}`, kind: "docs" }],
  ...extra,
});
const roadmap = roadmapSchema.parse({
  id: "demo",
  title: "Demo",
  blurb: "A demo roadmap for tests.",
  audience: "Testers",
  tracks: [
    { id: "agents", title: "Agent engineer", blurb: "Agents and tools first.", sections: ["agents"] },
    { id: "all", title: "Everything", blurb: "Every section of the roadmap.", sections: ["basics", "agents"] },
  ],
  sections: [
    { id: "basics", title: "Basics", nodes: [node("python", "must", { skills: ["python"] }), node("math", "can")] },
    { id: "agents", title: "Agents", nodes: [node("loop", "must", { skills: ["ai agents", "langgraph"] }), node("rag", "must", { skills: ["rag"], links: [{ title: "shared", url: "https://example.com/python", kind: "docs" }] }), node("old", "skip")] },
  ],
});
const st = (done: boolean): NodeStatus => ({ reading: null, practice: null, quiz: null, checklist: null, topics: { done: 0, total: 0 }, manual: done, done, parts: { done: 0, total: 0 } });
const statuses = (done: string[]) => new Map(roadmap.sections.flatMap((s) => s.nodes).map((n) => [n.id, st(done.includes(n.id))]));

describe("nextNodes", () => {
  it("lists open must-dos first, then can-dos, never skippable ones", () => {
    expect(nextNodes(roadmap, statuses([]), 10).map((n) => n.id)).toEqual(["python", "loop", "rag", "math"]);
    expect(nextNodes(roadmap, statuses(["python"]), 2).map((n) => n.id)).toEqual(["loop", "rag"]);
  });
  it("stays inside a track's sections", () => {
    const track = roadmap.tracks[0]!;
    expect(nextNodes(roadmap, statuses([]), 10, track).map((n) => n.id)).toEqual(["loop", "rag"]);
  });
});

describe("trackProgress", () => {
  it("reports percent and the sections that still have open must-dos", () => {
    const [agents, all] = trackProgress(roadmap, statuses(["loop", "python"]));
    expect(agents!.must).toEqual({ done: 1, total: 2 });
    expect(agents!.pct).toBe(50);
    expect(agents!.gaps).toEqual([{ sectionId: "agents", open: 1, total: 2 }]);
    expect(all!.pct).toBe(67);
    expect(all!.gaps.map((g) => g.sectionId)).toEqual(["agents"]);
  });
});

describe("collectResources", () => {
  it("merges a link used by several nodes into one entry", () => {
    const shared = collectResources(roadmap).find((r) => r.url === "https://example.com/python")!;
    expect(shared.nodes.map((n) => n.id)).toEqual(["python", "rag"]);
    expect(collectResources(roadmap)).toHaveLength(4);
  });
});

describe("demandByNode", () => {
  const jobs = [["python", "rag"], ["rag", "langgraph", "ai agents"], ["java"]];
  it("counts each job once per node and orders by demand", () => {
    const out = demandByNode(roadmap, jobs, statuses([]));
    expect(out.map((d) => [d.nodeId, d.jobs])).toEqual([["rag", 2], ["python", 1], ["loop", 1]]);
    expect(out.find((d) => d.nodeId === "loop")!.skills).toHaveLength(2);
  });
  it("flags nodes you finished and honours the limit", () => {
    expect(demandByNode(roadmap, jobs, statuses(["rag"])).find((d) => d.nodeId === "rag")!.done).toBe(true);
    expect(demandByNode(roadmap, jobs, statuses([]), 1)).toHaveLength(1);
    expect(demandByNode(roadmap, [], statuses([]))).toEqual([]);
  });
});

describe("roadmapProblems tracks", () => {
  it("rejects a track that names a missing section", () => {
    const bad = { ...roadmap, tracks: [{ id: "x", title: "X", blurb: "A broken track here.", sections: ["nope"] }] };
    const known = { problem: () => true, lesson: () => true, quiz: () => true };
    expect(roadmapProblems([bad], known)).toContain("demo: track x names unknown section nope");
    expect(roadmapProblems([roadmap], known)).toEqual([]);
  });
});
