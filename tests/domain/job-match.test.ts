import { describe, expect, it } from "vitest";
import { boardSearchLinks, companySearchUrl } from "@/lib/domain/job-links";
import { DEFAULT_PREFS, highlightSegments, jobPrefsSchema, levelOf, matchPosting, roleFit, splitList, type MatchContext, type ScorablePosting } from "@/lib/domain/job-match";

const NOW = new Date("2026-10-05T12:00:00Z");
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const posting = (over: Partial<ScorablePosting> = {}): ScorablePosting => ({ title: "Backend Engineer", company: "Acme", location: "Bengaluru, India", remote: false, postedAt: day(1), tier: "mid-tier", terms: ["node.js", "postgresql", "docker", "kafka"], ...over });
const ctx = (over: Partial<MatchContext> = {}): MatchContext => ({ prefs: { ...DEFAULT_PREFS, roles: ["backend"], locations: ["Bengaluru"] }, resumeTerms: new Set(["node.js", "postgresql", "docker"]), targetNames: [], now: NOW, ...over });

describe("roleFit", () => {
  it("scores how much of the wanted role the title covers", () => {
    expect(roleFit("Senior Backend Engineer", "backend")).toBe(1);
    expect(roleFit("Backend Developer", "backend engineer")).toBeGreaterThan(0.7);
    expect(roleFit("Frontend Engineer", "backend")).toBe(0);
    expect(roleFit("Full Stack Engineer", "full stack developer")).toBeGreaterThan(0.7);
    expect(roleFit("Data Engineer", "software engineer")).toBeLessThan(0.7);
    expect(roleFit("Anything", "")).toBe(0);
  });
});

describe("levelOf", () => {
  it("reads seniority from the title", () => {
    expect(levelOf("Senior Software Engineer")).toBe("senior");
    expect(levelOf("Staff Engineer")).toBe("senior");
    expect(levelOf("Software Engineer Intern")).toBe("entry");
    expect(levelOf("Junior Developer")).toBe("entry");
    expect(levelOf("Software Engineer")).toBe("mid");
  });
});

describe("matchPosting", () => {
  it("rewards a title, skills, place and freshness fit and explains why", () => {
    const m = matchPosting(posting(), ctx());
    expect(m.score).toBeGreaterThanOrEqual(75);
    expect(m.matched).toEqual(["node.js", "postgresql", "docker"]);
    expect(m.missing).toEqual(["kafka"]);
    expect(m.reasons).toEqual(expect.arrayContaining(["Title matches a role you want", "In a place you want", "Posted in the last 3 days"]));
  });
  it("ranks a fitting job above a poor one", () => {
    const good = matchPosting(posting(), ctx()).score;
    const poor = matchPosting(posting({ title: "Frontend Engineer", location: "Berlin", terms: ["react", "css", "html"], postedAt: day(60) }), ctx()).score;
    expect(good).toBeGreaterThan(poor + 30);
  });
  it("treats remote as a place fit only when you allow it", () => {
    const remote = posting({ remote: true, location: "Anywhere" });
    expect(matchPosting(remote, ctx()).reasons).toContain("Remote");
    const noRemote = matchPosting(remote, ctx({ prefs: { ...DEFAULT_PREFS, roles: ["backend"], locations: ["Bengaluru"], remoteOk: false } }));
    expect(noRemote.reasons).toContain("Not in your places");
  });
  it("matches level when you set one", () => {
    const prefs = { ...DEFAULT_PREFS, roles: ["backend"], level: "entry" as const };
    expect(matchPosting(posting({ title: "Junior Backend Engineer" }), ctx({ prefs })).score).toBeGreaterThan(matchPosting(posting({ title: "Staff Backend Engineer" }), ctx({ prefs })).score);
  });
  it("boosts the companies you are targeting", () => {
    const base = matchPosting(posting({ company: "Razorpay Software" }), ctx()).score;
    expect(matchPosting(posting({ company: "Razorpay Software" }), ctx({ targetNames: ["Razorpay"] })).score).toBe(base + 5);
  });
  it("excludes companies on your list", () => {
    const m = matchPosting(posting({ company: "Evil Corp Pvt Ltd" }), ctx({ prefs: { ...DEFAULT_PREFS, excludeCompanies: ["evil corp"] } }));
    expect(m).toMatchObject({ excluded: true, score: 0 });
  });
  it("is neutral, not punishing, with no resume or no preferences", () => {
    const m = matchPosting(posting(), ctx({ resumeTerms: null, prefs: DEFAULT_PREFS }));
    expect(m.score).toBeGreaterThan(30);
    expect(m.matched).toEqual([]);
  });
  it("always stays within 0-100", () => {
    for (const p of [posting(), posting({ title: "", terms: [], postedAt: null }), posting({ terms: Array.from({ length: 30 }, (_, i) => `t${i}`) })]) {
      const s = matchPosting(p, ctx()).score;
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});

describe("preferences", () => {
  it("fills defaults and rejects junk", () => {
    expect(DEFAULT_PREFS).toMatchObject({ roles: [], remoteOk: true, level: "any", minScore: 60 });
    expect(jobPrefsSchema.safeParse({ level: "wizard" }).success).toBe(false);
    expect(jobPrefsSchema.safeParse({ minScore: 101 }).success).toBe(false);
    expect(jobPrefsSchema.safeParse({ roles: Array.from({ length: 9 }, () => "x") }).success).toBe(false);
  });
  it("splits lists from commas and lines", () => {
    expect(splitList("backend, Full Stack\n backend ,, sre")).toEqual(["backend", "Full Stack", "sre"]);
  });
});

describe("highlightSegments", () => {
  it("marks skills you have and lack as plain text segments, with word boundaries", () => {
    const segs = highlightSegments("We use Node.js and Kafka, not javascripting. Docker too.", new Set(["node.js", "docker"]), new Set(["kafka", "javascript"]));
    expect(segs.filter((s) => s.mark).map((s) => [s.text, s.mark])).toEqual([["Node.js", "have"], ["Kafka", "lack"], ["Docker", "have"]]);
    expect(segs.map((s) => s.text).join("")).toBe("We use Node.js and Kafka, not javascripting. Docker too.");
  });
  it("returns the text untouched when there is nothing to mark, and never emits markup", () => {
    expect(highlightSegments("<b>hi</b>", new Set(), new Set())).toEqual([{ text: "<b>hi</b>" }]);
    expect(highlightSegments("<script>x</script> node", new Set(["node.js"]), new Set()).map((s) => s.text).join("")).toBe("<script>x</script> node");
  });
});

describe("search links", () => {
  it("builds escaped searches for the sites without APIs", () => {
    const links = boardSearchLinks({ role: "Backend Engineer", location: "Bengaluru", remote: false, days: 7 });
    expect(links.map((l) => l.id)).toEqual(["linkedin", "naukri", "indeed", "wellfound", "google-jobs"]);
    expect(links[0]!.url).toBe("https://www.linkedin.com/jobs/search/?keywords=Backend%20Engineer&location=Bengaluru&f_TPR=r604800");
    expect(links[1]!.url).toBe("https://www.naukri.com/backend-engineer-jobs-in-bengaluru");
    expect(boardSearchLinks({ role: "SRE", location: "", remote: true })[3]!.url).toBe("https://wellfound.com/role/r/sre");
    expect(links.every((l) => l.url.startsWith("https://"))).toBe(true);
  });
  it("cannot be broken out of with hostile input", () => {
    const [li] = boardSearchLinks({ role: 'x&evil=1"><script>', location: "a b", remote: false });
    expect(li!.url).not.toMatch(/[<>"]/);
    expect(new URL(li!.url).searchParams.get("keywords")).toBe('x&evil=1"><script>');
    expect(new URL(li!.url).searchParams.get("evil")).toBeNull();
  });
  it("fills a company's own search template", () => {
    expect(companySearchUrl("https://x.example/?q={q}&loc={l}", { role: "sde 2", location: "Pune" })).toBe("https://x.example/?q=sde%202&loc=Pune");
    expect(companySearchUrl(undefined, { role: "x", location: "y" })).toBeNull();
  });
});
