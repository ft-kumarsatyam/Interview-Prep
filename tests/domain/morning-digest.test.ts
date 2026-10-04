import { describe, expect, it } from "vitest";
import { escapeHtml, morningDigest, paceLine, type DigestInput } from "@/modules/notifications/domain/reminders";
import type { DayProgress } from "@/modules/progress/domain/streak";

const day = (p: Partial<DayProgress> = {}): DayProgress => ({ kind: "study", dsaTarget: 2, dsaSolved: 0, theoryTarget: 1, theoryDone: 0, quizPassed: false, ...p });

const input = (p: Partial<DigestInput> = {}): DigestInput => ({
  date: "2026-10-06",
  day: day(),
  streak: 3,
  problems: [
    { title: "Two Sum", path: "/dsa/two-sum", note: "Easy" },
    { title: "3Sum", path: "/dsa/3sum", note: "Medium" },
  ],
  reviews: [{ title: "Valid Anagram", path: "/dsa/valid-anagram" }],
  theory: [{ title: "Encapsulation", path: "/learn/oops", note: "OOPS" }],
  reading: [{ title: "How sharding works", path: "/news/abc", note: "ByteByteGo · 6 min" }],
  pace: { ideal: 10, solved: 12, delta: 2 },
  appUrl: "https://prep.example.com/",
  ...p,
});

describe("morningDigest", () => {
  it("lists targets, reading, pace and absolute links on a study day", () => {
    const d = morningDigest(input())!;
    expect(d.title).toBe("Today's targets · 2026-10-06");
    expect(d.text).toContain("2 DSA problems and 1 theory subtopic, then the daily quiz");
    expect(d.text).toContain("- Two Sum (Easy)\n  https://prep.example.com/dsa/two-sum");
    expect(d.text).toContain("Today's reading\n- How sharding works (ByteByteGo · 6 min)");
    expect(d.text).toContain("2 problems ahead of plan");
    expect(d.text).toContain("Current streak: 3 days.");
    expect(d.html).toContain('href="https://prep.example.com/learn/oops"');
    expect(d.html).toContain("Daily quiz");
  });

  it("omits links without an app URL", () => {
    const d = morningDigest(input({ appUrl: undefined }))!;
    expect(d.text).not.toContain("http");
    expect(d.html).not.toContain("href=");
  });

  it("sends a day-off note on rest days, with reading as optional and no pace", () => {
    const d = morningDigest(input({ day: day({ kind: "rest", dsaTarget: 0, theoryTarget: 0 }) }))!;
    expect(d.title).toBe("Day off · 2026-10-06");
    expect(d.text).toContain("spread over the coming days");
    expect(d.text).toContain("Optional reading");
    expect(d.text).not.toContain("DSA\n");
    expect(d.text).not.toContain("ahead of plan");
  });

  it("asks for the weekly quiz on Sunday", () => {
    const d = morningDigest(input({ day: day({ kind: "sunday" }) }))!;
    expect(d.title).toBe("Sunday review · 2026-10-06");
    expect(d.text).toContain("Weekly review quiz");
    expect(d.text).toContain("Valid Anagram");
  });

  it("returns null outside the plan", () => {
    expect(morningDigest(input({ day: day({ kind: "outside" }) }))).toBeNull();
  });

  it("escapes titles in HTML", () => {
    const d = morningDigest(input({ reading: [{ title: `<script>alert("x")</script>`, path: "/news/1" }] }))!;
    expect(d.html).not.toContain("<script>");
    expect(d.html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });
});

describe("helpers", () => {
  it("escapes the HTML special characters", () => {
    expect(escapeHtml(`a&b<c>"d'`)).toBe("a&amp;b&lt;c&gt;&quot;d&#39;");
  });

  it("describes pace", () => {
    expect(paceLine({ ideal: 5, solved: 4, delta: -1 })).toBe("You're 1 problem behind plan, spread over the days left.");
    expect(paceLine({ ideal: 5, solved: 5, delta: 0 })).toBe("You're exactly on plan.");
  });
});
