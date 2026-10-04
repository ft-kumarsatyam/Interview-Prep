import { describe, expect, it } from "vitest";
import { pickRoast, ROAST_LINES, withRoast } from "@/modules/resume/domain/roast";

describe("pickRoast", () => {
  it("is stable for the same slot and date, so a retried job sends the same line", () => {
    expect(pickRoast("morning", "2026-10-05", "Satyam")).toBe(pickRoast("morning", "2026-10-05", "Satyam"));
  });

  it("varies across days", () => {
    const lines = new Set(Array.from({ length: 30 }, (_, i) => pickRoast("evening", `2026-10-${String(i + 1).padStart(2, "0")}`, "S")));
    expect(lines.size).toBeGreaterThan(5);
  });

  it("fills in the name and only returns lines from the slot's pool", () => {
    for (let i = 0; i < 50; i++) {
      const line = pickRoast("morning", `seed-${i}`, "Satyam");
      expect(line).not.toContain("{name}");
      expect(ROAST_LINES.morning.map((l) => l.replaceAll("{name}", "Satyam"))).toContain(line);
    }
  });
});

describe("withRoast", () => {
  it("puts the line in the subject and at the top of the text and html", () => {
    const out = withRoast({ title: "Today's targets", body: "2 DSA problems", html: "<div>plan</div>" }, "Aaj toh padhle!");
    expect(out.title).toBe("Aaj toh padhle! | Today's targets");
    expect(out.body.startsWith("Aaj toh padhle!\n\n2 DSA")).toBe(true);
    expect(out.html).toMatch(/^<p [^>]+>Aaj toh padhle!<\/p><div>plan<\/div>$/);
  });

  it("escapes the line in html and leaves html out when there was none", () => {
    expect(withRoast({ title: "t", body: "b", html: "" }, "<b>x</b>").html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(withRoast({ title: "t", body: "b" }, "x")).not.toHaveProperty("html");
  });
});

import { ROAST_LEVELS, effectiveRoastLevel, roastFor, roastSituation, type RoastContext } from "@/modules/resume/domain/roast";

describe("effectiveRoastLevel", () => {
  it("prefers the explicit level and maps the old on/off switch", () => {
    expect(effectiveRoastLevel("coach", true)).toBe("coach");
    expect(effectiveRoastLevel(null, false)).toBe("off");
    expect(effectiveRoastLevel(undefined, true)).toBe("savage");
    expect(effectiveRoastLevel(undefined, undefined)).toBe("savage");
    expect(effectiveRoastLevel("nonsense" as never, false)).toBe("off");
  });
});

describe("roastSituation", () => {
  it("reads the morning from the backlog, interview date and streak", () => {
    expect(roastSituation("morning", { backlog: 30 })).toBe("backlog-heavy");
    expect(roastSituation("morning", { backlog: 3 })).toBe("backlog");
    expect(roastSituation("morning", { backlog: 0, daysLeft: 12 })).toBe("interview-close");
    expect(roastSituation("morning", { backlog: 0, streak: 9 })).toBe("streak-long");
    expect(roastSituation("morning", { backlog: 0, streak: 2 })).toBe("clean");
    expect(roastSituation("morning", {})).toBeNull();
  });
  it("reads the evening nudge and the week", () => {
    expect(roastSituation("evening", { quizOnly: true, left: 1 })).toBe("quiz-only");
    expect(roastSituation("evening", { pct: 0, left: 5 })).toBe("zero");
    expect(roastSituation("evening", { pct: 75, left: 1 })).toBe("almost");
    expect(roastSituation("evening", { pct: 20, left: 4 })).toBe("some");
    expect(roastSituation("weekly", { weekPct: 95 })).toBe("great");
    expect(roastSituation("weekly", { weekPct: 70 })).toBe("ok");
    expect(roastSituation("weekly", { weekPct: 10 })).toBe("poor");
    expect(roastSituation("weekly", { weekPct: 0 })).toBe("zero");
  });
});

describe("roastFor", () => {
  const ctx: RoastContext = { backlog: 22, streak: 4, left: 3, pct: 40, solved: 2, weekPct: 55, daysLeft: 100 };

  it("is null when off, and never returns an unfilled token", () => {
    expect(roastFor("off", "morning", ctx, "s", "Sam")).toBeNull();
    for (const level of ["coach", "savage"] as const) {
      for (const slot of ["morning", "evening", "night", "rest", "weekly"] as const) {
        for (let i = 0; i < 30; i++) {
          const line = roastFor(level, slot, ctx, `seed-${i}`, "Sam")!;
          expect(line, `${level}/${slot}`).toBeTruthy();
          expect(line).not.toMatch(/\{\w+\}/);
        }
      }
    }
  });

  it("uses the real numbers in the line", () => {
    const lines = new Set(Array.from({ length: 40 }, (_, i) => roastFor("coach", "morning", { backlog: 22 }, `d${i}`, "Sam")!));
    expect([...lines].some((l) => l.includes("22"))).toBe(true);
  });

  it("is stable per seed and varies across days", () => {
    expect(roastFor("savage", "morning", ctx, "2026-10-05", "Sam")).toBe(roastFor("savage", "morning", ctx, "2026-10-05", "Sam"));
    const set = new Set(Array.from({ length: 40 }, (_, i) => roastFor("coach", "morning", { backlog: 5 }, `d${i}`, "Sam")));
    expect(set.size).toBeGreaterThan(1);
  });

  it("matches the night situation: done, partial, zero, streak lost", () => {
    const night = (c: RoastContext) => new Set(Array.from({ length: 40 }, (_, i) => roastFor("coach", "night", c, `n${i}`, "Sam")!));
    expect([...night({ pct: 100, solved: 4, streak: 6 })].some((l) => /closed|done/i.test(l))).toBe(true);
    expect([...night({ pct: 0 })].some((l) => /No progress|blank/i.test(l))).toBe(true);
    expect([...night({ streakBroken: true, pct: 20 })].some((l) => /reset|break/i.test(l))).toBe(true);
  });

  it("falls back to general lines when the context has no numbers", () => {
    expect(roastFor("coach", "morning", {}, "x", "Sam")).toBeTruthy();
    expect(roastFor("savage", "weekly", {}, "x", "Sam")).toBeTruthy();
  });

  it("offers every level", () => {
    expect(ROAST_LEVELS).toEqual(["off", "coach", "savage"]);
  });
});
