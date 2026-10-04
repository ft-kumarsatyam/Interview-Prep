import { describe, expect, it } from "vitest";
import { buildCatalog, filterCatalog, recommend, subjectCounts, subjectOfTopic, type CatalogInput } from "@/modules/practice/domain/catalog";

describe("subjectOfTopic", () => {
  it("maps tracks to subjects and splits the CS track", () => {
    expect(subjectOfTopic({ id: "dsa-dp", track: "dsa" })).toBe("dsa");
    expect(subjectOfTopic({ id: "hld-framework", track: "hld" })).toBe("hld");
    expect(subjectOfTopic({ id: "os-memory-management", track: "cs" })).toBe("os");
    expect(subjectOfTopic({ id: "net-basics", track: "cs" })).toBe("networking");
    expect(subjectOfTopic({ id: "security", track: "cs" })).toBe("networking");
    expect(subjectOfTopic({ id: "sql-basics", track: "dbms" })).toBe("dbms");
  });
});

const input: CatalogInput = {
  topics: [
    { id: "os-memory-management", title: "Memory management", track: "cs", questions: 40, subtopics: 6 },
    { id: "dsa-dp", title: "Dynamic programming", track: "dsa", questions: 30, subtopics: 5 },
    { id: "hld-framework", title: "Interview framework", track: "hld", questions: 20, subtopics: 8 },
    { id: "empty", title: "No questions", track: "js", questions: 0, subtopics: 3 },
  ],
  mastery: { "dsa-dp": { bestPct: 90, attempts: 2, masteredOn: "2026-10-02" }, "case:hld:url-shortener": { bestPct: 40, attempts: 1, masteredOn: null }, "case:os:deadlock": { bestPct: 80, attempts: 1, masteredOn: null } },
  studiedPerTopic: { "os-memory-management": 2, "hld-framework": 8 },
  passPct: 60,
  cases: [
    { ref: "case:hld:url-shortener", title: "URL shortener", topicId: "hld-url-shortener", href: "/design/url-shortener", subject: "hld", level: "core" },
    { ref: "case:os:deadlock", title: "Deadlock", topicId: "os-sync-deadlock", href: "/design/os/deadlock", subject: "os", level: "advanced" },
  ],
  code: [{ id: "dsa:two-pointers", subject: "dsa", title: "Two Pointers", total: 10, solved: 10, href: "/dsa" }, { id: "dsa:graphs", subject: "dsa", title: "Graphs", total: 20, solved: 0, href: "/dsa" }],
  flashcards: [{ id: "react", subject: "web", title: "React", total: 30, known: 5, review: 2, href: "/web/interview/react" }],
  aptitude: { total: 750, href: "/aptitude" },
};

describe("buildCatalog", () => {
  const entries = buildCatalog(input);
  const byId = (id: string) => entries.find((e) => e.id === id)!;

  it("skips topics with no questions and covers every kind", () => {
    expect(entries.some((e) => e.id === "quiz:empty")).toBe(false);
    expect(new Set(entries.map((e) => e.kind))).toEqual(new Set(["quiz", "case", "code", "flashcards", "aptitude"]));
  });

  it("derives status from mastery, study progress and counts", () => {
    expect(byId("quiz:dsa-dp").status).toBe("mastered");
    expect(byId("quiz:os-memory-management").status).toBe("started");
    expect(byId("quiz:hld-framework")).toMatchObject({ status: "started", done: 8, total: 8 });
    expect(byId("case:case:hld:url-shortener").status).toBe("started"); // 40% is below the pass mark
    expect(byId("case:case:os:deadlock").status).toBe("mastered");
    expect(byId("code:dsa:two-pointers").status).toBe("mastered");
    expect(byId("code:dsa:graphs").status).toBe("new");
    expect(byId("flashcards:react").status).toBe("started");
  });

  it("puts operating system topics under their own subject", () => {
    expect(byId("quiz:os-memory-management").subject).toBe("os");
  });
});

describe("filterCatalog and subjectCounts", () => {
  const entries = buildCatalog(input);
  const studied = new Set(["os-memory-management", "hld-framework"]);
  it("filters by subject, kind and status", () => {
    expect(filterCatalog(entries, { subject: "os" }, studied).every((e) => e.subject === "os")).toBe(true);
    expect(filterCatalog(entries, { kind: "case" }, studied)).toHaveLength(2);
    expect(filterCatalog(entries, { status: "mastered" }, studied).map((e) => e.id).toSorted()).toEqual(["case:case:os:deadlock", "code:dsa:two-pointers", "quiz:dsa-dp"]);
  });
  it("studiedOnly keeps only practice on topics you have studied", () => {
    expect(filterCatalog(entries, { studiedOnly: true }, studied).map((e) => e.id).toSorted()).toEqual(["quiz:hld-framework", "quiz:os-memory-management"]);
    expect(filterCatalog(entries, { studiedOnly: true }, new Set())).toEqual([]);
  });
  it("counts entries per subject", () => {
    expect(subjectCounts(entries).get("dsa")).toBe(3);
  });
});

describe("recommend", () => {
  const entries = buildCatalog(input);
  it("puts studied, unfinished practice first and never suggests mastered or aptitude", () => {
    const rec = recommend(entries, new Set(["os-memory-management", "hld-framework"]), 3);
    expect(rec.map((e) => e.id)).toEqual(["quiz:os-memory-management", "quiz:hld-framework", "case:case:hld:url-shortener"]);
    expect(recommend(entries, new Set(), 50).every((e) => e.status !== "mastered" && e.kind !== "aptitude")).toBe(true);
  });
});
