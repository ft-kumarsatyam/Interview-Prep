import { describe, expect, it } from "vitest";
import { buildSkillIndex, readiness, studyPlan, type SyllabusSkill } from "@/modules/jobs/domain/job-readiness";

const sk = (id: string, title: string, terms: string[], topicId = id.split(":")[0]!): SyllabusSkill => ({ id, topicId, title, topicTitle: topicId.toUpperCase(), terms });
const SKILLS = [
  sk("sql:0", "Joins", ["SQL"]),
  sk("sql:1", "Indexes", ["SQL", "PostgreSQL"]),
  sk("sys:0", "Caching", ["Redis", "Caching"]),
  sk("sys:1", "Queues", ["Kafka", "Redis"]),
  sk("net:0", "TCP", ["TCP"]),
];
const index = buildSkillIndex(SKILLS);

describe("buildSkillIndex", () => {
  it("lists teachers per term in the given order", () => {
    expect(index.get("SQL")!.map((s) => s.id)).toEqual(["sql:0", "sql:1"]);
    expect(index.get("Redis")!.map((s) => s.id)).toEqual(["sys:0", "sys:1"]);
    expect(index.get("Go")).toBeUndefined();
  });
});

describe("readiness", () => {
  const base = { index, studied: new Set(["sql:1"]) };

  it("sorts each skill into exactly one of the four states", () => {
    const r = readiness({ ...base, jobTerms: ["SQL", "PostgreSQL", "Redis", "Go"], resumeTerms: new Set(["PostgreSQL"]) });
    expect(r.inResume).toEqual(["PostgreSQL"]);
    expect(r.addToResume).toEqual([{ term: "SQL", via: { id: "sql:1", topicId: "sql", title: "Indexes", topicTitle: "SQL" } }]);
    expect(r.toStudy.map((t) => t.term)).toEqual(["Redis"]);
    expect(r.outsideSyllabus).toEqual(["Go"]);
    const all = [...r.inResume, ...r.addToResume.map((a) => a.term), ...r.toStudy.map((t) => t.term), ...r.outsideSyllabus];
    expect(all.toSorted()).toEqual(r.required.toSorted());
  });

  it("computes readiness and resume percentages", () => {
    const r = readiness({ ...base, jobTerms: ["SQL", "PostgreSQL", "Redis", "Go"], resumeTerms: new Set(["PostgreSQL"]) });
    expect(r.readyPct).toBe(50); // PostgreSQL + SQL
    expect(r.resumePct).toBe(25);
  });

  it("de-duplicates the job's skills", () => {
    expect(readiness({ ...base, jobTerms: ["SQL", "SQL", "SQL"], resumeTerms: new Set() }).required).toEqual(["SQL"]);
  });

  it("returns null percentages when the job lists no skills", () => {
    expect(readiness({ ...base, jobTerms: [], resumeTerms: new Set() })).toMatchObject({ readyPct: null, resumePct: null, required: [] });
  });

  it("without a resume, studied skills become 'add to resume' and nothing is on the resume", () => {
    const r = readiness({ ...base, jobTerms: ["SQL", "TCP"], resumeTerms: null });
    expect(r.inResume).toEqual([]);
    expect(r.addToResume.map((a) => a.term)).toEqual(["SQL"]);
    expect(r.toStudy.map((t) => t.term)).toEqual(["TCP"]);
    expect(r.resumePct).toBe(0);
  });

  it("offers at most three nearest subtopics to study, in syllabus order", () => {
    const many = buildSkillIndex(Array.from({ length: 6 }, (_, i) => sk(`x:${i}`, `T${i}`, ["Docker"])));
    const r = readiness({ jobTerms: ["Docker"], resumeTerms: new Set(), index: many, studied: new Set() });
    expect(r.toStudy[0]!.steps.map((s) => s.id)).toEqual(["x:0", "x:1", "x:2"]);
  });

  it("a studied subtopic of another term does not count", () => {
    const r = readiness({ jobTerms: ["TCP"], resumeTerms: new Set(), index, studied: new Set(["sql:0"]) });
    expect(r.addToResume).toEqual([]);
    expect(r.readyPct).toBe(0);
  });
});

describe("studyPlan", () => {
  it("ranks the subtopics that close the most skills first and caps the list", () => {
    const r = readiness({ jobTerms: ["Redis", "Kafka", "TCP"], resumeTerms: new Set(), index, studied: new Set() });
    const plan = studyPlan(r, 2);
    expect(plan).toHaveLength(2);
    expect(plan[0]).toMatchObject({ id: "sys:1", closes: ["Redis", "Kafka"] });
    expect(plan[1]!.closes.length).toBeGreaterThanOrEqual(1);
  });
  it("is empty when nothing is left to study", () => {
    const r = readiness({ jobTerms: ["SQL"], resumeTerms: new Set(["SQL"]), index, studied: new Set() });
    expect(studyPlan(r)).toEqual([]);
  });
});
