import { describe, expect, it } from "vitest";
import { searchJobs, sortJobs } from "@/modules/jobs/domain/job-list";

const j = (title: string, company: string, extra: Partial<{ location: string; followUpOn: string | null; atsScore: number | null }> = {}) => ({ title, company, location: "", followUpOn: null, atsScore: null, ...extra });
const jobs = [j("Backend Engineer", "Razorpay", { location: "Bengaluru", followUpOn: "2026-10-12", atsScore: 70 }), j("SDE 2", "Acme", { followUpOn: "2026-10-09", atsScore: 85 }), j("Node Developer", "zeta", { atsScore: 60 })];

describe("searchJobs", () => {
  it("matches every word in the title, company or location, ignoring case", () => {
    expect(searchJobs(jobs, "backend bengaluru").map((x) => x.company)).toEqual(["Razorpay"]);
    expect(searchJobs(jobs, "ACME").map((x) => x.title)).toEqual(["SDE 2"]);
    expect(searchJobs(jobs, "backend acme")).toEqual([]);
  });
  it("keeps everything for an empty search and never mutates", () => {
    expect(searchJobs(jobs, "  ")).toHaveLength(3);
    expect(searchJobs(jobs, "x")).not.toBe(jobs);
  });
});

describe("sortJobs", () => {
  it("orders by follow-up, company and ATS score, with missing values last", () => {
    expect(sortJobs(jobs, "follow-up").map((x) => x.company)).toEqual(["Acme", "Razorpay", "zeta"]);
    expect(sortJobs(jobs, "company").map((x) => x.company)).toEqual(["Acme", "Razorpay", "zeta"]);
    expect(sortJobs(jobs, "ats").map((x) => x.atsScore)).toEqual([85, 70, 60]);
    expect(sortJobs([j("a", "A"), j("b", "B", { atsScore: 1 })], "ats").map((x) => x.company)).toEqual(["B", "A"]);
  });
  it("recent keeps the incoming order and does not mutate", () => {
    const copy = [...jobs];
    expect(sortJobs(jobs, "recent")).toEqual(copy);
    expect(jobs).toEqual(copy);
  });
});
