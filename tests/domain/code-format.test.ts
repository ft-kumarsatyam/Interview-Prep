import { describe, expect, it } from "vitest";
import { parsePrettierError, tidyPython } from "@/modules/dsa/domain/code-format";

describe("tidyPython", () => {
  it("turns leading tabs into spaces, trims trailing space and ends with one newline", () => {
    expect(tidyPython("def f():\t\n\treturn 1  \n\n\n")).toBe("def f():\n    return 1\n");
  });
  it("leaves tabs inside strings alone and normalises line endings", () => {
    expect(tidyPython('print("a\tb")\r\nx = 1')).toBe('print("a\tb")\nx = 1\n');
  });
  it("returns empty for blank input", () => {
    expect(tidyPython("  \n\n")).toBe("");
  });
});

describe("parsePrettierError", () => {
  it("reads loc", () => {
    expect(parsePrettierError({ message: "Unexpected token (3:7)\n> 3 | x", loc: { start: { line: 3, column: 6 } } })).toEqual({ message: "Unexpected token", line: 3, column: 7 });
  });
  it("falls back to the message suffix", () => {
    expect(parsePrettierError(new Error("Missing semicolon. (2:5)\n..."))).toEqual({ message: "Missing semicolon.", line: 2, column: 5 });
    expect(parsePrettierError("x")).toEqual({ message: "Could not format" });
  });
});
