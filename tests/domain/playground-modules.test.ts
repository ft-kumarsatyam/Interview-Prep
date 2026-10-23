import { describe, expect, it } from "vitest";
import { buildJsPrelude, jsModuleKey, moduleHint, pyModuleName, pythonModules, withJsModules } from "@/modules/dsa/domain/playground-modules";

describe("playground modules", () => {
  it("validates Python module names", () => {
    expect(pyModuleName("helper.py")).toBe("helper");
    expect(pyModuleName("_a1")).toBe("_a1");
    expect(pyModuleName("my-file.py")).toBeNull();
    expect(pyModuleName("1abc.py")).toBeNull();
    expect(pyModuleName("class.py")).toBeNull();
    expect(pyModuleName("main.js")).toBeNull();
  });

  it("collects importable Python files and reports the rest", () => {
    const r = pythonModules([
      { name: "helper.py", language: "python", code: "X = 1" },
      { name: "bad name.py", language: "python", code: "" },
      { name: "util.js", language: "javascript", code: "" },
    ]);
    expect(r.files).toEqual({ "helper.py": "X = 1" });
    expect(r.problems).toHaveLength(1);
    expect(r.problems[0]).toContain("bad name.py");
  });

  it("normalises require keys", () => {
    expect(jsModuleKey("./util.js")).toBe("util");
    expect(jsModuleKey("util.ts")).toBe("util");
    expect(jsModuleKey("util")).toBe("util");
  });

  it("builds a one-line prelude that resolves modules and keeps your line numbers", () => {
    expect(buildJsPrelude({})).toBe("");
    expect(withJsModules("x", {})).toBe("x");
    const code = withJsModules("module.exports.r = require('./a').v;", { a: "exports.v = 41 + 1;", b: "const s = `x y`;" });
    expect(code.split("\n")).toHaveLength(1);
    const run = new Function("module", `${code}; return require('a.js').v + require('./b').toString();`) as (m: { exports: object }) => unknown;
    expect(run({ exports: {} })).toBe("42[object Object]");
  });

  it("explains a missing module", () => {
    const prelude = buildJsPrelude({ a: "" });
    const f = new Function(`${prelude} return require('./nope');`);
    expect(() => f()).toThrow(/Cannot find module '.\/nope'.*nope\.js/);
  });

  it("has a hint per language", () => {
    expect(moduleHint("python")).toContain("import helper");
    expect(moduleHint("typescript")).toContain("require");
  });
});
