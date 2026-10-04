import { describe, expect, it } from "vitest";
import { budgetLevel, budgetNote, formatTokens, overBudget, slotId, splitKeys } from "@/modules/ai/domain/key-rotation";

describe("key rotation", () => {
  it("splits key lists and drops blanks and duplicates", () => {
    expect(splitKeys(undefined)).toEqual([]);
    expect(splitKeys(" a, b ,,a\nc ")).toEqual(["a", "b", "c"]);
  });

  it("keeps the plain provider id for a single key", () => {
    expect(slotId("gemini", "abc123", 1)).toBe("gemini");
    expect(slotId("gemini", "abc123", 2)).toBe("gemini#abc123");
  });

  it("warns at 90% and stops at the budget", () => {
    expect(budgetLevel(10, 100)).toBe("ok");
    expect(budgetLevel(90, 100)).toBe("warn");
    expect(budgetLevel(100, 100)).toBe("spent");
    expect(budgetLevel(1e12, 0)).toBe("ok");
    expect(overBudget(99, 100)).toBe(false);
    expect(overBudget(100, 100)).toBe(true);
  });

  it("formats token counts", () => {
    expect(formatTokens(92_000_000)).toBe("92M");
    expect(formatTokens(1_500_000)).toBe("1.5M");
    expect(formatTokens(830_400)).toBe("830k");
    expect(formatTokens(12)).toBe("12");
  });

  it("tells you which key to replace and where", () => {
    const base = { label: "OpenRouter", keyCount: 3, envVar: "OPENROUTER_API_KEYS", budget: 100_000_000 };
    expect(budgetNote({ ...base, keyIndex: 1, tokensUsed: 10 })).toBeNull();
    expect(budgetNote({ ...base, keyIndex: 1, tokensUsed: 92_000_000 })).toBe("Key 2 of OpenRouter: 92M of 100M tokens used. Create a new key and add it to OPENROUTER_API_KEYS soon.");
    expect(budgetNote({ ...base, keyIndex: 0, keyCount: 1, tokensUsed: 100_000_000 })).toContain("so it is skipped");
  });
});
