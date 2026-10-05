import { describe, expect, it } from "vitest";
import { bestProfileMatch, experienceFit, jobProfileSchema, matchProfile, profileRejection, requiredYears, type ProfilePosting } from "@/modules/jobs/domain/job-profile";

const now = new Date("2026-10-05T00:00:00Z");
const ctx = { resumeTerms: null, targetNames: [], now };
const posting = (over: Partial<ProfilePosting> = {}): ProfilePosting => ({ title: "Backend Engineer", company: "Acme", location: "Bengaluru", remote: false, postedAt: now, tier: "", terms: ["node", "postgres"], ...over });
const profile = (over: Record<string, unknown> = {}) => jobProfileSchema.parse({ name: "Backend", roles: ["backend"], locations: ["Bengaluru"], ...over });

describe("requiredYears", () => {
  it.each([
    ["3-5 years of experience", 3],
    ["3 to 5 yrs experience in backend", 3],
    ["5+ years of experience with Node", 5],
    ["Minimum 2 years building APIs", 2],
    ["at least 4 years", 4],
    ["We have a 10 year history of excellence", null],
    ["No mention of experience", null],
  ])("%s -> %s", (text, expected) => expect(requiredYears(text)).toBe(expected));
});

describe("profile filters", () => {
  it("hides jobs that ask for much more experience than you have", () => {
    const p = profile({ experienceYears: 2 });
    expect(experienceFit(p, 3)).toBe(true);
    expect(experienceFit(p, 5)).toBe(false);
    expect(experienceFit(p, null)).toBe(true);
    expect(profileRejection(posting({ yearsMin: 6 }), p)).toMatch(/6\+ years/);
  });

  it("requires every must keyword and rejects any excluded one", () => {
    const p = profile({ mustKeywords: ["node"], excludeKeywords: ["php"] });
    expect(profileRejection(posting(), p)).toBeNull();
    expect(profileRejection(posting({ terms: ["go"] }), p)).toMatch(/node/);
    expect(profileRejection(posting({ terms: ["node", "php"] }), p)).toMatch(/php/);
  });

  it("scores through the usual matcher and flags excluded postings", () => {
    const p = profile({ excludeKeywords: ["postgres"] });
    expect(matchProfile(posting(), ctx, p).excluded).toBe(true);
    const ok = matchProfile(posting(), ctx, profile());
    expect(ok.excluded).toBe(false);
    expect(ok.score).toBeGreaterThan(60);
  });

  it("picks the best enabled profile that clears its threshold", () => {
    const a = profile({ name: "A", roles: ["data scientist"], minScore: 60 });
    const b = profile({ name: "B" });
    const off = profile({ name: "C", enabled: false });
    expect(bestProfileMatch(posting(), ctx, [a, off])).toBeNull();
    expect(bestProfileMatch(posting(), ctx, [a, b, off])?.profile.name).toBe("B");
  });

  it("requires a name", () => {
    expect(jobProfileSchema.safeParse({ name: " " }).success).toBe(false);
  });
});
