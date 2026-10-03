import { describe, expect, it } from "vitest";
import { pickRoast, ROAST_LINES, withRoast } from "@/lib/domain/roast";

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
