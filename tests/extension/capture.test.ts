import { readFileSync } from "node:fs";
import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";
import { captureAck, drainRequest, parseCapture } from "@/lib/domain/capture-bridge";
import { jobCaptureSchema } from "@/lib/domain/jobs";

/** Pulls `extractPage` out of the extension's background.js so the real function is what gets tested. */
function loadExtractor(): (html: string, url: string) => unknown {
  const src = readFileSync("extension/background.js", "utf8");
  const start = src.indexOf("function extractPage()");
  const end = src.indexOf("async function readQueue()");
  const fnSrc = src.slice(start, end);
  return (html, url) => {
    const { document, window } = parseHTML(html);
    // linkedom has no layout, so innerText falls back to textContent, which is all these pages need.
    for (const proto of [Object.getPrototypeOf(document.createElement("div"))]) {
      if (!Object.getOwnPropertyDescriptor(proto, "innerText")) Object.defineProperty(proto, "innerText", { get() { return (this as { textContent: string }).textContent; } });
    }
    const location = new URL(url);
    return new Function("document", "location", "DOMParser", `${fnSrc}\nreturn extractPage();`)(document, location, window.DOMParser);
  };
}

const extract = loadExtractor();
// Real sites escape "</" inside JSON-LD; without it the HTML parser would end the script block early.
const ld = (o: unknown) => `<html><head><script type="application/ld+json">${JSON.stringify(o).replace(/<\//g, "<\\/")}</script></head><body><h1>x</h1></body></html>`;

describe("extension extractor", () => {
  it("reads schema.org JobPosting data, turning the HTML description into text", () => {
    const out = extract(
      ld({ "@type": "JobPosting", title: "Backend Engineer", hiringOrganization: { name: "Acme Pay" }, jobLocation: { address: { addressLocality: "Bengaluru", addressCountry: "IN" } }, description: "<p>Build APIs</p><ul><li>Node.js</li><li>SQL</li></ul><script>evil()</script>" }),
      "https://in.indeed.com/viewjob?jk=abc123",
    ) as Record<string, string>;
    expect(out).toMatchObject({ kind: "job", title: "Backend Engineer", company: "Acme Pay", location: "Bengaluru, IN" });
    expect(out.jd).toContain("Build APIs");
    expect(out.jd).toContain("• Node.js");
    expect(jobCaptureSchema.safeParse(out).success).toBe(true);
  });

  it("finds a JobPosting inside @graph and arrays", () => {
    const out = extract(ld({ "@graph": [{ "@type": "WebSite" }, { "@type": ["JobPosting"], title: "SDE", hiringOrganization: "Zed", description: "x".repeat(100) }] }), "https://wellfound.com/jobs/1") as Record<string, string>;
    expect(out).toMatchObject({ kind: "job", title: "SDE", company: "Zed" });
  });

  it("falls back to headings and the description block when there is no structured data", () => {
    const html = `<html><body><h1>Platform Engineer</h1><a class="topcard__org-name-link">Globex</a><div class="show-more-less-html__markup">${"We build distributed systems with Go and Kafka. ".repeat(5)}</div></body></html>`;
    const out = extract(html, "https://www.linkedin.com/jobs/view/3801234567") as Record<string, string>;
    expect(out).toMatchObject({ kind: "job", title: "Platform Engineer", company: "Globex" });
    expect(out.jd).toContain("distributed systems");
  });

  it("says none when the page is not a job", () => {
    expect((extract("<html><body><h1>Home</h1><p>hi</p></body></html>", "https://example.com/") as { kind: string }).kind).toBe("none");
  });

  it("treats your own profile page as a profile", () => {
    const out = extract(`<html><head><title>Aarav | LinkedIn</title></head><body><main>${"Backend engineer. ".repeat(20)}</main></body></html>`, "https://www.linkedin.com/in/aarav/") as Record<string, string>;
    expect(out.kind).toBe("profile");
    expect(out.text).toContain("Backend engineer");
  });
});

describe("page-side capture parsing", () => {
  const good = { source: "prepos-ext", type: "capture", id: "abc", payload: { kind: "job", title: "SDE", company: "Acme", url: "https://in.indeed.com/viewjob?jk=1", jd: "text" } };
  it("accepts a valid job and profile capture", () => {
    expect(parseCapture(good)).toMatchObject({ id: "abc", kind: "job" });
    expect(parseCapture({ ...good, payload: { kind: "profile", url: "https://www.linkedin.com/in/a", text: "x".repeat(150) } })).toMatchObject({ kind: "profile" });
  });
  it("drops anything malformed or hostile", () => {
    expect(parseCapture(null)).toBeNull();
    expect(parseCapture({ ...good, source: "evil" })).toBeNull();
    expect(parseCapture({ ...good, id: "x".repeat(65) })).toBeNull();
    expect(parseCapture({ ...good, payload: { ...good.payload, url: "javascript:alert(1)" } })).toBeNull();
    expect(parseCapture({ ...good, payload: { ...good.payload, kind: "other" } })).toBeNull();
    expect(parseCapture({ ...good, payload: { ...good.payload, jd: "x".repeat(30_000) } })).toBeNull();
  });
  it("builds the drain and ack messages the extension expects", () => {
    expect(drainRequest()).toEqual({ source: "prepos-app", type: "drain-captures" });
    expect(captureAck("id1")).toEqual({ source: "prepos-app", type: "capture-ack", id: "id1" });
    const content = readFileSync("extension/content-app.js", "utf8");
    for (const s of ["drain-captures", "capture-ack", '"capture"']) expect(content).toContain(s);
  });
});
