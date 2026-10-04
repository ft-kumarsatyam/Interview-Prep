import { describe, expect, it } from "vitest";
import { titleForExcerpt } from "@/modules/notes/domain/notes";

describe("captured notes", () => {
  it("prefers the nearby heading for the note title", () => {
    expect(titleForExcerpt("A long selected explanation", "Caching")).toBe("Caching");
  });

  it("falls back to the first line and caps the title", () => {
    expect(titleForExcerpt("A useful idea\nmore detail")).toBe("A useful idea");
    expect(titleForExcerpt("x".repeat(200))).toHaveLength(160);
  });
});
