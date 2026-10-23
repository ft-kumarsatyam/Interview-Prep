import { describe, expect, it } from "vitest";
import { errorMarkers, hintFor, parseRunError, splitStack } from "@/modules/dsa/domain/run-errors";

const SRC = "const a = 1;\nconsole.log(b);\nconsole.log(a);";

describe("parseRunError", () => {
  it("reads a JS error and maps the line past the sandbox wrapper", () => {
    const text = "Uncaught ReferenceError: b is not defined\n    at eval (eval at <anonymous> (blob:http://x/abc:219:20), <anonymous>:4:13)\n    at foo";
    expect(parseRunError("javascript", text, SRC)).toMatchObject({ name: "ReferenceError", message: "b is not defined", line: 2, column: 13 });
  });

  it("understands the Firefox stack format", () => {
    expect(parseRunError("javascript", "TypeError: x is not a function\n@blob:abc line 9 > AsyncFunction:5:3", "1\n2\n3\n4")?.line).toBe(3);
  });

  it("drops a line that is outside the learner's code", () => {
    expect(parseRunError("javascript", "Error: boom\n at <anonymous>:99:1", SRC)?.line).toBeUndefined();
    expect(parseRunError("javascript", "Error: boom\n at <anonymous>:2:1", SRC)?.line).toBeUndefined();
  });

  it("reads TypeScript transpile errors", () => {
    expect(parseRunError("typescript", "Line 3:5 ',' expected.", SRC)).toMatchObject({ name: "SyntaxError", line: 3, column: 5, message: "',' expected." });
  });

  it("reads the Python harness format and a raw traceback", () => {
    expect(parseRunError("python", "NameError: name 'x' is not defined (line 3)", "a\nb\nc")).toMatchObject({ name: "NameError", message: "name 'x' is not defined", line: 3 });
    expect(parseRunError("python", "SyntaxError: invalid syntax (line 2)", "a\nb")?.hint).toMatch(/bracket/);
    const tb = 'Traceback (most recent call last):\n  File "<main>", line 4, in <module>\n  File "<main>", line 2, in f\nZeroDivisionError: division by zero';
    expect(parseRunError("python", tb, "1\n2\n3\n4\n5")).toMatchObject({ name: "ZeroDivisionError", line: 2 });
  });

  it("locates a SQL syntax error in the query", () => {
    expect(parseRunError("sql", 'near "FORM": syntax error', "SELECT *\nFORM users")).toMatchObject({ name: "SyntaxError", line: 2, column: 1 });
    expect(parseRunError("sql", "Error: no such table: nope")).toMatchObject({ name: "SQLError", message: "no such table: nope" });
  });

  it("returns null for text that is not an error", () => {
    expect(parseRunError("javascript", "hello world")).toBeNull();
    expect(parseRunError("python", "3 passed")).toBeNull();
    expect(parseRunError("sql", "")).toBeNull();
  });

  it("gives a hint for common mistakes", () => {
    expect(hintFor("ReferenceError: x is not defined")).toMatch(/spelling/);
    expect(hintFor("EOFError: EOF when reading a line")).toMatch(/stdin/);
    expect(hintFor("something unusual")).toBeUndefined();
  });

  it("collects editor markers only for error lines that point at your code", () => {
    const logs = [
      { level: "log", text: "hi" },
      { level: "error", text: "Uncaught ReferenceError: b is not defined\n at <anonymous>:4:13" },
      { level: "error", text: "Something odd" },
    ];
    expect(errorMarkers("javascript", logs, SRC)).toEqual([{ line: 2, column: 13, message: "ReferenceError: b is not defined" }]);
  });

  it("folds stack frames away from the message", () => {
    expect(splitStack("Uncaught Error: boom\n    at a (x:1:1)\n    at b (y:2:2)")).toEqual({ message: "Uncaught Error: boom", frames: ["at a (x:1:1)", "at b (y:2:2)"] });
    expect(splitStack("plain")).toEqual({ message: "plain", frames: [] });
  });
});
