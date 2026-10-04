import { describe, expect, it } from "vitest";
import { extractJdTerms, matchKeywords, scoreResume } from "@/modules/jobs/domain/ats";
import { headingOf, parseResumeText } from "@/modules/resume/domain/resume";

const GOOD = `Aarav Sharma
aarav@example.com | +91 98765 43210 | linkedin.com/in/aarav | github.com/aarav

SUMMARY
Backend engineer with 3 years building Node.js and PostgreSQL services.

EXPERIENCE
Software Engineer | Acme Pay | Jun 2022 - Present
• Built a payments API in Node.js and TypeScript handling 2M requests per day with p99 under 120 ms
• Reduced checkout latency by 38% by adding Redis caching and tuning PostgreSQL indexes
• Led migration of 14 services to Docker and Kubernetes, cutting deploy time from 40 to 8 minutes
• Mentored 3 interns and introduced code review checklists across a team of 9

PROJECTS
URL Shortener | Next.js, MongoDB
• Designed a sharded short-code generator serving 10k redirects per second in load tests
• Wrote integration tests with Jest reaching 92% coverage

EDUCATION
B.Tech Computer Science, NIT Trichy | 2018 - 2022

SKILLS
JavaScript, TypeScript, Node.js, React, Next.js, PostgreSQL, MongoDB, Redis, Docker, Kubernetes, AWS, Git, Jest, REST APIs, System Design
`;

const WEAK = `RESUME
I am a hard-working team player.
Experience
Responsible for various things at a company.
Worked on bugs etc.
`;

describe("resume parsing", () => {
  it("recognises headings with decoration and case", () => {
    expect(headingOf("WORK EXPERIENCE")).toBe("experience");
    expect(headingOf("Technical Skills:")).toBe("skills");
    expect(headingOf("— Projects —")).toBe("projects");
    expect(headingOf("Built a project for users")).toBeNull();
  });

  it("extracts contact, sections, bullets and dates", () => {
    const d = parseResumeText(GOOD);
    expect(d.contact).toMatchObject({ name: "Aarav Sharma", email: "aarav@example.com" });
    expect(d.contact.links.some((l) => l.includes("linkedin.com/in/aarav"))).toBe(true);
    expect(d.experience).toHaveLength(1);
    expect(d.experience[0]!.bullets).toHaveLength(4);
    expect(d.experience[0]!.dates).toMatch(/2022/);
    expect(d.projects[0]!.bullets).toHaveLength(2);
    expect(d.skills).toContain("PostgreSQL");
    expect(d.education[0]!.dates).toMatch(/2018/);
  });

  it("joins lines wrapped by PDF extraction back into their bullet", () => {
    const d = parseResumeText("Jo Dev\njo@x.dev\nEXPERIENCE\nEngineer | Acme | 2021 - 2023\n• Built an API handling 2M requests per day with p99 under 12\n0 ms and tracing across all the services\n• Cut costs by 30%\nSKILLS\nNode.js, SQL");
    expect(d.experience).toHaveLength(1);
    expect(d.experience[0]!.bullets).toHaveLength(2);
    expect(d.experience[0]!.bullets[0]).toContain("12 0 ms");
  });

  it("never throws on junk", () => {
    expect(() => parseResumeText("")).not.toThrow();
    expect(() => parseResumeText("\u0000\u0001 ### ||| 🚀🚀")).not.toThrow();
  });
});

describe("ATS score", () => {
  it("rates a solid resume well and a thin one poorly, with fixes", () => {
    const good = scoreResume(GOOD);
    const weak = scoreResume(WEAK);
    expect(good.score).toBeGreaterThanOrEqual(75);
    expect(weak.score).toBeLessThan(45);
    expect(good.score).toBeGreaterThan(weak.score);
    expect(weak.topFixes.length).toBeGreaterThan(0);
    expect(weak.checks.find((c) => c.id === "language")!.score).toBeLessThan(0.6);
    expect(good.checks.find((c) => c.id === "metrics")!.score).toBe(1);
  });

  it("flags column and icon formatting risks", () => {
    const messy = `${GOOD}\n☎ call me\n${"Skill A        Skill B        Skill C\n".repeat(5)}`;
    expect(scoreResume(messy).checks.find((c) => c.id === "format")!.score).toBeLessThan(0.7);
  });

  it("every check score is within 0-1 and the total is 0-100", () => {
    for (const t of [GOOD, WEAK, ""]) {
      const r = scoreResume(t);
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      for (const c of r.checks) expect(c.score >= 0 && c.score <= 1).toBe(true);
    }
  });
});

const JD = `We are hiring a Backend Engineer.
Requirements:
- 3+ years with Node.js and TypeScript
- Strong SQL and PostgreSQL, plus MongoDB
- Experience with Kafka and microservices, REST APIs
- Docker and AWS
Nice to have:
- Kubernetes, GraphQL
`;

describe("JD keyword match", () => {
  it("extracts terms, canonicalising spellings and marking nice-to-haves last", () => {
    const terms = extractJdTerms(JD);
    const names = terms.map((t) => t.term);
    expect(names).toEqual(expect.arrayContaining(["node.js", "typescript", "sql", "postgresql", "kafka", "docker", "aws", "kubernetes", "graphql"]));
    expect(terms.find((t) => t.term === "kubernetes")!.nice).toBe(true);
    expect(terms.find((t) => t.term === "kafka")!.nice).toBe(false);
    const firstNice = terms.findIndex((t) => t.nice);
    expect(terms.slice(firstNice).every((t) => t.nice)).toBe(true);
  });

  it("matches aliases and reports what is missing", () => {
    const m = matchKeywords(GOOD, JD);
    expect(m.hits.find((h) => h.term === "node.js")!.found).toBe(true);
    expect(m.hits.find((h) => h.term === "postgresql")!.found).toBe(true);
    expect(m.hits.find((h) => h.term === "kafka")!.found).toBe(false);
    expect(m.hits.find((h) => h.term === "graphql")!.found).toBe(false);
    expect(m.matchPct).toBeGreaterThan(40);
    expect(m.matchPct).toBeLessThan(100);
  });

  it("does not match a term inside another word", () => {
    expect(matchKeywords("I like javascripting and goal setting", "Needs Java and Go experience").hits.every((h) => !h.found)).toBe(true);
  });

  it("adds a JD check and lowers the score when keywords are missing", () => {
    const withJd = scoreResume(GOOD, { jd: JD });
    expect(withJd.checks.some((c) => c.id === "keywords")).toBe(true);
    expect(withJd.missing).toContain("kafka");
    const other = scoreResume(GOOD, { jd: "Looking for a Rust, Go and Cassandra expert with Terraform and gRPC experience for our platform team." });
    expect(other.score).toBeLessThan(withJd.score);
  });
});
