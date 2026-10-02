import { describe, expect, it } from "vitest";
import { workerLib } from "@/lib/sandbox/worker-lib-node";
import { runWorker } from "./helpers";

const lib = workerLib();

describe("lists", () => {
  it("round-trips arrays", () => {
    for (const arr of [[], [1], [1, 2, 3], [-5, 0, 5, 5]]) expect(lib.listToArray(lib.listFromArray(arr))).toEqual(arr);
  });

  it("builds real linked nodes", () => {
    const head = lib.listFromArray([1, 2]) as { val: number; next: { val: number; next: unknown } };
    expect(head).toBeInstanceOf(lib.ListNode);
    expect(head.val).toBe(1);
    expect(head.next.val).toBe(2);
    expect(head.next.next).toBeNull();
    expect(lib.listFromArray([])).toBeNull();
  });

  it("rejects a non-array and an enormous one", () => {
    expect(() => lib.listFromArray("nope")).toThrow(/array/);
    expect(() => lib.listFromArray(new Array(10_001).fill(1))).toThrow(/too long/);
  });

  it("refuses to serialise a cyclic list instead of hanging", () => {
    const a = new lib.ListNode(1);
    const b = new lib.ListNode(2, a);
    a.next = b;
    expect(() => lib.listToArray(a)).toThrow(/cycle/);
  });

  it("treats null/undefined as the empty list", () => {
    expect(lib.listToArray(null)).toEqual([]);
    expect(lib.listToArray(undefined)).toEqual([]);
  });
});

describe("cycle lists", () => {
  it("links the tail back to the node at pos", () => {
    const head = lib.cycleListFromSpec({ list: [3, 2, 0, -4], pos: 1 }) as { val: number; next: { val: number; next: { next: { next: unknown } } } };
    expect(head.val).toBe(3);
    expect(head.next.next.next.next).toBe(head.next); // -4 -> 2
  });

  it("pos 0 loops to the head, and -1 or missing pos means no cycle", () => {
    const loop = lib.cycleListFromSpec({ list: [1, 2], pos: 0 }) as { next: { next: unknown } };
    expect(loop.next.next).toBe(loop);
    const plain = lib.cycleListFromSpec({ list: [1, 2], pos: -1 }) as { next: { next: unknown } };
    expect(plain.next.next).toBeNull();
    expect((lib.cycleListFromSpec({ list: [1, 2] }) as { next: { next: unknown } }).next.next).toBeNull();
  });

  it("handles an empty list and rejects a malformed spec", () => {
    expect(lib.cycleListFromSpec({ list: [], pos: -1 })).toBeNull();
    expect(() => lib.cycleListFromSpec([1, 2])).toThrow(/\{ list, pos \}/);
  });
});

describe("trees (LeetCode level order)", () => {
  const cases: unknown[][] = [[], [1], [1, 2, 3], [1, null, 2, 3], [3, 9, 20, null, null, 15, 7], [1, 2, null, 3, null, 4], [5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]];

  it.each(cases.map((c) => [JSON.stringify(c), c] as const))("round-trips %s", (_name, arr) => {
    expect(lib.treeToLevelOrder(lib.treeFromLevelOrder(arr))).toEqual(arr);
  });

  it("builds the shape LeetCode describes", () => {
    const root = lib.treeFromLevelOrder([3, 9, 20, null, null, 15, 7]) as { val: number; left: { val: number; left: unknown }; right: { val: number; left: { val: number }; right: { val: number } } };
    expect(root).toBeInstanceOf(lib.TreeNode);
    expect(root.left.val).toBe(9);
    expect(root.left.left).toBeNull();
    expect([root.right.val, root.right.left.val, root.right.right.val]).toEqual([20, 15, 7]);
  });

  it("trims trailing nulls and treats an empty tree as []", () => {
    expect(lib.treeToLevelOrder(lib.treeFromLevelOrder([1, null, null]))).toEqual([1]);
    expect(lib.treeFromLevelOrder([null])).toBeNull();
    expect(lib.treeToLevelOrder(null)).toEqual([]);
  });

  it("refuses a cyclic or oversized tree", () => {
    const root = new lib.TreeNode(1);
    root.left = root;
    expect(() => lib.treeToLevelOrder(root)).toThrow(/cycle/);
    expect(() => lib.treeFromLevelOrder(new Array(10_001).fill(1))).toThrow(/too large/);
  });

  it("serialises a deep skewed tree without blowing the stack", () => {
    let root = new lib.TreeNode(0);
    const top = root;
    for (let i = 1; i < 5000; i++) {
      root.right = new lib.TreeNode(i);
      root = root.right as typeof root;
    }
    expect(lib.treeToLevelOrder(top).filter((v) => v !== null)).toHaveLength(5000);
  });
});

describe("buildArg / encodeResult", () => {
  it("passes plain values through and encodes by return kind", () => {
    expect(lib.buildArg("value", [1, 2])).toEqual([1, 2]);
    const list = lib.buildArg("ListNode", [1, 2]);
    expect(lib.encodeResult("ListNode", list, [list])).toEqual([1, 2]);
    expect(lib.encodeResult("value", 7, [])).toBe(7);
  });

  it("'arg0' encodes the first argument after an in-place change", () => {
    const args = [lib.buildArg("ListNode", [1, 2, 3])] as Array<{ val: number }>;
    args[0]!.val = 9;
    expect(lib.encodeResult("arg0", undefined, args, ["ListNode"])).toEqual([9, 2, 3]);
    const arr = [3, 1];
    arr.sort();
    expect(lib.encodeResult("arg0", undefined, [arr], ["value"])).toEqual([1, 3]);
  });

  it("deepEqual compares encoded structures", () => {
    expect(lib.deepEqual(lib.treeToLevelOrder(lib.treeFromLevelOrder([1, 2, 3])), [1, 2, 3])).toBe(true);
    expect(lib.deepEqual([1, null, 2], [1, 2])).toBe(false);
  });
});

const harness = (functionName: string, cases: Array<{ input: unknown[]; expected: unknown; hidden?: boolean }>, shape: { argTypes?: string[]; returns?: string }, code: string) => ({
  code,
  harness: { functionName, cases: cases.map((c) => ({ hidden: false, ...c })), ...shape },
});
const results = (ms: Awaited<ReturnType<typeof runWorker>>) => ms.filter((m) => m.type === "case").map((m) => [m.pass, m.actual]);

describe("the Worker harness with real nodes", () => {
  it("runs a user's list function on a real ListNode chain", async () => {
    const code = "function reverseList(head) { let prev = null; while (head) { const next = head.next; head.next = prev; prev = head; head = next; } return prev; }";
    const ms = await runWorker(
      harness("reverseList", [{ input: [[1, 2, 3]], expected: [3, 2, 1] }, { input: [[]], expected: [] }, { input: [[1]], expected: [1] }], { argTypes: ["ListNode"], returns: "ListNode" }, code),
    );
    expect(results(ms)).toEqual([[true, "[ 3, 2, 1 ]"], [true, "[]"], [true, "[ 1 ]"]]);
  });

  it("runs a tree function and encodes the returned tree", async () => {
    const code = "function invertTree(root) { if (!root) return null; const l = invertTree(root.left); root.left = invertTree(root.right); root.right = l; return root; }";
    const ms = await runWorker(harness("invertTree", [{ input: [[4, 2, 7, 1, 3, 6, 9]], expected: [4, 7, 2, 9, 6, 3, 1] }, { input: [[]], expected: [] }], { argTypes: ["TreeNode"], returns: "TreeNode" }, code));
    expect(results(ms).map((r) => r[0])).toEqual([true, true]);
  });

  it("two tree arguments and a boolean result", async () => {
    const code = "function isSameTree(p, q) { if (!p && !q) return true; if (!p || !q || p.val !== q.val) return false; return isSameTree(p.left, q.left) && isSameTree(p.right, q.right); }";
    const ms = await runWorker(harness("isSameTree", [{ input: [[1, 2, 3], [1, 2, 3]], expected: true }, { input: [[1, 2], [1, null, 2]], expected: false }], { argTypes: ["TreeNode", "TreeNode"] }, code));
    expect(results(ms).map((r) => r[0])).toEqual([true, true]);
  });

  it("detects a cycle through the { list, pos } input", async () => {
    const code = "function hasCycle(head) { let s = head, f = head; while (f && f.next) { s = s.next; f = f.next.next; if (s === f) return true; } return false; }";
    const ms = await runWorker(harness("hasCycle", [{ input: [{ list: [3, 2, 0, -4], pos: 1 }], expected: true }, { input: [{ list: [1, 2], pos: -1 }], expected: false }, { input: [{ list: [], pos: -1 }], expected: false }], { argTypes: ["cycleList"] }, code));
    expect(results(ms).map((r) => r[0])).toEqual([true, true, true]);
  });

  it("'arg0' checks an in-place change", async () => {
    const ms = await runWorker(harness("sortInPlace", [{ input: [[3, 1, 2]], expected: [1, 2, 3] }], { returns: "arg0" }, "function sortInPlace(a) { a.sort((x, y) => x - y); }"));
    expect(results(ms)).toEqual([[true, "[ 1, 2, 3 ]"]]);
  });

  it("a wrong list result fails and shows what came back", async () => {
    const ms = await runWorker(harness("f", [{ input: [[1, 2]], expected: [2, 1] }], { argTypes: ["ListNode"], returns: "ListNode" }, "function f(head) { return head; }"));
    expect(results(ms)).toEqual([[false, "[ 1, 2 ]"]]);
  });

  it("returning a cyclic list fails that case with a clear message instead of hanging", async () => {
    const ms = await runWorker(harness("f", [{ input: [[1, 2]], expected: [1, 2] }], { argTypes: ["ListNode"], returns: "ListNode" }, "function f(head) { head.next.next = head; return head; }"));
    expect(results(ms)[0]![0]).toBe(false);
    expect(String(results(ms)[0]![1])).toMatch(/cycle/);
  });

  it("a malformed input fails the case rather than crashing the run", async () => {
    const ms = await runWorker(
      harness("f", [{ input: ["not an array"], expected: [] }, { input: [[1]], expected: [1] }], { argTypes: ["ListNode"], returns: "ListNode" }, "function f(head) { return head; }"),
    );
    expect(results(ms).map((r) => r[0])).toEqual([false, true]);
  });

  it("without argTypes it behaves exactly as before (plain values)", async () => {
    const ms = await runWorker(harness("add", [{ input: [1, 2], expected: 3 }], {}, "function add(a, b) { return a + b; }"));
    expect(results(ms)).toEqual([[true, "3"]]);
  });
});

describe("order-insensitive comparison", () => {
  it("canonical sorts arrays recursively and leaves everything else alone", () => {
    expect(lib.canonical([3, 1, 2])).toEqual([1, 2, 3]);
    expect(lib.canonical([[2, 1], [1, 3]])).toEqual([[1, 2], [1, 3]]);
    expect(lib.canonical({ b: [2, 1], a: 1 })).toEqual({ a: 1, b: [1, 2] });
    expect(lib.canonical(5)).toBe(5);
    expect(lib.canonical(null)).toBeNull();
  });

  it("'unordered' accepts any ordering but still rejects a different answer", () => {
    expect(lib.matches([1, 0], [0, 1], "unordered")).toBe(true);
    expect(lib.matches([[2, 1], [0, 3]], [[0, 3], [1, 2]], "unordered")).toBe(true);
    expect(lib.matches([0, 2], [0, 1], "unordered")).toBe(false);
    expect(lib.matches([1, 1], [1], "unordered")).toBe(false);
  });

  it("the default and 'exact' are strict about order", () => {
    expect(lib.matches([1, 0], [0, 1])).toBe(false);
    expect(lib.matches([1, 0], [0, 1], "exact")).toBe(false);
    expect(lib.matches([0, 1], [0, 1], "exact")).toBe(true);
  });

  it("the Worker honours it", async () => {
    const run = (compare: string | undefined) =>
      runWorker({ code: "function f() { return [1, 0]; }", harness: { functionName: "f", cases: [{ input: [], expected: [0, 1], hidden: false }], compare } });
    expect(results(await run("unordered"))[0]![0]).toBe(true);
    expect(results(await run(undefined))[0]![0]).toBe(false);
  });
});
