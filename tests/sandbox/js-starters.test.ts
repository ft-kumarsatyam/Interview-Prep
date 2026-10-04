import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { problems } from "@/core/content";
import { JS_STARTERS, jsStarterCode } from "@/modules/dsa/domain/js-starters";
import { WORKER_SOURCE } from "@/core/sandbox/worker-source";

type Message = { type: string; level?: string; text?: string };

/** Runs free-form code in the real Worker script and resolves once it reports "done". */
async function runToDone(code: string): Promise<Message[]> {
  const messages: Message[] = [];
  let done: () => void = () => {};
  const finished = new Promise<void>((r) => (done = r));
  const noop = () => {};
  const sandbox: Record<string, unknown> = {
    postMessage: (m: Message) => {
      messages.push(m);
      if (m.type === "done") done();
    },
    addEventListener: noop,
    console: { log: noop, info: noop, warn: noop, error: noop, debug: noop },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    performance,
    queueMicrotask,
  };
  sandbox.self = sandbox;
  vm.runInContext(WORKER_SOURCE, vm.createContext(sandbox));
  void (sandbox.self as { onmessage: (e: { data: unknown }) => Promise<void> }).onmessage({ data: code });
  await Promise.race([finished, new Promise((r) => setTimeout(r, 2500))]);
  return messages;
}

/** Reference solutions, used only to prove each starter's examples expect the right values. */
const REFERENCE: Record<string, string> = {
  "create-hello-world-function": `var createHelloWorld = () => () => "Hello World";`,
  counter: `var createCounter = (n) => () => n++;`,
  "to-be-or-not-to-be": `var expect = (val) => ({
    toBe: (x) => { if (x !== val) throw new Error("Not Equal"); return true; },
    notToBe: (x) => { if (x === val) throw new Error("Equal"); return true; },
  });`,
  "counter-ii": `var createCounter = (init) => { let c = init; return { increment: () => ++c, decrement: () => --c, reset: () => (c = init) }; };`,
  "apply-transform-over-each-element-in-array": `var map = (arr, fn) => { const out = []; for (let i = 0; i < arr.length; i++) out.push(fn(arr[i], i)); return out; };`,
  "filter-elements-from-array": `var filter = (arr, fn) => { const out = []; for (let i = 0; i < arr.length; i++) if (fn(arr[i], i)) out.push(arr[i]); return out; };`,
  "array-reduce-transformation": `var reduce = (nums, fn, init) => { let acc = init; for (const n of nums) acc = fn(acc, n); return acc; };`,
  "function-composition": `var compose = (fns) => (x) => fns.reduceRight((acc, f) => f(acc), x);`,
  "return-length-of-arguments-passed": `var argumentsLength = (...args) => args.length;`,
  "allow-one-function-call": `var once = (fn) => { let done = false; return (...a) => { if (done) return undefined; done = true; return fn(...a); }; };`,
  memoize: `function memoize(fn) { const c = new Map(); return (...a) => { const k = JSON.stringify(a); if (!c.has(k)) c.set(k, fn(...a)); return c.get(k); }; }`,
  "add-two-promises": `var addTwoPromises = async (a, b) => (await a) + (await b);`,
  sleep: `async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }`,
  "timeout-cancellation": `var cancellable = (fn, args, t) => { const id = setTimeout(() => fn(...args), t); return () => clearTimeout(id); };`,
  "interval-cancellation": `var cancellable = (fn, args, t) => { fn(...args); const id = setInterval(() => fn(...args), t); return () => clearInterval(id); };`,
  "promise-time-limit": `var timeLimit = (fn, t) => (...a) => new Promise((res, rej) => { const id = setTimeout(() => rej("Time Limit Exceeded"), t); fn(...a).then((v) => { clearTimeout(id); res(v); }, (e) => { clearTimeout(id); rej(e); }); });`,
  "cache-with-time-limit": `var TimeLimitedCache = function () { this.m = new Map(); };
    TimeLimitedCache.prototype.set = function (k, v, d) { const live = this.get(k) !== -1; this.m.set(k, { v, exp: Date.now() + d }); return live; };
    TimeLimitedCache.prototype.get = function (k) { const e = this.m.get(k); return e && e.exp > Date.now() ? e.v : -1; };
    TimeLimitedCache.prototype.count = function () { let n = 0; for (const e of this.m.values()) if (e.exp > Date.now()) n++; return n; };`,
  debounce: `var debounce = (fn, t) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), t); }; };`,
  "execute-asynchronous-functions-in-parallel": `var promiseAll = (fns) => new Promise((res, rej) => { const out = []; let n = 0; if (!fns.length) res([]); fns.forEach((f, i) => f().then((v) => { out[i] = v; if (++n === fns.length) res(out); }, rej)); });`,
  "is-object-empty": `var isEmpty = (o) => Object.keys(o).length === 0;`,
  "chunk-array": `var chunk = (arr, size) => { const out = []; for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size)); return out; };`,
  "array-prototype-last": `Array.prototype.last = function () { return this.length ? this[this.length - 1] : -1; };`,
  "group-by": `Array.prototype.groupBy = function (fn) { const o = {}; for (const x of this) (o[fn(x)] ??= []).push(x); return o; };`,
  "sort-by": `var sortBy = (arr, fn) => [...arr].sort((a, b) => fn(a) - fn(b));`,
  "join-two-arrays-by-id": `var join = (a, b) => { const m = new Map(); for (const x of a) m.set(x.id, x); for (const x of b) m.set(x.id, { ...m.get(x.id), ...x }); return [...m.values()].sort((x, y) => x.id - y.id); };`,
  "flatten-deeply-nested-array": `var flat = (arr, n) => n === 0 ? arr : arr.reduce((acc, x) => Array.isArray(x) ? acc.concat(flat(x, n - 1)) : acc.concat([x]), []);`,
  "compact-object": `var compactObject = (o) => { if (Array.isArray(o)) return o.filter(Boolean).map((x) => typeof x === "object" ? compactObject(x) : x); const out = {}; for (const [k, v] of Object.entries(o)) if (v) out[k] = typeof v === "object" ? compactObject(v) : v; return out; };`,
  "event-emitter": `class EventEmitter { m = new Map(); subscribe(e, cb) { const s = this.m.get(e) ?? []; s.push(cb); this.m.set(e, s); return { unsubscribe: () => { s.splice(s.indexOf(cb), 1); } }; } emit(e, args = []) { return (this.m.get(e) ?? []).map((cb) => cb(...args)); } }`,
  "array-wrapper": `var ArrayWrapper = function (nums) { this.nums = nums; };
    ArrayWrapper.prototype.valueOf = function () { return this.nums.reduce((a, b) => a + b, 0); };
    ArrayWrapper.prototype.toString = function () { return "[" + this.nums.join(",") + "]"; };`,
  "calculator-with-method-chaining": `class Calculator { constructor(v) { this.v = v; } add(x) { this.v += x; return this; } subtract(x) { this.v -= x; return this; } multiply(x) { this.v *= x; return this; } divide(x) { if (x === 0) throw new Error("Division by zero is not allowed"); this.v /= x; return this; } power(x) { this.v **= x; return this; } getResult() { return this.v; } }`,
  "memoize-ii": `function memoize(fn) { const root = new Map(); const RES = Symbol(); return (...a) => { let node = root; for (const x of a) { if (!node.has(x)) node.set(x, new Map()); node = node.get(x); } if (!node.has(RES)) node.set(RES, fn(...a)); return node.get(RES); }; }`,
  "check-if-object-instance-of-class": `var checkIfInstanceOf = (obj, C) => { if (obj === null || obj === undefined || typeof C !== "function") return false; let p = Object.getPrototypeOf(obj); while (p) { if (p === C.prototype) return true; p = Object.getPrototypeOf(p); } return false; };`,
  "generate-fibonacci-sequence": `var fibGenerator = function* () { let [a, b] = [0, 1]; for (;;) { yield a; [a, b] = [b, a + b]; } };`,
  "nested-array-generator": `var inorderTraversal = function* (arr) { for (const x of arr) { if (Array.isArray(x)) yield* inorderTraversal(x); else yield x; } };`,
  "design-cancellable-function": `var cancellable = (gen) => { let cancel; const cancelled = new Promise((_, rej) => (cancel = () => rej("Cancelled")));
    const p = (async () => { let next = gen.next(); while (!next.done) { try { const v = await Promise.race([next.value, cancelled]); next = gen.next(v); } catch (e) { next = gen.throw(e); } } return next.value; })();
    cancelled.catch(() => {}); return [cancel, p]; };`,
};

describe("JavaScript track starters", () => {
  it("cover every JS-track sheet problem exactly once", () => {
    const sheet = problems.filter((p) => p.track === "js").map((p) => p.slug).toSorted();
    expect(JS_STARTERS.map((s) => s.slug).toSorted()).toEqual(sheet);
    expect(Object.keys(REFERENCE).toSorted()).toEqual(sheet);
  });

  for (const s of JS_STARTERS) {
    it(`${s.slug}: examples pass with a correct solution`, async () => {
      const msgs = await runToDone(`${REFERENCE[s.slug]}\n${s.examples}`);
      const lines = msgs.filter((m) => m.type === "log").map((m) => `${m.level}: ${m.text}`);
      expect(lines.filter((l) => l.startsWith("error")), lines.join("\n")).toEqual([]);
      expect(lines.at(-1)).toMatch(/^log: \d+ passed, 0 failed$/);
    });

    it(`${s.slug}: the untouched starter runs without a syntax error`, async () => {
      const msgs = await runToDone(jsStarterCode(s));
      expect(msgs.some((m) => m.type === "log" && /SyntaxError/.test(m.text ?? ""))).toBe(false);
      expect(msgs.at(-1)?.type).toBe("done");
    });
  }
});
