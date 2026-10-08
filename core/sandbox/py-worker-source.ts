import { WORKER_LIB_SOURCE } from "@/core/sandbox/worker-lib";

/** Pinned so a CDN release can never change how your code is judged. */
export const PYODIDE_VERSION = "0.27.7";
export const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/**
 * Python side of the harness: LeetCode's ListNode/TreeNode, the same array encodings as
 * lib/sandbox/worker-lib.ts, and a runner that finds either a top-level function or a
 * `Solution` method (camelCase or snake_case). Results go back as JSON text and are
 * compared in JS with the same `__matches` the JavaScript harness uses.
 */
export const PY_HARNESS = String.raw`
import json, sys, re, traceback
import math, heapq, bisect, itertools, functools, collections, string, random
from typing import *
from collections import *
from heapq import *
from bisect import *
from functools import *
from itertools import *
from math import inf

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
    def __repr__(self):
        return "ListNode(" + repr(self.val) + ")"

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
    def __repr__(self):
        return "TreeNode(" + repr(self.val) + ")"

_MAX_NODES = 10000

def _list_from(arr):
    if not isinstance(arr, list):
        raise ValueError("A list input must be an array")
    head = None
    for v in reversed(arr):
        head = ListNode(v, head)
    return head

def _list_to(head):
    out, seen, n = [], set(), head
    while n is not None:
        if id(n) in seen:
            raise ValueError("The returned list has a cycle")
        seen.add(id(n))
        if len(out) >= _MAX_NODES:
            raise ValueError("The returned list is too long (or never ends)")
        out.append(n.val)
        n = n.next
    return out

def _dlist_from(arr):
    head = _list_from(arr)
    prev, n = None, head
    while n is not None:
        n.prev = prev
        prev, n = n, n.next
    return head

def _dlist_to(head):
    out, seen, prev, n = [], set(), None, head
    while n is not None:
        if id(n) in seen:
            raise ValueError("The returned list has a cycle")
        seen.add(id(n))
        if len(out) >= _MAX_NODES:
            raise ValueError("The returned list is too long (or never ends)")
        if getattr(n, "prev", None) is not prev:
            raise ValueError("The head's prev pointer must be None" if prev is None else "The prev pointer of the node holding " + repr(n.val) + " is wrong")
        out.append(n.val)
        prev, n = n, n.next
    return out

def _cycle_from(spec):
    head = _list_from(spec["list"])
    pos = spec.get("pos", -1)
    if head is None or pos is None or pos < 0:
        return head
    tail = head
    while tail.next is not None:
        tail = tail.next
    target = head
    for _ in range(pos):
        if target is None:
            break
        target = target.next
    tail.next = target
    return head

def _tree_from(arr):
    if not isinstance(arr, list):
        raise ValueError("A tree input must be an array")
    if len(arr) == 0 or arr[0] is None:
        return None
    root = TreeNode(arr[0])
    queue, i, q = [root], 1, 0
    while q < len(queue) and i < len(arr):
        node = queue[q]
        q += 1
        if i < len(arr) and arr[i] is not None:
            node.left = TreeNode(arr[i])
            queue.append(node.left)
        i += 1
        if i < len(arr) and arr[i] is not None:
            node.right = TreeNode(arr[i])
            queue.append(node.right)
        i += 1
    return root

def _tree_to(root):
    if root is None:
        return []
    out, seen, queue, q = [], set(), [root], 0
    while q < len(queue):
        node = queue[q]
        q += 1
        if node is None:
            out.append(None)
            continue
        if id(node) in seen:
            raise ValueError("The returned tree has a cycle")
        seen.add(id(node))
        if len(seen) > _MAX_NODES:
            raise ValueError("The returned tree is too large (or never ends)")
        out.append(node.val)
        queue.append(node.left)
        queue.append(node.right)
    while out and out[-1] is None:
        out.pop()
    return out

def _build(kind, value):
    if kind == "ListNode":
        return _list_from(value)
    if kind == "DListNode":
        return _dlist_from(value)
    if kind == "TreeNode":
        return _tree_from(value)
    if kind == "cycleList":
        return _cycle_from(value)
    if kind == "ListNode[]":
        return [_list_from(v) for v in value]
    return value

def _find_node(root, val):
    if val is None:
        return None
    stack = [root]
    while stack:
        n = stack.pop()
        if n is None:
            continue
        if n.val == val:
            return n
        stack.extend([n.left, n.right])
    raise ValueError("No node with value " + str(val) + " in the tree")

def _build_args(kinds, raw):
    kind = lambda i: kinds[i] if i < len(kinds) and kinds[i] else "value"
    args = [v if kind(i) == "TreeNodeRef" else _build(kind(i), v) for i, v in enumerate(raw)]
    root = next((args[i] for i in range(len(args)) if kind(i) == "TreeNode"), None)
    return [_find_node(root, a) if kind(i) == "TreeNodeRef" else a for i, a in enumerate(args)]

def _encode(kind, value):
    if kind == "TreeNodeVal":
        return None if value is None else value.val
    if kind == "ListNode":
        return _list_to(value)
    if kind == "DListNode":
        return _dlist_to(value)
    if kind == "TreeNode":
        return _tree_to(value)
    if kind == "ListNode[]":
        return [_list_to(v) for v in value]
    if kind == "TreeNode[]":
        return [_tree_to(v) for v in value]
    return value

def _plain(v):
    if isinstance(v, (list, tuple)):
        return [_plain(x) for x in v]
    if isinstance(v, (set, frozenset)):
        return sorted((_plain(x) for x in v), key=lambda x: json.dumps(x))
    if isinstance(v, dict):
        return {str(k): _plain(x) for k, x in v.items()}
    if isinstance(v, ListNode):
        return _list_to(v)
    if isinstance(v, TreeNode):
        return _tree_to(v)
    return v

def _snake(name):
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()

def _find(ns, name):
    for n in (name, _snake(name)):
        f = ns.get(n)
        if callable(f) and not isinstance(f, type):
            return f
    sol = ns.get("Solution")
    if isinstance(sol, type):
        inst = sol()
        for n in (name, _snake(name)):
            if hasattr(inst, n):
                return getattr(inst, n)
    return None

def _fmt_exc(e, filename):
    if isinstance(e, SyntaxError):
        return "SyntaxError: " + str(e.msg) + (" (line " + str(e.lineno) + ")" if e.lineno else "")
    frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == filename]
    where = " (line " + str(frames[-1].lineno) + ")" if frames else ""
    return type(e).__name__ + ": " + str(e) + where

_BASE = {k: v for k, v in dict(globals()).items() if not k.startswith("__")}

def __prepos_free(code):
    ns = dict(_BASE)
    ns["__name__"] = "__main__"
    try:
        exec(compile(code, "<main>", "exec"), ns)
    except BaseException as e:
        print(_fmt_exc(e, "<main>"), file=sys.stderr)

def __prepos_run(code, payload):
    p = json.loads(payload)
    ns = dict(_BASE)
    ns["__name__"] = "__solution__"
    try:
        exec(compile(code, "<solution>", "exec"), ns)
    except BaseException as e:
        return json.dumps({"crash": _fmt_exc(e, "<solution>")})
    fn = _find(ns, p["functionName"])
    if fn is None:
        return json.dumps({"crash": "No function or Solution method named '" + p["functionName"] + "' was found."})
    kinds = p["argTypes"]
    results = []
    for raw in p["cases"]:
        try:
            args = _build_args(kinds, json.loads(json.dumps(raw)))
            out = fn(*args)
            if p["returns"] == "arg0":
                actual = _encode(kinds[0] if kinds else "value", args[0])
            elif p["returns"] == "arg0Prefix":
                if not isinstance(out, int) or isinstance(out, bool) or out < 0 or out > len(args[0]):
                    raise ValueError("Return the number of elements kept (an integer from 0 to len(nums))")
                actual = [out, list(args[0][:out])]
            else:
                actual = _encode(p["returns"], out)
            results.append({"json": json.dumps(_plain(actual))})
        except Exception as e:
            results.append({"error": _fmt_exc(e, "<solution>")})
    return json.dumps({"results": results})
`;

/**
 * Classic worker that boots Pyodide once from the CDN (cached by the browser after the
 * first load) and then runs free-form code or the test-case harness. The page kills and
 * re-creates it on a timeout, because a busy Python loop can't be interrupted otherwise.
 */
export const PY_WORKER_SOURCE = String.raw`
const send = (m) => postMessage(m);
const INDEX_URL = ${JSON.stringify(PYODIDE_URL)};
const HARNESS = ${JSON.stringify(PY_HARNESS)};
let pyodide = null;
let lines = 0;
const MAX_LINES = 2000;

${WORKER_LIB_SOURCE}

function sink(level) {
  return {
    batched: (text) => {
      lines++;
      if (lines > MAX_LINES) {
        if (lines === MAX_LINES + 1) send({ type: "log", level: "warn", text: "... output truncated after " + MAX_LINES + " lines" });
        return;
      }
      send({ type: "log", level, text: text.length > 20000 ? text.slice(0, 20000) + "..." : text });
    },
  };
}

function tidy(err) {
  const text = String((err && err.message) || err);
  const kept = text.split("\n").filter((l) => l.trim() && !/_pyodide|pyodide\.asm|\/lib\/python/.test(l));
  return kept.slice(-6).join("\n");
}

self.onmessage = async (e) => {
  const msg = e.data;
  if (msg.type === "boot") {
    try {
      importScripts(INDEX_URL + "pyodide.js");
      pyodide = await loadPyodide({ indexURL: INDEX_URL });
      pyodide.runPython(HARNESS);
      send({ type: "ready" });
    } catch (err) {
      send({ type: "boot-error", text: String((err && err.message) || err) });
    }
    return;
  }
  lines = 0;
  pyodide.setStdout(sink("log"));
  pyodide.setStderr(sink("error"));
  if (msg.type === "free") {
    try {
      pyodide.globals.set("__user_code", msg.code);
      pyodide.runPython("__prepos_free(__user_code)");
    } catch (err) {
      send({ type: "log", level: "error", text: tidy(err) });
    }
    send({ type: "done" });
    return;
  }
  const h = msg.harness;
  let raw;
  try {
    pyodide.globals.set("__user_code", msg.code);
    pyodide.globals.set("__payload", JSON.stringify({ functionName: h.functionName, cases: h.cases.map((c) => c.input), argTypes: h.argTypes || [], returns: h.returns || "value" }));
    raw = pyodide.runPython("__prepos_run(__user_code, __payload)");
  } catch (err) {
    send({ type: "log", level: "error", text: tidy(err), crash: true });
    send({ type: "done" });
    return;
  }
  const parsed = JSON.parse(raw);
  if (parsed.crash) {
    send({ type: "log", level: "error", text: parsed.crash, crash: true });
    send({ type: "done" });
    return;
  }
  parsed.results.forEach((r, index) => {
    const c = h.cases[index];
    if (r.error !== undefined) {
      send({ type: "case", index, pass: false, actual: "threw " + r.error, hidden: c.hidden });
      return;
    }
    let actual;
    try { actual = JSON.parse(r.json); } catch { actual = r.json; }
    send({ type: "case", index, pass: __matches(actual, c.expected, h.compare), actual: JSON.stringify(actual) ?? String(actual), hidden: c.hidden });
  });
  send({ type: "done" });
};
`;
