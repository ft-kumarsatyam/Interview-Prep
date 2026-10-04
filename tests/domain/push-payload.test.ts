import { describe, expect, it } from "vitest";
import { renderMail, type MailSpec } from "@/lib/domain/mail-html";
import { PUSH_BODY_LINES, PUSH_LINE_MAX, PUSH_TITLE_MAX, buildPushPayload, deviceLabel, sectionLine, summaryLines } from "@/lib/domain/push-payload";
import { withRoast } from "@/lib/domain/roast";

const spec: MailSpec = {
  title: "Today's targets · Sat 3 Oct",
  kicker: "Morning plan",
  intro: "Three problems, two subtopics and the quiz.",
  stats: [
    { label: "problems", value: "3" },
    { label: "theory", value: "2" },
    { label: "owed", value: "4", tone: "warn" },
    { label: "streak", value: "9" },
  ],
  sections: [
    { heading: "Problems", items: [{ title: "Two Sum", path: "/dsa/two-sum" }, { title: "LRU Cache", path: "/dsa/lru-cache" }], more: { count: 1, path: "/dsa" } },
    { heading: "Left", lines: ["the daily quiz"] },
    { heading: "Tracks", bars: [{ label: "DSA", pct: 40 }] },
    { heading: "Empty" },
  ],
  cta: { label: "Start the day", path: "/dashboard" },
};

describe("sectionLine", () => {
  it("names the first item and counts the rest, including the +more row", () => {
    expect(sectionLine(spec.sections[0])).toBe("Problems: Two Sum +2 more");
  });
  it("falls back to lines, then bars, then nothing", () => {
    expect(sectionLine(spec.sections[1])).toBe("Left: the daily quiz");
    expect(sectionLine(spec.sections[2])).toBe("Tracks: DSA 40%");
    expect(sectionLine(spec.sections[3])).toBeNull();
  });
});

describe("summaryLines", () => {
  it("leads with the roast, then up to three stats, then one line per section", () => {
    expect(summaryLines(spec, "Wake up.")).toEqual(["Wake up.", "3 problems · 2 theory · 4 owed", "Problems: Two Sum +2 more", "Left: the daily quiz", "Tracks: DSA 40%"]);
  });
  it("uses the intro when there are no stats", () => {
    expect(summaryLines({ ...spec, stats: [] })[0]).toBe(spec.intro);
  });
});

describe("buildPushPayload", () => {
  it("summarises a structured message and links to its full version", () => {
    const p = buildPushPayload({ title: "x", body: "long text", spec }, { url: "/notifications/abc", tag: "prepos-plan" });
    expect(p.title).toBe("Morning plan · Today's targets · Sat 3 Oct");
    expect(p.body.split("\n")).toHaveLength(4);
    expect(p).toMatchObject({ url: "/notifications/abc", tag: "prepos-plan" });
    expect(p.actions).toEqual([
      { action: "open", title: "View details" },
      { action: "cta", title: "Start the day" },
    ]);
    expect(p.actionUrls).toEqual({ open: "/notifications/abc", cta: "/dashboard" });
  });

  it("uses the roast line from withRoast instead of the long combined subject", () => {
    const roasted = withRoast({ title: "Today's targets", body: "b", spec }, "Bhai, 4 owed.");
    const p = buildPushPayload(roasted, { url: "/n", tag: "t" });
    expect(p.title).not.toContain("Bhai");
    expect(p.body.split("\n")[0]).toBe("Bhai, 4 owed.");
  });

  it("caps the title, the number of lines and each line's length", () => {
    const long = "word ".repeat(60);
    const p = buildPushPayload(
      { title: long, body: Array.from({ length: 10 }, () => long).join("\n") },
      { url: "/n", tag: "t" },
    );
    expect(p.title.length).toBeLessThanOrEqual(PUSH_TITLE_MAX);
    const lines = p.body.split("\n");
    expect(lines).toHaveLength(PUSH_BODY_LINES);
    expect(lines.every((l) => l.length <= PUSH_LINE_MAX && l.endsWith("…"))).toBe(true);
    expect(p.actions).toEqual([{ action: "open", title: "View details" }]);
  });

  it("drops blank lines from a plain message", () => {
    expect(buildPushPayload({ title: "Ping", body: "a\n\n b \n" }, { url: "/n", tag: "t" }).body).toBe("a\nb");
  });
});

describe("renderMail spec", () => {
  it("returns the spec without the app URL", () => {
    const out = renderMail({ ...spec, appUrl: "https://example.com" });
    expect(out.spec).toEqual(spec);
    expect("appUrl" in out.spec).toBe(false);
  });
});

describe("deviceLabel", () => {
  it("names the device and browser, or the installed app", () => {
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1", true)).toBe(
      "iPhone · installed app",
    );
    expect(deviceLabel("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0 Safari/537.36")).toBe("Mac · Chrome");
    expect(deviceLabel("Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36 EdgA/140 Edg/140")).toBe("Android · Edge");
  });
});
