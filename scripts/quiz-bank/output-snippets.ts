/**
 * Output-prediction questions. The generator runs each snippet in node:vm and
 * records what it prints as the correct option, so the answer key can't be wrong.
 * Distractors are optional: multi-line outputs get line permutations instead.
 */
export interface OutputSnippet {
  ref: string;
  code: string;
  explanation: string;
  distractors?: string[];
  /** Node-only APIs (process.nextTick, setImmediate, Buffer). */
  node?: boolean;
}

export const OUTPUT_SNIPPETS: OutputSnippet[] = [
  {
    ref: "js-basics:1",
    code: `for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i));\n}`,
    distractors: ["0\n1\n2", "undefined\nundefined\nundefined", "0\n0\n0"],
    explanation: "var is function-scoped, so all three callbacks share one i, which is 3 by the time the timers run.",
  },
  {
    ref: "js-basics:1",
    code: `for (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i));\n}`,
    distractors: ["3\n3\n3", "0\n0\n0", "undefined\nundefined\nundefined"],
    explanation: "let creates a fresh binding per loop iteration, so each closure captures its own i.",
  },
  {
    ref: "js-basics:2",
    code: `console.log(typeof null, typeof NaN, typeof []);`,
    distractors: ["null number array", "object NaN object", "null NaN array"],
    explanation: "typeof null is the historic 'object' bug, NaN is a number, and arrays are objects (use Array.isArray).",
  },
  {
    ref: "js-basics:2",
    code: `console.log(NaN === NaN, Object.is(NaN, NaN), Number.isNaN("abc"), isNaN("abc"));`,
    distractors: ["true true false true", "false false true true", "false true true true"],
    explanation: "NaN is never === itself; Object.is treats it as equal. Number.isNaN doesn't coerce, global isNaN does.",
  },
  {
    ref: "js-basics:3",
    code: `console.log(1 + "2", "3" - 1, true + 1, [] + 1);`,
    distractors: ["3 2 2 1", "12 31 true1 1", "12 2 2 NaN"],
    explanation: "+ with a string concatenates; - always converts to numbers; true becomes 1; [] becomes '' so [] + 1 is '1'.",
  },
  {
    ref: "js-basics:3",
    code: `console.log(0 == "", null == undefined, null === undefined, [] == false, null == 0);`,
    distractors: ["false true false false false", "true false false true true", "true true true false false"],
    explanation: "Loose equality coerces: '' and [] become 0 (false is 0). null only loosely equals undefined, never 0.",
  },
  {
    ref: "js-basics:4",
    code: `const a = 0;\nconsole.log(a || 10, a ?? 10, null ?? "x", "" || "y");`,
    distractors: ["0 0 x y", "10 10 x y", "10 0 null y"],
    explanation: "|| falls back on any falsy value; ?? only on null/undefined, so 0 and '' are kept.",
  },
  {
    ref: "js-basics:4",
    code: `const user = { profile: null };\nconsole.log(user.profile?.name, user.settings?.theme ?? "light");`,
    distractors: ["null light", "undefined undefined", "null undefined"],
    explanation: "?. short-circuits to undefined when the left side is null/undefined; ?? then supplies the default.",
  },
  {
    ref: "js-basics:5",
    code: `const arr = ["a", "b"];\narr.extra = "x";\nfor (const k in arr) console.log(k);\nfor (const v of arr) console.log(v);`,
    distractors: ["0\n1\na\nb", "a\nb\nextra\na\nb", "0\n1\nextra\na\nb\nx"],
    explanation: "for...in walks enumerable keys (including the extra property, as strings); for...of walks the iterator's values.",
  },
  {
    ref: "js-basics:6",
    code: `const s = "hello";\ns[0] = "H";\nconsole.log(s, s.at(-1), s.slice(-3), s.padStart(7, "*"));`,
    distractors: ["Hello o llo **hello", "hello h llo **hello", "hello o hel hello**"],
    explanation: "Strings are immutable, so the assignment is ignored. at(-1) and slice(-3) count from the end; padStart pads the front.",
  },
  {
    ref: "js-basics:7",
    code: `console.log([10, 1, 2].sort(), [10, 1, 2].sort((a, b) => a - b));`,
    distractors: ["[ 1, 2, 10 ] [ 1, 2, 10 ]", "[ 10, 2, 1 ] [ 1, 2, 10 ]", "[ 1, 10, 2 ] [ 10, 2, 1 ]"],
    explanation: "Without a comparator, sort compares strings, so '10' < '2'. Pass (a, b) => a - b for numbers.",
  },
  {
    ref: "js-basics:7",
    code: `const a = [1, 2, 3, 4, 5];\nconst removed = a.splice(1, 2);\nconst copy = a.slice(1);\nconsole.log(a, removed, copy);`,
    distractors: ["[ 1, 2, 3, 4, 5 ] [ 2, 3 ] [ 2, 3, 4, 5 ]", "[ 1, 4, 5 ] [ 2 ] [ 4, 5 ]", "[ 1, 2, 5 ] [ 3, 4 ] [ 2, 5 ]"],
    explanation: "splice(start, deleteCount) mutates and returns the removed items; slice copies without mutating.",
  },
  {
    ref: "js-basics:7",
    code: `const nums = [1, 2, 3, 4];\nconst total = nums.filter((n) => n % 2 === 0).map((n) => n * 10).reduce((acc, n) => acc + n, 0);\nconsole.log(total);`,
    distractors: ["100", "40", "20"],
    explanation: "filter keeps 2 and 4, map gives 20 and 40, reduce sums them to 60.",
  },
  {
    ref: "js-basics:8",
    code: `const { x = 5, y = 5, ...rest } = { x: undefined, y: null, z: 1, w: 2 };\nconsole.log(x, y, rest);`,
    distractors: ["5 5 { z: 1, w: 2 }", "undefined null { z: 1, w: 2 }", "5 null [ 1, 2 ]"],
    explanation: "Defaults apply only for undefined, not null. The rest pattern collects the remaining own properties into an object.",
  },
  {
    ref: "js-basics:8",
    code: `const o = { b: 2, a: 1, 1: "one", 0: "zero" };\nconsole.log(Object.keys(o).join(","));`,
    distractors: ["b,a,1,0", "a,b,0,1", "0,1,a,b"],
    explanation: "Integer-like keys come first in ascending order, then string keys in insertion order.",
  },
  {
    ref: "js-basics:9",
    code: `console.log(0.1 + 0.2 === 0.3, Math.trunc(-4.7), Math.floor(-4.7), Math.round(-4.5));`,
    distractors: ["true -4 -5 -5", "false -5 -4 -5", "false -4 -5 -5"],
    explanation: "Floating point makes 0.1 + 0.2 slightly off. trunc drops the fraction, floor goes down, and round(-4.5) rounds towards +∞ to -4.",
  },
  {
    ref: "js-basics:9",
    code: `const max = Number.MAX_SAFE_INTEGER;\nconsole.log(max + 1 === max + 2, typeof 10n, 2n ** 64n > BigInt(max));`,
    distractors: ["false bigint true", "true number true", "false number false"],
    explanation: "Past 2^53 - 1, doubles can't represent every integer, so max + 1 and max + 2 collide. BigInt handles arbitrary precision.",
  },
  {
    ref: "js-functions:0",
    code: `console.log(typeof hoisted, typeof expr);\nfunction hoisted() {}\nvar expr = function () {};`,
    distractors: ["function function", "undefined undefined", "undefined function"],
    explanation: "Function declarations are hoisted with their body; a var holding a function expression is hoisted as undefined.",
  },
  {
    ref: "js-functions:1",
    code: `function a() { b(); console.log("a"); }\nfunction b() { c(); console.log("b"); }\nfunction c() { console.log("c"); }\na();`,
    distractors: ["a\nb\nc", "c\na\nb", "a\nc\nb"],
    explanation: "Each call pushes a frame on the call stack; c finishes first, then control returns to b, then a.",
  },
  {
    ref: "js-functions:2",
    code: `try {\n  console.log(v);\n  let v = 1;\n} catch (e) {\n  console.log(e.name);\n}`,
    distractors: ["undefined", "1", "TypeError"],
    explanation: "let/const are hoisted but stay in the temporal dead zone until their declaration, so reading v throws a ReferenceError.",
  },
  {
    ref: "js-functions:2",
    code: `var x = 1;\nfunction f() {\n  console.log(x);\n  var x = 2;\n}\nf();`,
    distractors: ["1", "2", "ReferenceError"],
    explanation: "The inner var x is hoisted to the top of f (as undefined) and shadows the outer x.",
  },
  {
    ref: "js-functions:3",
    code: `const x = "global";\nfunction outer() {\n  const x = "outer";\n  return function inner() { return x; };\n}\nfunction run(fn) {\n  const x = "run";\n  return fn();\n}\nconsole.log(run(outer()));`,
    distractors: ["global", "run", "undefined"],
    explanation: "Scope is lexical: inner resolves x where it was defined (inside outer), not where it's called.",
  },
  {
    ref: "js-functions:4",
    code: `function makeCounter() {\n  let n = 0;\n  return () => ++n;\n}\nconst a = makeCounter();\nconst b = makeCounter();\na(); a();\nconsole.log(a(), b());`,
    distractors: ["3 3", "1 1", "2 1"],
    explanation: "Each makeCounter call creates its own n; a has been called three times, b once.",
  },
  {
    ref: "js-functions:4",
    code: `function once(fn) {\n  let done = false, result;\n  return (...args) => {\n    if (!done) { done = true; result = fn(...args); }\n    return result;\n  };\n}\nconst init = once((x) => x * 2);\nconsole.log(init(2), init(10));`,
    distractors: ["4 20", "20 20", "4 undefined"],
    explanation: "The closure remembers done and result, so later calls return the first result.",
  },
  {
    ref: "js-functions:5",
    code: `const obj = {\n  name: "obj",\n  regular() { return this === obj; },\n};\nconst f = obj.regular;\nconsole.log(obj.regular(), f());`,
    distractors: ["true true", "false false", "false true"],
    explanation: "this is set by the call site: obj.regular() binds obj, but a detached f() call loses it.",
  },
  {
    ref: "js-functions:5",
    code: `const timer = {\n  secs: 5,\n  arrow() { return [1].map(() => this.secs); },\n  plain() { return [1].map(function () { return this === timer; }); },\n};\nconsole.log(timer.arrow(), timer.plain());`,
    distractors: ["[ undefined ] [ true ]", "[ 5 ] [ true ]", "[ undefined ] [ false ]"],
    explanation: "Arrow functions inherit this from the enclosing method; a plain callback gets its own this (not timer).",
  },
  {
    ref: "js-functions:5",
    code: `function P(n) {\n  this.n = n;\n  return { n: "plain" };\n}\nfunction Q(n) {\n  this.n = n;\n  return 42;\n}\nconsole.log(new P(1).n, new Q(2).n);`,
    distractors: ["1 2", "plain 42", "1 42"],
    explanation: "A constructor that returns an object replaces this; returning a primitive is ignored.",
  },
  {
    ref: "js-functions:6",
    code: `function show() { return this.v; }\nconst bound = show.bind({ v: 1 });\nconsole.log(bound.call({ v: 2 }), bound.bind({ v: 3 })(), show.apply({ v: 4 }));`,
    distractors: ["2 3 4", "1 3 4", "2 1 4"],
    explanation: "A bound function's this is fixed forever: call and a second bind can't override it. apply sets this on the unbound function.",
  },
  {
    ref: "js-functions:7",
    code: `const add = (a) => (b) => (c) => a + b + c;\nconst add5 = add(2)(3);\nconsole.log(add5(10), typeof add(1));`,
    distractors: ["15 number", "NaN function", "10 function"],
    explanation: "Each call returns the next function until all three arguments arrive.",
  },
  {
    ref: "js-functions:7",
    code: `const compose = (...fns) => (x) => fns.reduceRight((acc, f) => f(acc), x);\nconst pipe = (...fns) => (x) => fns.reduce((acc, f) => f(acc), x);\nconst inc = (x) => x + 1, tenX = (x) => x * 10;\nconsole.log(compose(inc, tenX)(2), pipe(inc, tenX)(2));`,
    distractors: ["30 21", "21 21", "30 30"],
    explanation: "compose applies right to left (tenX then inc = 21); pipe applies left to right (inc then tenX = 30).",
  },
  {
    ref: "js-functions:8",
    code: `var counter = (function () {\n  let c = 0;\n  return { inc: () => ++c, get: () => c };\n})();\ncounter.inc(); counter.inc();\nconsole.log(counter.get(), typeof c);`,
    distractors: ["2 number", "0 undefined", "1 undefined"],
    explanation: "The IIFE's c is private to the closure; only inc/get can reach it.",
  },
  {
    ref: "js-objects:4",
    code: `const a = Object.freeze({ list: [1] });\na.list.push(2);\na.x = 1;\nconsole.log(a.list.length, a.x);`,
    distractors: ["1 undefined", "2 1", "1 1"],
    explanation: "freeze is shallow: the nested array can still change, but new properties on a are silently ignored (non-strict).",
  },
  {
    ref: "js-objects:4",
    code: `const s = Object.seal({ a: 1 });\ns.a = 2;\ns.b = 3;\ndelete s.a;\nconsole.log(s.a, s.b, Object.isSealed(s));`,
    distractors: ["1 undefined true", "2 3 true", "undefined undefined false"],
    explanation: "seal allows changing existing values but blocks adding and deleting properties.",
  },
  {
    ref: "js-objects:0",
    code: `function Dog() {}\nDog.prototype.speak = function () { return "woof"; };\nconst d = new Dog();\nconsole.log(d.speak(), Object.getPrototypeOf(d) === Dog.prototype, Object.hasOwn(d, "speak"));`,
    distractors: ["woof false false", "woof true true", "undefined true false"],
    explanation: "speak lives on Dog.prototype, which is d's [[Prototype]]; it's found through the chain, not as an own property.",
  },
  {
    ref: "js-objects:1",
    code: `const base = { greet() { return "hi " + this.name; } };\nconst u = Object.create(base);\nu.name = "sam";\nconsole.log(u.greet(), Object.keys(u));`,
    distractors: ["hi undefined [ 'name' ]", "hi sam [ 'name', 'greet' ]", "hi sam []"],
    explanation: "Object.create sets base as u's prototype; greet is inherited (not an own key) and this is u.",
  },
  {
    ref: "js-objects:2",
    code: `class A {\n  constructor() { this.who = "A"; }\n  hello() { return "A.hello"; }\n}\nclass B extends A {\n  hello() { return super.hello() + "+B"; }\n}\nconst b = new B();\nconsole.log(b.who, b.hello(), typeof B, b instanceof A);`,
    distractors: ["undefined A.hello+B function true", "A A.hello+B class true", "A B function false"],
    explanation: "B inherits A's constructor, super.hello() calls the parent method, and classes are functions under the hood.",
  },
  {
    ref: "js-objects:3",
    code: `class C {\n  #secret = 1;\n  static count = 0;\n  constructor() { C.count++; }\n  get secret() { return this.#secret; }\n}\nnew C();\nconst c = new C();\nconsole.log(C.count, c.secret, c.count);`,
    distractors: ["1 1 undefined", "2 undefined 2", "2 1 2"],
    explanation: "Static fields live on the class, not instances. The getter exposes the private #secret.",
  },
  {
    ref: "js-objects:5",
    code: `const o = { a: 1, b: { c: 2 } };\nconst copy = { ...o };\ncopy.a = 9;\ncopy.b.c = 9;\nconsole.log(o.a, o.b.c);`,
    distractors: ["1 2", "9 9", "9 2"],
    explanation: "Spread makes a shallow copy: top-level a is independent, but b still points to the same nested object.",
  },
  {
    ref: "js-objects:5",
    code: `const orig = { d: new Date(0), f: () => 1, u: undefined };\nconst viaJson = JSON.parse(JSON.stringify(orig));\nconsole.log(typeof viaJson.d, "f" in viaJson, "u" in viaJson);`,
    distractors: ["object false false", "string true true", "object true false"],
    explanation: "JSON round-trips turn Dates into strings and drop functions and undefined. structuredClone keeps Dates.",
  },
  {
    ref: "js-objects:6",
    code: `const a = { x: 1 }, b = { x: 1 }, c = a;\nconsole.log(a == b, a === c, JSON.stringify(a) === JSON.stringify(b));`,
    distractors: ["true true true", "false false true", "false true false"],
    explanation: "Objects compare by reference. Two separate literals are never equal, even with the same contents.",
  },
  {
    ref: "js-objects:7",
    code: `const o = {};\no[1] = "num";\no["1"] = "str";\nconst m = new Map();\nm.set(1, "num");\nm.set("1", "str");\nconsole.log(Object.keys(o).length, m.size);`,
    distractors: ["2 2", "1 1", "2 1"],
    explanation: "Object keys are converted to strings, so 1 and '1' collide. Map keeps keys of any type distinct.",
  },
  {
    ref: "js-async:0",
    code: `function getUser(id, cb) { setTimeout(() => cb(null, { id }), 0); }\nconsole.log("before");\ngetUser(7, (err, user) => console.log("user", user.id));\nconsole.log("after");`,
    distractors: ["before\nuser 7\nafter", "user 7\nbefore\nafter", "before\nafter"],
    explanation: "The callback runs later from the timer queue, after the synchronous code finishes.",
  },
  {
    ref: "js-async:1",
    code: `Promise.resolve(1)\n  .then((v) => { throw new Error("boom " + v); })\n  .then(() => console.log("skipped"))\n  .catch((e) => { console.log(e.message); return 2; })\n  .then((v) => console.log("after", v));`,
    distractors: ["skipped\nboom 1\nafter 2", "boom 1", "boom 1\nafter undefined"],
    explanation: "A throw rejects the chain, skipping .then handlers until .catch. Returning from catch resumes with that value.",
  },
  {
    ref: "js-async:1",
    code: `const p = new Promise((resolve, reject) => {\n  resolve("first");\n  reject(new Error("ignored"));\n  resolve("second");\n});\np.then((v) => console.log(v), (e) => console.log("err", e.message));`,
    distractors: ["second", "err ignored", "first\nsecond"],
    explanation: "A promise settles once. Later resolve/reject calls are ignored.",
  },
  {
    ref: "js-async:2",
    code: `Promise.all([1, Promise.resolve(2), Promise.reject(new Error("no"))])\n  .then((v) => console.log(v))\n  .catch((e) => console.log("caught", e.message));`,
    distractors: ["[ 1, 2, undefined ]", "[ 1, 2 ]", "caught no\n[ 1, 2 ]"],
    explanation: "Promise.all rejects as soon as any input rejects. Use allSettled to get every outcome.",
  },
  {
    ref: "js-async:2",
    code: `const wait = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));\nPromise.race([wait(30, "slow"), wait(5, "fast")]).then((v) => console.log("race", v));\nPromise.allSettled([wait(1, "ok"), Promise.reject(new Error("x"))]).then((r) => console.log(r.map((s) => s.status).join(",")));`,
    distractors: ["race slow\nfulfilled,rejected", "race fast\nfulfilled,fulfilled", "fulfilled,rejected"],
    explanation: "allSettled finishes after ~1 ms and reports each status; race settles with the first input to settle (fast, at 5 ms).",
  },
  {
    ref: "js-async:3",
    code: `async function f() {\n  try {\n    await Promise.reject(new Error("bad"));\n  } catch (e) {\n    return "handled " + e.message;\n  } finally {\n    console.log("finally");\n  }\n}\nf().then(console.log);`,
    distractors: ["handled bad\nfinally", "handled bad", "finally"],
    explanation: "await turns a rejection into a throw that try/catch handles; finally runs before the function's promise resolves.",
  },
  {
    ref: "js-async:3",
    code: `async function g() { return 1; }\nconst r = g();\nconsole.log(r instanceof Promise, typeof r.then);\nr.then((v) => console.log("value", v));`,
    distractors: ["false undefined\nvalue 1", "true function\n1", "false function\nvalue 1"],
    explanation: "An async function always returns a promise, even when you return a plain value.",
  },
  {
    ref: "js-async:4",
    code: `console.log("A");\nsetTimeout(() => console.log("B"), 0);\nPromise.resolve().then(() => console.log("C"));\nconsole.log("D");`,
    explanation: "Synchronous code first (A, D), then microtasks (C), then the timer macrotask (B).",
  },
  {
    ref: "js-async:4",
    code: `setTimeout(() => console.log("t1"), 0);\nPromise.resolve().then(() => {\n  console.log("p1");\n  setTimeout(() => console.log("t2"), 0);\n  Promise.resolve().then(() => console.log("p2"));\n});\nconsole.log("sync");`,
    explanation: "The microtask queue drains fully (p1, then the newly queued p2) before any timer runs; t1 was queued before t2.",
  },
  {
    ref: "js-async:6",
    code: `async function a1() {\n  console.log("a1 start");\n  await a2();\n  console.log("a1 end");\n}\nasync function a2() { console.log("a2"); }\nconsole.log("script start");\na1();\nPromise.resolve().then(() => console.log("then"));\nconsole.log("script end");`,
    explanation: "An async function runs synchronously until its first await; the rest resumes as a microtask, queued before the later .then.",
  },
  {
    ref: "js-async:6",
    code: `const p = new Promise((resolve) => {\n  console.log(1);\n  resolve(2);\n  console.log(3);\n});\np.then((v) => console.log(v));\nconsole.log(4);`,
    explanation: "The executor runs synchronously (1, 3); resolve doesn't stop it. The .then callback is a microtask after 4.",
  },
  {
    ref: "js-async:6",
    code: `console.log("start");\nsetTimeout(() => console.log("timeout"), 0);\n(async () => {\n  console.log("iife");\n  await null;\n  console.log("after await");\n})();\nconsole.log("end");`,
    explanation: "Even await null yields: the continuation is a microtask, which beats the timeout.",
  },
  {
    ref: "js-async:5",
    node: true,
    code: `setImmediate(() => console.log("immediate"));\nprocess.nextTick(() => console.log("nextTick"));\nPromise.resolve().then(() => console.log("promise"));\nqueueMicrotask(() => console.log("microtask"));\nconsole.log("sync");`,
    explanation: "In Node: sync code, then the nextTick queue, then promise microtasks in order, then the check phase (setImmediate).",
  },
  {
    ref: "js-async:7",
    code: `function debounce(fn, ms) {\n  let t;\n  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };\n}\nconst log = debounce((x) => console.log("fired", x), 10);\nlog(1); log(2);\nsetTimeout(() => log(3), 30);`,
    distractors: ["fired 1\nfired 2\nfired 3", "fired 3", "fired 1\nfired 3"],
    explanation: "Debounce resets the timer on each call, so only the last call in a burst fires (2), then the later call (3).",
  },
  {
    ref: "js-async:8",
    code: `const c = new AbortController();\nc.signal.addEventListener("abort", () => console.log("aborted:", c.signal.reason));\nconsole.log(c.signal.aborted);\nc.abort("timeout");\nconsole.log(c.signal.aborted);`,
    distractors: ["false\ntrue\naborted: timeout", "false\ntrue", "true\naborted: timeout\ntrue"],
    explanation: "abort() fires the 'abort' event synchronously, then signal.aborted stays true with the given reason.",
  },
  {
    ref: "js-advanced:0",
    code: `const range = {\n  from: 1, to: 3,\n  *[Symbol.iterator]() { for (let i = this.from; i <= this.to; i++) yield i; },\n};\nconsole.log([...range], Math.max(...range));`,
    distractors: ["[ 1, 3 ] 3", "[ 1, 2, 3 ] NaN", "[] -Infinity"],
    explanation: "Defining Symbol.iterator makes the object iterable, so spread and for...of work on it.",
  },
  {
    ref: "js-advanced:1",
    code: `function* g() {\n  const x = yield 1;\n  console.log("got", x);\n  yield x * 2;\n}\nconst it = g();\nconsole.log(it.next().value);\nconsole.log(it.next(5).value);\nconsole.log(it.next().done);`,
    distractors: ["1\ngot undefined\nNaN\ntrue", "1\n10\ngot 5\ntrue", "1\ngot 5\n10\nfalse"],
    explanation: "The value passed to next(5) becomes the result of the paused yield expression.",
  },
  {
    ref: "js-advanced:3",
    code: `class NotFound extends Error {\n  constructor(msg, opts) { super(msg, opts); this.name = "NotFound"; }\n}\nconst e = new NotFound("user 7", { cause: "db miss" });\nconsole.log(e.name, e instanceof Error, e.cause, String(e));`,
    distractors: ["Error true db miss Error: user 7", "NotFound false db miss NotFound: user 7", "NotFound true undefined NotFound: user 7"],
    explanation: "Custom errors extend Error; set name for nice output, and pass { cause } to keep the original reason.",
  },
  {
    ref: "js-advanced:4",
    code: `const target = { a: 1 };\nconst p = new Proxy(target, {\n  get: (t, k) => (k in t ? t[k] : "default:" + String(k)),\n});\np.b = 2;\nconsole.log(p.a, p.b, p.c, target.b);`,
    distractors: ["1 undefined default:c undefined", "1 2 undefined 2", "1 2 default:c undefined"],
    explanation: "Without a set trap, writes go straight to the target. The get trap supplies defaults for missing keys.",
  },
  {
    ref: "js-advanced:6",
    code: `class Emitter {\n  #h = {};\n  on(e, f) {\n    (this.#h[e] ??= []).push(f);\n    return () => (this.#h[e] = this.#h[e].filter((x) => x !== f));\n  }\n  emit(e, ...a) { (this.#h[e] ?? []).forEach((f) => f(...a)); }\n}\nconst em = new Emitter();\nconst off = em.on("x", (v) => console.log("one", v));\nem.on("x", (v) => console.log("two", v));\nem.emit("x", 1);\noff();\nem.emit("x", 2);`,
    distractors: ["one 1\ntwo 1\none 2\ntwo 2", "one 1\ntwo 1", "two 1\none 1\ntwo 2"],
    explanation: "Listeners run in registration order; the unsubscribe function removes only the first listener.",
  },
  {
    ref: "js-advanced:7",
    code: `const nested = [[1, [2]], 3];\nconsole.log(nested.flat(), nested.flat(Infinity));`,
    distractors: ["[ 1, 2, 3 ] [ 1, 2, 3 ]", "[ [ 1, [ 2 ] ], 3 ] [ 1, 2, 3 ]", "[ 1, [ 2 ], 3 ] [ 1, [ 2 ], 3 ]"],
    explanation: "flat() defaults to depth 1; flat(Infinity) flattens everything.",
  },
  {
    ref: "js-advanced:7",
    code: `try {\n  [].reduce((a, b) => a + b);\n} catch (e) {\n  console.log(e.name);\n}\nconsole.log([].reduce((a, b) => a + b, 0));`,
    distractors: ["0\n0", "undefined\n0", "TypeError\nundefined"],
    explanation: "reduce on an empty array with no initial value throws a TypeError; always pass an initial value.",
  },
  {
    ref: "js-advanced:9",
    code: `console.log(["1", "2", "3"].map(parseInt));`,
    distractors: ["[ 1, 2, 3 ]", "[ 1, NaN, 3 ]", "[ NaN, NaN, NaN ]"],
    explanation: "map passes (value, index), so parseInt('2', 1) and parseInt('3', 2) are NaN. Use map(Number).",
  },
  {
    ref: "js-advanced:9",
    code: `console.log(typeof typeof 1, [] instanceof Object, "b" + "a" + +"a" + "a");`,
    distractors: ["number true baNaNa", "string false baaa", "string true banana"],
    explanation: "typeof always returns a string; arrays are objects; unary + on 'a' is NaN, which concatenates as 'NaN'.",
  },
  {
    ref: "node-internals:4",
    node: true,
    code: `const b = Buffer.from("héllo");\nconsole.log(b.length, "héllo".length, b.toString("hex").length);`,
    distractors: ["5 5 10", "6 6 12", "10 5 20"],
    explanation: "Buffers count bytes: é is 2 bytes in UTF-8, so 6 bytes for 5 characters (12 hex digits).",
  },
  {
    ref: "node-internals:1",
    node: true,
    code: `Promise.resolve().then(() => console.log("promise"));\nprocess.nextTick(() => console.log("tick 1"));\nsetImmediate(() => {\n  console.log("immediate");\n  process.nextTick(() => console.log("tick 2"));\n});`,
    explanation: "After the main script, Node drains nextTicks, then promises. In the check phase, nextTicks queued by a callback run right after it.",
  },
];
