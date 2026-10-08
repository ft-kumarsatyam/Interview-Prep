import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { PY_HARNESS } from "@/core/sandbox/py-worker-source";

/**
 * The Python half of the harness, run by a local CPython (the browser runs the same source in Pyodide).
 * Skipped when python3 isn't installed.
 */
const hasPython = spawnSync("python3", ["--version"]).status === 0;

function run(code: string, payload: object): { crash?: string; results?: Array<{ json?: string; error?: string }> } {
  const script = `${PY_HARNESS}\nimport sys as _s\n_s.stdout.write(__prepos_run(${JSON.stringify(code)}, ${JSON.stringify(JSON.stringify(payload))}))\n`;
  const out = spawnSync("python3", ["-c", script], { encoding: "utf8" });
  if (out.status !== 0) throw new Error(out.stderr);
  return JSON.parse(out.stdout);
}

describe.skipIf(!hasPython)("Python harness", () => {
  it("runs a LeetCode-style Solution method", () => {
    const code = "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        seen = {}\n        for i, n in enumerate(nums):\n            if target - n in seen:\n                return [seen[target - n], i]\n            seen[n] = i\n";
    const res = run(code, { functionName: "twoSum", cases: [[[2, 7, 11, 15], 9], [[3, 3], 6]], argTypes: [], returns: "value" });
    expect(res.results?.map((r) => JSON.parse(r.json!))).toEqual([[0, 1], [0, 1]]);
  });

  it("accepts a top-level snake_case function", () => {
    const res = run("def two_sum(nums, target):\n    return [0, 1]\n", { functionName: "twoSum", cases: [[[1, 2], 3]], argTypes: [], returns: "value" });
    expect(res.results?.[0]?.json).toBe("[0, 1]");
  });

  it("builds and encodes linked lists and trees", () => {
    const reverse = "class Solution:\n    def reverseList(self, head):\n        prev = None\n        while head:\n            head.next, prev, head = prev, head, head.next\n        return prev\n";
    expect(run(reverse, { functionName: "reverseList", cases: [[[1, 2, 3]]], argTypes: ["ListNode"], returns: "ListNode" }).results?.[0]?.json).toBe("[3, 2, 1]");
    const invert = "class Solution:\n    def invertTree(self, root):\n        if root:\n            root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)\n        return root\n";
    expect(run(invert, { functionName: "invertTree", cases: [[[4, 2, 7, 1, 3, 6, 9]]], argTypes: ["TreeNode"], returns: "TreeNode" }).results?.[0]?.json).toBe("[4, 7, 2, 9, 6, 3, 1]");
  });

  it("passes 'TreeNodeRef' arguments as nodes of the tree and encodes a 'TreeNodeVal' return", () => {
    const code = "class Solution:\n    def lowestCommonAncestor(self, root, p, q):\n        if root in (None, p, q):\n            return root\n        l, r = self.lowestCommonAncestor(root.left, p, q), self.lowestCommonAncestor(root.right, p, q)\n        return root if l and r else l or r\n";
    const res = run(code, { functionName: "lowestCommonAncestor", cases: [[[3, 5, 1, 6, 2, 0, 8], 5, 1], [[3, 5, 1, 6, 2, 0, 8], 6, 2]], argTypes: ["TreeNode", "TreeNodeRef", "TreeNodeRef"], returns: "TreeNodeVal" });
    expect(res.results?.map((r) => r.json)).toEqual(["3", "5"]);
  });

  it("judges an in-place solution on its mutated first argument", () => {
    const code = "class Solution:\n    def moveZeroes(self, nums):\n        nums.sort(key=lambda x: x == 0)\n";
    expect(run(code, { functionName: "moveZeroes", cases: [[[0, 1, 0, 3]]], argTypes: [], returns: "arg0" }).results?.[0]?.json).toBe("[1, 3, 0, 0]");
  });

  it("detects a cycle created by the input spec", () => {
    const code = "class Solution:\n    def hasCycle(self, head):\n        slow = fast = head\n        while fast and fast.next:\n            slow, fast = slow.next, fast.next.next\n            if slow is fast:\n                return True\n        return False\n";
    const res = run(code, { functionName: "hasCycle", cases: [[{ list: [3, 2, 0, -4], pos: 1 }], [{ list: [1], pos: -1 }]], argTypes: ["cycleList"], returns: "value" });
    expect(res.results?.map((r) => r.json)).toEqual(["true", "false"]);
  });

  it("builds an array of lists for a 'ListNode[]' argument", () => {
    const code = "class Solution:\n    def heads(self, lists):\n        return [l.val if l else None for l in lists]\n";
    expect(run(code, { functionName: "heads", cases: [[[[1, 4], [], [2]]]], argTypes: ["ListNode[]"], returns: "value" }).results?.[0]?.json).toBe("[1, null, 2]");
  });

  it("reports syntax errors, missing functions and per-case exceptions with line numbers", () => {
    expect(run("def f(:\n  pass", { functionName: "f", cases: [], argTypes: [], returns: "value" }).crash).toMatch(/^SyntaxError/);
    expect(run("def g(): pass", { functionName: "f", cases: [], argTypes: [], returns: "value" }).crash).toMatch(/No function or Solution method named 'f'/);
    const res = run("def f(x):\n    return 1 // x\n", { functionName: "f", cases: [[0]], argTypes: [], returns: "value" });
    expect(res.results?.[0]?.error).toMatch(/^ZeroDivisionError: .+ \(line 2\)$/);
  });
});
