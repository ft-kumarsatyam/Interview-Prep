import { describe, expect, it } from "vitest";
import { DRILLS } from "@/modules/dsa/lib/playground/drills";
import { runWorker } from "./helpers";

describe("output drills", () => {
  it("has unique ids and at least 22 drills", () => {
    expect(new Set(DRILLS.map((d) => d.id)).size).toBe(DRILLS.length);
    expect(DRILLS.length).toBeGreaterThanOrEqual(22);
  });

  it.each(DRILLS.filter((d) => d.runnable !== false).map((d) => [d.id, d] as const))("%s runs cleanly and prints something to predict", async (_id, drill) => {
    const ms = await runWorker(drill.code, 40);
    const lines = ms.filter((m) => m.type === "log");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.filter((l) => l.level === "error" || /^Uncaught/.test(l.text ?? "")), `${drill.id} threw`).toEqual([]);
    expect(ms.at(-1)).toEqual({ type: "done" });
  });
});
