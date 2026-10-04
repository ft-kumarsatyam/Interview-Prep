import { describe, expect, it } from "vitest";
import { canonicalJobUrl, companyKey, dueFollowUps, followUpFor, htmlToPlain, jobCaptureSchema, matchTarget, pipelineCounts, profileCaptureSchema, sourceFromUrl } from "@/modules/jobs/domain/jobs";

describe("sourceFromUrl", () => {
  it("recognises the four boards and everything else", () => {
    expect(sourceFromUrl("https://www.naukri.com/job-listings-backend-engineer-acme-bengaluru-3-to-6-years-101025012345")).toBe("naukri");
    expect(sourceFromUrl("https://in.linkedin.com/jobs/view/123456789")).toBe("linkedin");
    expect(sourceFromUrl("https://in.indeed.com/viewjob?jk=abc123")).toBe("indeed");
    expect(sourceFromUrl("https://wellfound.com/jobs/3456-backend")).toBe("wellfound");
    expect(sourceFromUrl("https://careers.acme.com/jobs/1")).toBe("other");
    expect(sourceFromUrl("https://notlinkedin.com/x")).toBe("other");
    expect(sourceFromUrl("javascript:alert(1)")).toBe("other");
  });
});

describe("canonicalJobUrl", () => {
  it("gives the same key however a LinkedIn job is reached", () => {
    const a = canonicalJobUrl("https://www.linkedin.com/jobs/view/backend-engineer-at-acme-3801234567/?trk=public_jobs&refId=x");
    const b = canonicalJobUrl("https://in.linkedin.com/jobs/view/3801234567");
    const c = canonicalJobUrl("https://www.linkedin.com/jobs/collections/recommended/?currentJobId=3801234567");
    expect(a).toBe("linkedin:3801234567");
    expect(b).toBe(a);
    expect(c).toBe(a);
  });
  it("uses the board's own ids for Indeed, Naukri and Wellfound", () => {
    expect(canonicalJobUrl("https://in.indeed.com/viewjob?jk=abc123&from=serp")).toBe("indeed:abc123");
    expect(canonicalJobUrl("https://www.naukri.com/job-listings-backend-engineer-acme-bengaluru-3-to-6-years-101025012345?src=jobsearchDesk")).toBe("naukri:101025012345");
    expect(canonicalJobUrl("https://wellfound.com/jobs/3456-backend-engineer")).toBe("wellfound:3456");
  });
  it("strips tracking parameters and fragments for other sites", () => {
    expect(canonicalJobUrl("https://careers.acme.com/jobs/12/?utm_source=x&gh_jid=77#apply")).toBe("careers.acme.com/jobs/12?gh_jid=77");
  });
  it("rejects non-web URLs", () => {
    expect(canonicalJobUrl("javascript:alert(1)")).toBeNull();
    expect(canonicalJobUrl("not a url")).toBeNull();
    expect(canonicalJobUrl("file:///etc/passwd")).toBeNull();
  });
});

describe("capture schemas treat site text as untrusted", () => {
  const ok = { title: "Backend Engineer", company: "Acme", url: "https://in.indeed.com/viewjob?jk=abc", jd: "Build things" };
  it("accepts a normal capture and trims", () => {
    expect(jobCaptureSchema.parse({ ...ok, title: "  Backend Engineer " }).title).toBe("Backend Engineer");
  });
  it("rejects non-http URLs, empty names and oversized text", () => {
    expect(jobCaptureSchema.safeParse({ ...ok, url: "javascript:alert(1)" }).success).toBe(false);
    expect(jobCaptureSchema.safeParse({ ...ok, applyUrl: "data:text/html,x" }).success).toBe(false);
    expect(jobCaptureSchema.safeParse({ ...ok, company: "" }).success).toBe(false);
    expect(jobCaptureSchema.safeParse({ ...ok, jd: "x".repeat(20_001) }).success).toBe(false);
  });
  it("profiles need real text", () => {
    expect(profileCaptureSchema.safeParse({ url: "https://www.linkedin.com/in/me", text: "short" }).success).toBe(false);
    expect(profileCaptureSchema.safeParse({ url: "https://www.linkedin.com/in/me", text: "x".repeat(200) }).success).toBe(true);
  });
});

describe("follow-ups and counts", () => {
  it("schedules by status", () => {
    expect(followUpFor("applied", "2026-10-05")).toBe("2026-10-12");
    expect(followUpFor("screening", "2026-10-05")).toBe("2026-10-09");
    expect(followUpFor("interview", "2026-10-05")).toBe("2026-10-07");
    expect(followUpFor("saved", "2026-10-05")).toBeNull();
    expect(followUpFor("rejected", "2026-10-05")).toBeNull();
  });
  it("lists only active jobs that are due, oldest first", () => {
    const jobs = [
      { id: "a", status: "applied" as const, followUpOn: "2026-10-04" },
      { id: "b", status: "interview" as const, followUpOn: "2026-10-01" },
      { id: "c", status: "rejected" as const, followUpOn: "2026-10-01" },
      { id: "d", status: "applied" as const, followUpOn: "2026-10-09" },
      { id: "e", status: "saved" as const, followUpOn: null },
    ];
    expect(dueFollowUps(jobs, "2026-10-05").map((j) => j.id)).toEqual(["b", "a"]);
    expect(pipelineCounts(jobs)).toMatchObject({ applied: 2, interview: 1, rejected: 1, saved: 1, offer: 0 });
  });
});

describe("matchTarget", () => {
  const targets = [{ name: "Razorpay" }, { name: "Google" }, { name: "Walmart Global Tech" }];
  it("ignores suffixes and case", () => {
    expect(companyKey("Razorpay Software Pvt. Ltd.")).toBe("razorpay");
    expect(matchTarget("RAZORPAY SOFTWARE PRIVATE LIMITED", targets)?.name).toBe("Razorpay");
    expect(matchTarget("Google India", targets)?.name).toBe("Google");
    expect(matchTarget("Walmart", targets)?.name).toBe("Walmart Global Tech");
  });
  it("does not match unrelated or too-short names", () => {
    expect(matchTarget("Googly Eyes Inc", targets)).toBeUndefined();
    expect(matchTarget("A", targets)).toBeUndefined();
  });
});

describe("htmlToPlain", () => {
  it("keeps structure as text and drops scripts and tags", () => {
    const t = htmlToPlain("<p>Build &amp; ship</p><script>alert(1)</script><ul><li>Node.js</li><li>SQL</li></ul>");
    expect(t).toContain("Build & ship");
    expect(t).toContain("• Node.js");
    expect(t).not.toMatch(/script|alert|<|>/);
  });
});
