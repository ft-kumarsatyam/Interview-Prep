import { describe, expect, it } from "vitest";
import { isBlockedJobHost, isPublicCareerUrl, normalizePushed, parseCareerMarkdown, parsePushedBatch, pushedPostingSchema, readerUrl } from "@/modules/jobs/domain/job-push";

describe("blocked hosts", () => {
  it.each(["https://www.linkedin.com/jobs/view/1", "https://in.indeed.com/viewjob?jk=1", "https://www.naukri.com/job-listings-x", "https://wellfound.com/jobs", "https://uk.glassdoor.co.in/x", "https://jobs.linkedin.com/x"])("blocks %s", (u) => {
    expect(isBlockedJobHost(u)).toBe(true);
    expect(isPublicCareerUrl(u)).toBe(false);
  });
  it.each(["https://boards.greenhouse.io/stripe/jobs/1", "https://careers.example.com/jobs/1", "https://notlinkedin.com/x"])("allows %s", (u) => expect(isBlockedJobHost(u)).toBe(false));
  it("treats an unparseable URL as blocked", () => expect(isBlockedJobHost("nope")).toBe(true));
});

describe("isPublicCareerUrl", () => {
  it("accepts a public https page", () => expect(isPublicCareerUrl("https://careers.stripe.com/jobs")).toBe(true));
  it.each(["http://example.com/jobs", "https://localhost/jobs", "https://127.0.0.1/jobs", "https://10.0.0.5/x", "https://[::1]/x", "https://intranet/jobs", "https://foo.local/jobs", "https://u:p@example.com/x", "ftp://example.com", "not a url", "https://printer.internal/x"])("rejects %s", (u) => expect(isPublicCareerUrl(u)).toBe(false));
});

describe("pushed postings", () => {
  const ok = { title: "Backend Engineer", company: "Acme", url: "https://acme.com/jobs/1" };
  it("accepts the minimum and normalises it", () => {
    const n = normalizePushed(pushedPostingSchema.parse(ok), "webhook", "webhook");
    expect(n).toMatchObject({ source: "webhook", sourceId: "webhook", title: "Backend Engineer", company: "Acme", applyUrl: "https://acme.com/jobs/1", jd: "", remote: null, postedAt: null });
    expect(n.externalId).toHaveLength(16);
  });
  it("derives a stable id from the URL ignoring the fragment, and honours an explicit one", () => {
    const a = normalizePushed(pushedPostingSchema.parse(ok), "webhook", "w");
    const b = normalizePushed(pushedPostingSchema.parse({ ...ok, url: "https://acme.com/jobs/1#apply" }), "webhook", "w");
    expect(a.externalId).toBe(b.externalId);
    expect(normalizePushed(pushedPostingSchema.parse({ ...ok, externalId: "x-9" }), "webhook", "w").externalId).toBe("x-9");
  });
  it("strips HTML from the description, infers remote from the place, and parses dates", () => {
    const n = normalizePushed(pushedPostingSchema.parse({ ...ok, location: "Remote - India", description: "<p>Build <b>APIs</b></p><script>x()</script>", postedAt: "2026-01-05T10:00:00Z" }), "webhook", "w");
    expect(n.jd).toContain("Build APIs");
    expect(n.jd).not.toContain("<");
    expect(n.jd).not.toContain("x()");
    expect(n.remote).toBe(true);
    expect(n.postedAt).toBe("2026-01-05T10:00:00.000Z");
  });
  it("ignores impossible or far-future dates", () => {
    expect(normalizePushed(pushedPostingSchema.parse({ ...ok, postedAt: "garbage" }), "webhook", "w").postedAt).toBeNull();
    expect(normalizePushed(pushedPostingSchema.parse({ ...ok, postedAt: "2999-01-01" }), "webhook", "w").postedAt).toBeNull();
  });
  it("accepts epoch seconds and milliseconds", () => {
    expect(normalizePushed(pushedPostingSchema.parse({ ...ok, postedAt: 1_767_000_000 }), "webhook", "w").postedAt).toBe(new Date(1_767_000_000_000).toISOString());
  });
  it("rejects http, blocked sites, short titles and missing fields", () => {
    for (const bad of [{ ...ok, url: "http://acme.com/1" }, { ...ok, url: "https://www.linkedin.com/jobs/1" }, { ...ok, title: "x" }, { title: "Engineer", url: ok.url }, { ...ok, applyUrl: "https://naukri.com/x" }]) expect(pushedPostingSchema.safeParse(bad).success).toBe(false);
  });
});

describe("parsePushedBatch", () => {
  const job = (i: number) => ({ title: `Engineer ${i}`, company: "Acme", url: `https://acme.com/jobs/${i}` });
  it("keeps good items, counts rejected ones and de-duplicates by id", () => {
    const r = parsePushedBatch([job(1), job(2), job(1), { title: "x" }, 42, null, { ...job(3), url: "https://www.indeed.com/x" }], "webhook", "webhook");
    expect(r.postings.map((p) => p.title)).toEqual(["Engineer 1", "Engineer 2"]);
    expect(r.rejected).toBe(4);
  });
  it("refuses a non-array and an oversized batch outright", () => {
    expect(() => parsePushedBatch({}, "webhook", "w")).toThrow(/array/);
    expect(() => parsePushedBatch(Array.from({ length: 101 }, (_, i) => job(i)), "webhook", "w")).toThrow(/At most 100/);
    expect(parsePushedBatch([], "webhook", "w")).toEqual({ postings: [], rejected: 0 });
  });
});

describe("parseCareerMarkdown", () => {
  const page = "https://careers.acme.com/open-roles";
  const md = [
    "# Open roles",
    "[Careers](https://careers.acme.com/)  [Apply now](https://careers.acme.com/jobs/apply)",
    "[Senior Backend Engineer - Bengaluru](https://careers.acme.com/jobs/123-backend)",
    "[**Frontend Engineer** | Remote](/jobs/456-frontend)",
    "[Data Engineer](https://boards.greenhouse.io/acme/jobs/789)",
    "[Platform Engineer](https://careers.acme.com/jobs/123-backend#apply)",
    "![logo](https://careers.acme.com/jobs/logo.png)",
    "[Our culture](https://careers.acme.com/about)",
    "[Staff Engineer](https://www.linkedin.com/jobs/view/5)",
    "[Random blog post title here](https://othersite.com/jobs/1)",
    "[Insecure role title here](http://careers.acme.com/jobs/9)",
    "[SRE](https://careers.acme.com/jobs/10)",
  ].join("\n");
  const out = parseCareerMarkdown(md, page, "Acme", "scrape-acme");

  it("finds job links on the same site and on known ATS hosts", () => {
    expect(out.map((p) => p.title)).toEqual(["Senior Backend Engineer", "Frontend Engineer", "Data Engineer"]);
  });
  it("splits the place from the title and detects remote", () => {
    expect(out[0]).toMatchObject({ location: "Bengaluru", remote: null });
    expect(out[1]).toMatchObject({ location: "Remote", remote: true, url: "https://careers.acme.com/jobs/456-frontend" });
  });
  it("skips navigation, images, blocked sites, other sites, http and too-short titles; de-duplicates the same URL", () => {
    const urls = out.map((p) => p.url);
    expect(urls.filter((u) => u.includes("123-backend"))).toHaveLength(1);
    expect(urls.some((u) => /linkedin|othersite|logo|about|apply$/.test(u))).toBe(false);
    expect(urls.every((u) => u.startsWith("https://"))).toBe(true);
  });
  it("tags every result as a scrape of that source", () => {
    expect(out.every((p) => p.source === "scrape" && p.sourceId === "scrape-acme" && p.company === "Acme")).toBe(true);
  });
  it("returns nothing for a bad page URL or empty markdown", () => {
    expect(parseCareerMarkdown(md, "not a url", "Acme", "s")).toEqual([]);
    expect(parseCareerMarkdown("", page, "Acme", "s")).toEqual([]);
  });
});

describe("readerUrl", () => {
  it("appends the page address to the reader", () => expect(readerUrl("https://x.com/jobs")).toBe("https://r.jina.ai/https://x.com/jobs"));
});
