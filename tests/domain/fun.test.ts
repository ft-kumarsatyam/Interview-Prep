import { describe, expect, it } from "vitest";
import { JOKES, PUZZLES, puzzlesFor } from "@/modules/fun/domain/fun-content";

describe("break room content", () => {
  it("has stable ids and useful category shelves", () => {
    expect(new Set(PUZZLES.map((p) => p.id)).size).toBe(PUZZLES.length);
    expect(puzzlesFor("software").every((p) => p.category === "software")).toBe(true);
    expect(JOKES.every((j) => j.breakMinutes >= 5)).toBe(true);
  });
});
