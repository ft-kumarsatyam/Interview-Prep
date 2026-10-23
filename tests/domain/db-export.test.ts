import { describe, expect, it } from "vitest";
import { cappedNotice, exportFile, filterRows, nextSort, sortRows, toCsv, toJson, toMarkdown } from "@/modules/dsa/domain/db-export";

describe("toCsv", () => {
  it("quotes commas, quotes, and newlines, and writes NULL as empty", () => {
    const csv = toCsv(["a", "b,c"], [
      ["x,y", 'say "hi"'],
      ["line1\nline2", null],
      [1, true],
    ]);
    expect(csv).toBe('a,"b,c"\n"x,y","say ""hi"""\n"line1\nline2",\n1,true');
  });
  it("quotes carriage returns too", () => {
    expect(toCsv(["a"], [["a\rb"]])).toBe('a\n"a\rb"');
  });
  it("writes just the header for no rows", () => {
    expect(toCsv(["a", "b"], [])).toBe("a,b");
  });
});

describe("toJson", () => {
  it("makes an array of objects and keeps NULL", () => {
    expect(JSON.parse(toJson(["id", "name"], [[1, "Ana"], [2, null]]))).toEqual([
      { id: 1, name: "Ana" },
      { id: 2, name: null },
    ]);
  });
  it("suffixes duplicate column names instead of dropping values", () => {
    expect(JSON.parse(toJson(["n", "n"], [[1, 2]]))).toEqual([{ n: 1, n_2: 2 }]);
  });
});

describe("toMarkdown", () => {
  it("escapes pipes and newlines and shows NULL", () => {
    expect(toMarkdown(["a|b", "c"], [["x|y", null], ["l1\nl2", 3]])).toBe("| a\\|b | c |\n| --- | --- |\n| x\\|y | NULL |\n| l1<br>l2 | 3 |");
  });
});

describe("sortRows", () => {
  const rows = [[10, "b"], [2, "a"], [null, "c"], [33, "d"]];
  it("sorts numbers numerically with NULLs last in both directions", () => {
    expect(sortRows(rows, 0, "asc").map((r) => r[0])).toEqual([2, 10, 33, null]);
    expect(sortRows(rows, 0, "desc").map((r) => r[0])).toEqual([33, 10, 2, null]);
  });
  it("sorts text naturally and is stable", () => {
    expect(sortRows([["a10"], ["a2"], ["A1"]], 0, "asc").map((r) => r[0])).toEqual(["A1", "a2", "a10"]);
    expect(sortRows([[1, "x"], [1, "y"], [1, "z"]], 0, "desc").map((r) => r[1])).toEqual(["x", "y", "z"]);
  });
  it("does not mutate its input", () => {
    const copy = JSON.stringify(rows);
    sortRows(rows, 0, "asc");
    expect(JSON.stringify(rows)).toBe(copy);
  });
});

describe("nextSort", () => {
  it("cycles ascending, descending, off, and restarts on another column", () => {
    const a = nextSort(null, 1);
    expect(a).toEqual({ col: 1, dir: "asc" });
    const d = nextSort(a, 1);
    expect(d).toEqual({ col: 1, dir: "desc" });
    expect(nextSort(d, 1)).toBeNull();
    expect(nextSort(d, 2)).toEqual({ col: 2, dir: "asc" });
  });
});

describe("filterRows", () => {
  const rows = [["Ana", "IN", 29], ["Ben", "US", null], ["Chloe", "US", 41]];
  it("needs every term in some cell, ignoring case", () => {
    expect(filterRows(rows, "us 41")).toEqual([["Chloe", "US", 41]]);
    expect(filterRows(rows, "ANA")).toEqual([["Ana", "IN", 29]]);
  });
  it("matches the word null for NULL cells and returns everything for blank input", () => {
    expect(filterRows(rows, "null")).toEqual([["Ben", "US", null]]);
    expect(filterRows(rows, "  ")).toHaveLength(3);
  });
});

describe("cappedNotice and exportFile", () => {
  it("is silent unless the result was capped", () => {
    expect(cappedNotice(500, 500)).toBeNull();
    expect(cappedNotice(500, 1234)).toMatch(/^Showing 500 of 1,234 rows/);
  });
  it("names files safely", () => {
    expect(exportFile("csv", ["a"], [[1]], "Preview: my table!").name).toBe("Preview-my-table.csv");
    expect(exportFile("json", ["a"], [[1]], "").type).toBe("application/json");
  });
});
