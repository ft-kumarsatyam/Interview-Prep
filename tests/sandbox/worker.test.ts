import { describe, expect, it } from "vitest";
import { runWorker, type Message } from "./helpers";

const logs = (ms: Message[]) => ms.filter((m) => m.type === "log").map((m) => m.text as string);
const cases = (ms: Message[]) => ms.filter((m) => m.type === "case");

describe("free-form run (Playground)", () => {
  it("captures console output and finishes", async () => {
    const ms = await runWorker('console.log(1, [1, 2], "x"); setTimeout(() => console.log("later"), 5);');
    expect(logs(ms)).toEqual(["1 [ 1, 2 ] x", "later"]);
    expect(ms.at(-1)).toEqual({ type: "done" });
  });

  it("reports uncaught errors", async () => {
    const ms = await runWorker('throw new Error("boom")');
    expect(logs(ms)[0]).toMatch(/^Uncaught Error: boom/);
  });

  it("removes network access", async () => {
    const ms = await runWorker("console.log(typeof fetch, typeof XMLHttpRequest, typeof WebSocket)");
    expect(logs(ms)).toEqual(["undefined undefined undefined"]);
  });
});

describe("output caps", () => {
  it("shortens long arrays and objects", async () => {
    const ms = await runWorker("console.log(Array.from({ length: 250 }, (_, i) => i)); console.log(new Set(Array.from({ length: 150 }, (_, i) => i)));");
    const [arr, set] = logs(ms);
    expect(arr).toContain("... 150 more");
    expect(arr).not.toContain("249");
    expect(set).toContain("Set(150)");
    expect(set).toContain("... 50 more");
  });

  it("stops after 2000 lines with one notice, instead of flooding the page", async () => {
    const ms = await runWorker("for (let i = 0; i < 5000; i++) console.log(i);");
    const out = logs(ms);
    expect(out.filter((l) => /^\d+$/.test(l))).toHaveLength(2000);
    expect(out.filter((l) => l.includes("output truncated"))).toHaveLength(1);
  });

  it("truncates a single huge line", async () => {
    const ms = await runWorker('console.log("a".repeat(50000))');
    const [line] = logs(ms);
    expect(line!.length).toBeLessThan(20100);
    expect(line).toContain("more characters");
  });
});

describe("console helpers", () => {
  it("console.table lays out arrays of objects in aligned columns", async () => {
    const ms = await runWorker('console.table([{ a: 1, b: "x" }, { a: 22, c: true }])');
    const [table] = logs(ms);
    const lines = table!.split("\n");
    expect(lines).toHaveLength(6);
    expect(lines[1]).toMatch(/\(index\).*a.*b.*c/);
    expect(new Set(lines.map((l) => l.length)).size).toBe(1);
    expect(table).toContain("22");
  });

  it("console.table handles primitives in an array", async () => {
    const [table] = logs(await runWorker("console.table([10, 20])"));
    expect(table).toContain("Values");
    expect(table).toContain("20");
  });

  it("group indents and groupEnd restores", async () => {
    const out = logs(await runWorker('console.group("g"); console.log("in"); console.group(); console.log("deeper"); console.groupEnd(); console.groupEnd(); console.log("out")'));
    expect(out).toEqual(["g", "  in", "    deeper", "out"]);
  });

  it("count, assert and time", async () => {
    const ms = await runWorker('console.count("x"); console.count("x"); console.assert(1 === 2, "nope"); console.time("t"); console.timeEnd("t"); console.timeEnd("missing");');
    const out = logs(ms);
    expect(out.slice(0, 2)).toEqual(["x: 1", "x: 2"]);
    expect(out[2]).toBe("Assertion failed: nope");
    expect(out[3]).toMatch(/^t: \d+\.\d+ ms$/);
    expect(out[4]).toMatch(/does not exist/);
  });
});

describe("assertEqual and test", () => {
  it("assertEqual compares structurally and logs PASS/FAIL", async () => {
    const out = logs(await runWorker('assertEqual([1, { a: 2 }], [1, { a: 2 }], "same"); assertEqual([1, 2], [2, 1], "order")'));
    expect(out[0]).toMatch(/^PASS same:/);
    expect(out[1]).toMatch(/^FAIL order: expected \[ 2, 1 \], got \[ 1, 2 \]/);
  });

  it("assertEqual returns whether it passed", async () => {
    const out = logs(await runWorker("console.log(assertEqual(1, 1), assertEqual(1, 2))"));
    expect(out.at(-1)).toBe("true false");
  });

  it("test() runs async bodies, fails on a throw or a failed assertEqual, and summarises", async () => {
    const code = `
      test("adds", () => { assertEqual(1 + 1, 2); });
      test("async works", async () => { await new Promise((r) => setTimeout(r, 5)); assertEqual("a", "a"); });
      test("throws", () => { throw new Error("bad thing"); });
      test("bad assert", () => { assertEqual(1, 2); });
    `;
    const ms = await runWorker(code, 60);
    const out = logs(ms);
    expect(out).toContain("PASS adds");
    expect(out).toContain("PASS async works");
    expect(out).toContain("FAIL throws - bad thing");
    expect(out).toContain("FAIL bad assert");
    expect(out.at(-1)).toBe("2 passed, 2 failed");
    expect(ms.at(-1)).toEqual({ type: "done" });
  });

  it("prints no summary when no test() was used", async () => {
    expect(logs(await runWorker("console.log(1)"))).toEqual(["1"]);
  });
});

describe("DSA test harness", () => {
  const harness = (functionName: string, c: Array<{ input: unknown[]; expected: unknown; hidden: boolean }>) => ({ code: "", harness: { functionName, cases: c } });

  it("runs each case, comparing structurally", async () => {
    const ms = await runWorker({
      ...harness("twoSum", [
        { input: [[2, 7, 11, 15], 9], expected: [0, 1], hidden: false },
        { input: [[3, 3], 6], expected: [0, 1], hidden: true },
        { input: [[1, 2], 99], expected: [], hidden: false },
      ]),
      code: "function twoSum(n, t) { for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) if (n[i] + n[j] === t) return [i, j]; return []; }",
    });
    expect(cases(ms).map((c) => [c.index, c.pass, c.hidden])).toEqual([
      [0, true, false],
      [1, true, true],
      [2, true, false],
    ]);
    expect(ms.at(-1)).toEqual({ type: "done" });
  });

  it("marks wrong answers failed and shows the actual value", async () => {
    const ms = await runWorker({ ...harness("f", [{ input: [1], expected: 2, hidden: false }]), code: "function f(n) { return 999; }" });
    expect(cases(ms)[0]).toMatchObject({ pass: false, actual: "999" });
  });

  it("a throwing case fails only that case", async () => {
    const ms = await runWorker({
      ...harness("f", [
        { input: [0], expected: 0, hidden: false },
        { input: [1], expected: 1, hidden: false },
      ]),
      code: 'function f(n) { if (n === 0) throw new Error("boom"); return n; }',
    });
    expect(cases(ms).map((c) => c.pass)).toEqual([false, true]);
    expect(cases(ms)[0]?.actual).toMatch(/^threw Error: boom/);
  });

  it("reports a missing function instead of silently passing", async () => {
    const ms = await runWorker({ ...harness("romanToInt", [{ input: ["I"], expected: 1, hidden: false }]), code: "function nope() {}" });
    expect(cases(ms)).toHaveLength(0);
    expect(logs(ms)[0]).toBe("No function named 'romanToInt' was found.");
  });

  it("reports a syntax error in the submission", async () => {
    const ms = await runWorker({ ...harness("f", [{ input: [1], expected: 1, hidden: false }]), code: "function f( {" });
    expect(logs(ms)[0]).toMatch(/^Uncaught SyntaxError/);
    expect(ms.at(-1)).toEqual({ type: "done" });
  });
});
