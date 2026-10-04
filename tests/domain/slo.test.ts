import { describe, expect, it } from "vitest";
import { evaluateSlo, overall, type HealthSnapshot } from "@/core/domain/slo";

const healthy: HealthSnapshot = { dashboardP95Ms: 800, dashboardSamples: 40, outboxLagMs: 0, deadLetters: 0, llmConfigured: 2, llmAvailable: 2, kvFallbacks: 0, kvStore: "upstash", cacheHitRate: 0.8, aiP95Ms: 2000 };
const by = (s: HealthSnapshot, id: string) => evaluateSlo(s).find((r) => r.id === id)!;

describe("evaluateSlo", () => {
  it("is all ok for a healthy system", () => {
    expect(evaluateSlo(healthy).every((r) => r.status === "ok")).toBe(true);
    expect(overall(evaluateSlo(healthy))).toBe("ok");
  });
  it("bands latency into ok, warn and bad at the boundaries", () => {
    expect(by({ ...healthy, dashboardP95Ms: 1500 }, "dashboard").status).toBe("ok");
    expect(by({ ...healthy, dashboardP95Ms: 1501 }, "dashboard").status).toBe("warn");
    expect(by({ ...healthy, dashboardP95Ms: 3001 }, "dashboard").status).toBe("bad");
    expect(by({ ...healthy, dashboardP95Ms: 2500 }, "dashboard").value).toContain("2.5 s");
  });
  it("treats missing data as unknown, not as healthy or failing", () => {
    expect(by({ ...healthy, dashboardP95Ms: null }, "dashboard").status).toBe("unknown");
    expect(by({ ...healthy, aiP95Ms: null }, "ai-latency").status).toBe("unknown");
    expect(by({ ...healthy, cacheHitRate: null }, "cache").status).toBe("unknown");
    expect(by({ ...healthy, llmConfigured: 0, llmAvailable: 0 }, "llm").status).toBe("unknown");
  });
  it("flags dead letters, lag, LLM outages and KV fallbacks", () => {
    expect(by({ ...healthy, deadLetters: 1 }, "dead-letters").status).toBe("warn");
    expect(by({ ...healthy, deadLetters: 9 }, "dead-letters").status).toBe("bad");
    expect(by({ ...healthy, outboxLagMs: 10 * 60_000 }, "outbox-lag").status).toBe("bad");
    expect(by({ ...healthy, llmAvailable: 1 }, "llm").status).toBe("warn");
    expect(by({ ...healthy, llmAvailable: 0 }, "llm").status).toBe("bad");
    expect(by({ ...healthy, kvFallbacks: 3 }, "kv").status).toBe("warn");
    expect(by({ ...healthy, kvFallbacks: 30 }, "kv").status).toBe("bad");
    expect(by({ ...healthy, cacheHitRate: 0.1 }, "cache").status).toBe("bad");
  });
});

describe("overall", () => {
  it("takes the worst known status and ignores unknown", () => {
    expect(overall([{ id: "a", label: "", value: "", target: "", status: "ok" }, { id: "b", label: "", value: "", target: "", status: "warn" }])).toBe("warn");
    expect(overall([{ id: "a", label: "", value: "", target: "", status: "unknown" }, { id: "b", label: "", value: "", target: "", status: "ok" }])).toBe("ok");
    expect(overall([{ id: "a", label: "", value: "", target: "", status: "unknown" }])).toBe("unknown");
    expect(overall([])).toBe("unknown");
  });
});
