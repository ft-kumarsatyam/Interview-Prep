import { describe, expect, it } from "vitest";
import { contextualRequestSchema } from "@/modules/ai/domain/contextual";

describe("contextual AI request", () => {
  it("accepts bounded selection context", () => {
    expect(contextualRequestSchema.parse({
      action: "explain",
      text: "A cache stores a previously computed value.",
      source: { title: "Caching", href: "https://example.com/learn", kind: "lesson" },
    }).action).toBe("explain");
  });

  it("rejects empty or oversized selections", () => {
    expect(contextualRequestSchema.safeParse({ action: "explain", text: "x", source: { title: "T", href: "https://example.com", kind: "lesson" } }).success).toBe(false);
    expect(contextualRequestSchema.safeParse({ action: "explain", text: "x".repeat(8_001), source: { title: "T", href: "https://example.com", kind: "lesson" } }).success).toBe(false);
  });
});
