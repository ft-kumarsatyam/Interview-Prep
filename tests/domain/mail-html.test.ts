import { describe, expect, it } from "vitest";
import { asciiBar, renderMail, type MailSpec } from "@/lib/domain/mail-html";

const base: MailSpec = {
  title: "Today's targets",
  kicker: "Morning plan",
  intro: "Two things today.",
  sections: [{ heading: "DSA", items: [{ title: "Two Sum", path: "/dsa/two-sum", note: "Easy" }] }],
  appUrl: "https://prep.example.com/",
};

describe("renderMail", () => {
  it("writes matching text and html, with absolute links when there is an app url", () => {
    const { text, html } = renderMail(base);
    expect(text).toBe("Two things today.\n\nDSA\n- Two Sum (Easy)\n  https://prep.example.com/dsa/two-sum\n\nOpen PrepOS: https://prep.example.com/dashboard");
    expect(html).toContain("<h2");
    expect(html).toContain('href="https://prep.example.com/dsa/two-sum"');
    expect(html).toContain("Morning plan");
    expect(html).toContain('href="https://prep.example.com/dashboard"');
  });

  it("has no links at all without an app url", () => {
    const { text, html } = renderMail({ ...base, appUrl: undefined });
    expect(text).not.toContain("http");
    expect(html).not.toContain("href=");
  });

  it("escapes everything it is given", () => {
    const evil = `<img src=x onerror="alert(1)">`;
    const { html } = renderMail({
      ...base,
      title: evil,
      intro: evil,
      callouts: [{ tone: "warn", text: evil }],
      stats: [{ label: evil, value: evil }],
      sections: [{ heading: evil, lines: [evil], items: [{ title: evil, path: "/x", note: evil }], bars: [{ label: evil, pct: 50, detail: evil }] }],
      footer: [evil],
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("draws stat chips, callouts, a 'more' row and a custom button", () => {
    const { text, html } = renderMail({
      ...base,
      stats: [{ label: "Streak", value: "6d", tone: "good" }, { label: "Backlog", value: "21", tone: "bad" }],
      callouts: [{ tone: "warn", text: "Yesterday left 2 open." }],
      sections: [{ heading: "Backlog", items: [], more: { count: 9, path: "/dsa", label: "problems" } }],
      cta: { label: "Finish today", path: "/dashboard" },
    });
    expect(text).toContain("Streak: 6d · Backlog: 21");
    expect(text).toContain("Yesterday left 2 open.");
    expect(text).toContain("- +9 more\n  https://prep.example.com/dsa");
    expect(html).toContain("+9 more problems");
    expect(html).toContain("Finish today");
  });

  it("omits a 'more' row when nothing is left over", () => {
    expect(renderMail({ ...base, sections: [{ heading: "A", items: [], more: { count: 0, path: "/x" } }] }).text).not.toContain("more");
  });

  it("renders bars as text and as clamped html bars", () => {
    const { text, html } = renderMail({ ...base, sections: [{ heading: "Tracks", bars: [{ label: "DSA", pct: 33, detail: "(12/36)" }, { label: "Over", pct: 250 }] }] });
    expect(text).toContain("- DSA: ███░░░░░░░ 33% (12/36)");
    expect(html).toContain("width:33%");
    expect(html).toContain("width:100%");
    expect(asciiBar(-5)).toBe("░░░░░░░░░░");
  });
});
