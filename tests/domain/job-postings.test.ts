import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { careersUrl, detectBoard, isTechRole, JD_STORE_MAX, parseArbeitnow, parseAshby, parseBoard, parseGreenhouse, parseLever, parseRemoteOk, parseRemotive, parseSmartRecruiters, parseSmartRecruitersDetail, parseWorkable, postingKey, unescapeHtml, type CareerSource } from "@/modules/jobs/domain/job-postings";

const fx = (name: string) => JSON.parse(readFileSync(`tests/fixtures/jobs/${name}.json`, "utf8")) as unknown;
const src = (ats: CareerSource["ats"], slug: string): CareerSource => ({ id: slug, name: slug, tier: "startup", ats, slug });

/** Every connector against a recorded real response: if a provider changes its shape, these break first. */
function expectSane(list: ReturnType<typeof parseGreenhouse>, source: string) {
  expect(list.length, source).toBeGreaterThan(0);
  for (const p of list) {
    expect(p.source).toBe(source);
    expect(p.title.length).toBeGreaterThan(1);
    expect(p.company.length).toBeGreaterThan(0);
    expect(p.url).toMatch(/^https:\/\//);
    expect(p.applyUrl).toMatch(/^https:\/\//);
    expect(p.externalId).toBeTruthy();
    expect(p.jd.length).toBeLessThanOrEqual(JD_STORE_MAX);
    expect(p.jd).not.toMatch(/<\/?[a-z][^>]*>/i);
    if (p.postedAt) expect(Number.isNaN(Date.parse(p.postedAt))).toBe(false);
  }
  expect(new Set(list.map(postingKey)).size).toBe(list.length);
}

describe("connectors against recorded responses", () => {
  it("greenhouse (escaped HTML descriptions become plain text)", () => {
    const list = parseGreenhouse(fx("greenhouse"), src("greenhouse", "stripe"));
    expectSane(list, "greenhouse");
    expect(list[0]!.jd).toMatch(/\w/);
    expect(list[0]!.jd).not.toContain("&lt;");
    expect(list[0]!.department).toBeTruthy();
  });
  it("lever", () => {
    const list = parseLever(fx("lever"), src("lever", "palantir"));
    expectSane(list, "lever");
    expect(list.some((p) => p.remote !== null)).toBe(true);
    expect(list[0]!.postedAt).toBeTruthy();
  });
  it("ashby", () => {
    const list = parseAshby(fx("ashby"), src("ashby", "ramp"));
    expectSane(list, "ashby");
    expect(list.some((p) => p.remote === true)).toBe(true);
  });
  it("workable", () => {
    const list = parseWorkable(fx("workable"), src("workable", "huggingface"));
    expectSane(list, "workable");
    expect(list[0]!.company).toBe("Hugging Face");
  });
  it("smartrecruiters (list has no description; detail has one)", () => {
    const { postings, total } = parseSmartRecruiters(fx("smartrecruiters"), src("smartrecruiters", "servicenow"));
    expect(postings.length).toBeGreaterThan(0);
    expect(total).toBeGreaterThan(postings.length);
    expect(postings[0]!.jd).toBe("");
    expect(postings[0]!.url).toMatch(/^https:\/\/jobs\.smartrecruiters\.com\/ServiceNow\/\d+$/);
    const jd = parseSmartRecruitersDetail(fx("smartrecruiters-detail"));
    expect(jd.length).toBeGreaterThan(50);
    expect(jd).not.toMatch(/<\/?[a-z][^>]*>/i);
  });
  it("remoteok skips its legal-notice header and marks everything remote", () => {
    const list = parseRemoteOk(fx("remoteok"));
    expectSane(list, "remoteok");
    expect(list.every((p) => p.remote === true)).toBe(true);
    expect(list.length).toBe(5);
  });
  it("remotive", () => expectSane(parseRemotive(fx("remotive")), "remotive"));
  it("arbeitnow", () => expectSane(parseArbeitnow(fx("arbeitnow")), "arbeitnow"));
  it("parseBoard dispatches by ats", () => {
    expect(parseBoard("greenhouse", fx("greenhouse"), src("greenhouse", "stripe")).length).toBeGreaterThan(0);
    expect(parseBoard("smartrecruiters", fx("smartrecruiters"), src("smartrecruiters", "servicenow")).length).toBeGreaterThan(0);
  });
});

describe("resilience to messy responses", () => {
  it("throws on a wrong top-level shape so the connector is marked failing", () => {
    expect(() => parseGreenhouse({ nope: 1 }, src("greenhouse", "x"))).toThrow(/shape/);
    expect(() => parseLever({ error: "x" }, src("lever", "x"))).toThrow(/shape/);
    expect(() => parseAshby("html page", src("ashby", "x"))).toThrow(/shape/);
    expect(() => parseRemotive(null)).toThrow(/shape/);
  });
  it("skips malformed items instead of failing the whole list", () => {
    const list = parseGreenhouse({ jobs: [{ id: 1, title: "Backend Engineer", absolute_url: "https://boards.greenhouse.io/x/jobs/1" }, { nonsense: true }, null, 7, { id: 2, title: "No url", absolute_url: "javascript:alert(1)" }] }, src("greenhouse", "x"));
    expect(list.map((p) => p.externalId)).toEqual(["1"]);
  });
  it("never keeps a non-https link", () => {
    const list = parseLever([{ id: "a", text: "Engineer", hostedUrl: "http://jobs.lever.co/x/a", applyUrl: "javascript:alert(1)" }], src("lever", "x"));
    expect(list).toEqual([]);
  });
  it("hides unlisted Ashby postings", () => {
    const list = parseAshby({ jobs: [{ id: "1", title: "Engineer", isListed: false, jobUrl: "https://jobs.ashbyhq.com/x/1" }, { id: "2", title: "Engineer", isListed: true, jobUrl: "https://jobs.ashbyhq.com/x/2" }] }, src("ashby", "x"));
    expect(list.map((p) => p.externalId)).toEqual(["2"]);
  });
  it("caps a huge description and drops script content", () => {
    const html = `<p>${"word ".repeat(10_000)}</p><script>steal()</script>`;
    const [p] = parseAshby({ jobs: [{ id: "1", title: "Engineer", jobUrl: "https://jobs.ashbyhq.com/x/1", descriptionHtml: html }] }, src("ashby", "x"));
    expect(p!.jd.length).toBeLessThanOrEqual(JD_STORE_MAX);
    expect(p!.jd).not.toContain("steal");
  });
});

describe("text and rules", () => {
  it("unescapes one level of HTML escaping", () => {
    expect(unescapeHtml("&lt;p&gt;Tom &amp;amp; Jerry &quot;x&quot;&lt;/p&gt;")).toBe('<p>Tom &amp; Jerry "x"</p>');
  });
  it("keeps engineering roles and drops sales and marketing ones", () => {
    for (const t of ["Senior Software Engineer, Payments", "Backend Developer", "SDE II", "Data Engineer", "Machine Learning Engineer", "Site Reliability Engineer", "Android Engineer", "Full Stack Developer", "Engineering Manager"]) expect(isTechRole(t), t).toBe(true);
    for (const t of ["Account Executive", "Sales Engineer", "Marketing Manager", "Technical Recruiter", "Customer Success Manager", "Product Designer", "Legal Counsel", "Technical Program Manager", "Product Manager, Platform"]) expect(isTechRole(t), t).toBe(false);
    expect(isTechRole("Software Engineer, Sales Tools")).toBe(true);
  });
  it("builds keys, careers URLs and detects pasted board links", () => {
    expect(postingKey({ source: "lever", sourceId: "palantir", externalId: "abc" })).toBe("lever:palantir:abc");
    expect(careersUrl("greenhouse", "stripe")).toBe("https://boards.greenhouse.io/stripe");
    expect(detectBoard("https://boards.greenhouse.io/Stripe/jobs/123")).toEqual({ ats: "greenhouse", slug: "stripe" });
    expect(detectBoard("https://job-boards.greenhouse.io/anthropic")).toEqual({ ats: "greenhouse", slug: "anthropic" });
    expect(detectBoard("https://boards-api.greenhouse.io/v1/boards/figma/jobs")).toEqual({ ats: "greenhouse", slug: "figma" });
    expect(detectBoard("https://jobs.lever.co/palantir/abc")).toEqual({ ats: "lever", slug: "palantir" });
    expect(detectBoard("https://jobs.ashbyhq.com/ramp")).toEqual({ ats: "ashby", slug: "ramp" });
    expect(detectBoard("https://apply.workable.com/huggingface/")).toEqual({ ats: "workable", slug: "huggingface" });
    expect(detectBoard("https://careers.smartrecruiters.com/ServiceNow")).toEqual({ ats: "smartrecruiters", slug: "servicenow" });
    expect(detectBoard("https://example.com/careers")).toBeNull();
    expect(detectBoard("javascript:alert(1)")).toBeNull();
    expect(detectBoard("https://jobs.lever.co/a%2F..%2Fb")).toBeNull();
    expect(detectBoard("not a url")).toBeNull();
  });
});
