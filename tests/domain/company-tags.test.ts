import { describe, expect, it } from "vitest";
import { companyDataset, problems } from "@/core/content";
import { buildCompanyDataset, companySlug, displayCompanyName, parseCompanyCsv, regionOf, splitCsvLine } from "@/modules/dsa/domain/company-csv";
import {
  attachCompanyTags,
  companiesByLocalSlug,
  companiesForQuestion,
  companyQuestions,
  leetcodeSlugOf,
  localSlugByLeetcode,
  topCompanies,
  type CompanyDataset,
} from "@/modules/dsa/domain/company-tags";
import type { ExternalQuestion } from "@/modules/dsa/domain/external-catalogue";

const HEADER = "Difficulty,Title,Frequency,Acceptance Rate,Link,Topics";
const SOURCE: CompanyDataset["source"] = { name: "test", url: "https://github.com/x/y", datasetDate: "2025-06-20", importedAt: "2026-10-08", note: "test data" };

function fixture(): CompanyDataset {
  return buildCompanyDataset(
    [
      {
        folder: "Acme",
        files: {
          "1. Thirty Days.csv": `${HEADER}\nEASY,Two Sum,100.0,0.5,https://leetcode.com/problems/two-sum,"Array, Hash Table"`,
          "5. All.csv": `${HEADER}\nEASY,Two Sum,90.0,0.5,https://leetcode.com/problems/two-sum,"Array, Hash Table"\nHARD,Trapping Rain Water,40.25,0.5,https://leetcode.com/problems/trapping-rain-water,"Array, Stack"`,
        },
      },
      { folder: "swiggy", files: { "3. Six Months.csv": `${HEADER}\nMEDIUM,3Sum,55,0.3,https://leetcode.com/problems/3sum,"Array, Two Pointers"` } },
      { folder: "Empty", files: { "5. All.csv": HEADER } },
    ],
    SOURCE,
  );
}

describe("company CSV parsing", () => {
  it("splits quoted fields and escaped quotes", () => {
    expect(splitCsvLine('a,"b, c","say ""hi"""')).toEqual(["a", "b, c", 'say "hi"']);
  });

  it("parses rows, rounds frequency and skips bad rows", () => {
    const rows = parseCompanyCsv(`${HEADER}\nMEDIUM,Add Two Numbers,78.66,0.4,https://leetcode.com/problems/add-two-numbers,"Linked List, Math"\nODD,Bad,1,1,nope,""`);
    expect(rows).toEqual([{ difficulty: "Medium", title: "Add Two Numbers", frequency: 78.7, slug: "add-two-numbers", topics: ["Linked List", "Math"] }]);
  });

  it("cleans names and tags Indian companies", () => {
    expect(displayCompanyName("tcs")).toBe("TCS");
    expect(displayCompanyName("josh technology")).toBe("Josh Technology");
    expect(companySlug("J.P. Morgan")).toBe("j-p-morgan");
    expect(regionOf("Flipkart")).toBe("india");
    expect(regionOf("Google")).toBe("global");
  });
});

describe("company dataset", () => {
  it("builds windows, counts and drops empty companies", () => {
    const data = fixture();
    expect(data.companies.map((c) => c.name)).toEqual(["Acme", "Swiggy"]);
    expect(data.companies[0].counts).toEqual([1, 0, 0, 2]);
    expect(data.companies[1]).toMatchObject({ region: "india", counts: [0, 0, 1, 1] });
    expect(data.questions["two-sum"].tags).toEqual([[0, 100, 0, 0, 90]]);
  });

  it("answers window queries", () => {
    const data = fixture();
    expect(companiesForQuestion(data, "two-sum", "d30").map((c) => c.company)).toEqual(["Acme"]);
    expect(companiesForQuestion(data, "3sum", "d30")).toEqual([]);
    expect(companyQuestions(data, "acme").map((q) => q.leetcodeSlug)).toEqual(["two-sum", "trapping-rain-water"]);
    expect(companyQuestions(data, "acme", "all", "difficulty").map((q) => q.difficulty)).toEqual(["Easy", "Hard"]);
    expect(topCompanies(data, { region: "india" }).map((c) => c.slug)).toEqual(["swiggy"]);
    expect(topCompanies(data, { window: "d30" }).map((c) => c.slug)).toEqual(["acme"]);
  });

  it("matches local problems through their LeetCode URL", () => {
    expect(leetcodeSlugOf("https://leetcode.com/problems/two-sum/description/")).toBe("two-sum");
    const local = [{ slug: "my-two-sum", url: "https://leetcode.com/problems/two-sum/" }];
    expect(localSlugByLeetcode(local).get("two-sum")).toBe("my-two-sum");
    expect(companiesByLocalSlug(fixture(), local)).toEqual({ "my-two-sum": ["Acme"] });
  });
});

describe("imported company data", () => {
  it("is large, sourced and tags the classics", () => {
    expect(companyDataset.companies.length).toBeGreaterThan(300);
    expect(companyDataset.companies.some((c) => c.region === "india")).toBe(true);
    expect(companyDataset.source.url).toMatch(/^https:\/\/github\.com\//);
    expect(companiesForQuestion(companyDataset, "two-sum").map((c) => c.company)).toContain("Amazon");
  });

  it("indexes stay inside the company and topic lists", () => {
    for (const q of Object.values(companyDataset.questions)) {
      expect(q.tags.every((t) => t[0] < companyDataset.companies.length)).toBe(true);
      expect(q.topics.every((t) => t < companyDataset.topics.length)).toBe(true);
    }
  });

  it("attaches dataset tags to sheet questions", () => {
    const question = { id: "two-sum", sheetId: "sheet", order: 1, section: "Arrays", category: "Arrays", difficulty: "Easy", title: "Two Sum", localSlug: "two-sum", links: [], companies: [], sourceCoverage: "exact" } satisfies ExternalQuestion;
    const tagged = attachCompanyTags(question, problems, companyDataset);
    expect(tagged.companies[0]).toEqual({ company: expect.any(String), confidence: "medium", sourceKind: "leetcode" });
    expect(tagged.companies.length).toBeLessThanOrEqual(12);
    const linkOnly = { ...question, localSlug: undefined, title: "Unknown title", links: [{ kind: "practice" as const, label: "LC", url: "https://leetcode.com/problems/trapping-rain-water/", scope: "item" as const }] };
    expect(attachCompanyTags(linkOnly, problems, companyDataset).companies.length).toBeGreaterThan(0);
  });
});
