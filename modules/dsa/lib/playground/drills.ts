export interface Drill {
  id: string;
  title: string;
  topic: string;
  code: string;
  track?: "javascript" | "dsa" | "dbms" | "sql";
  difficulty?: "easy" | "medium" | "hard";
  expected?: string;
  runnable?: boolean;
  explanation?: string;
  hints?: string[];
  followUp?: string;
}

/** Predict-the-output puzzles. The answer is whatever the runner prints. */
export const DRILLS: Drill[] = [
  {
    id: "event-loop-1",
    title: "Sync, microtask, macrotask",
    topic: "Event loop",
    code: `console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
console.log("D");`,
  },
  {
    id: "event-loop-2",
    title: "async/await ordering",
    topic: "Event loop",
    code: `async function f() {
  console.log(1);
  await null;
  console.log(2);
}
console.log(3);
f();
queueMicrotask(() => console.log(4));
console.log(5);`,
  },
  {
    id: "closure-var",
    title: "var in a loop",
    topic: "Closures",
    code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}`,
  },
  {
    id: "closure-let",
    title: "let in a loop",
    topic: "Closures",
    code: `for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}`,
  },
  {
    id: "this-arrow",
    title: "this: method vs arrow",
    topic: "this",
    code: `const obj = {
  name: "obj",
  regular() { return this?.name; },
  arrow: () => typeof this,
};
const { regular } = obj;
console.log(obj.regular());
console.log(regular());
console.log(obj.arrow());`,
  },
  {
    id: "hoisting",
    title: "Hoisting and TDZ",
    topic: "Scope",
    code: `console.log(typeof a);
var a = 1;
try {
  console.log(b);
  let b = 2;
} catch (e) {
  console.log(e.name);
}
console.log(typeof hoisted);
function hoisted() {}`,
  },
  {
    id: "coercion",
    title: "Coercion corner cases",
    topic: "Types",
    code: `console.log([] + []);
console.log(1 + "2" - 1);
console.log(null == 0, null >= 0);
console.log(NaN === NaN, Object.is(NaN, NaN));
console.log(0.1 + 0.2 === 0.3);`,
  },
  {
    id: "promise-chain",
    title: "Promise chain with throw",
    topic: "Promises",
    code: `Promise.resolve(1)
  .then((x) => { throw new Error("boom " + x); })
  .then(() => console.log("skipped"))
  .catch((e) => { console.log(e.message); return 2; })
  .finally(() => console.log("finally"))
  .then((x) => console.log(x));`,
  },
  {
    id: "event-loop-3",
    title: "Timers, microtasks and a timer queued from a microtask",
    topic: "Event loop",
    code: `setTimeout(() => console.log("t1"), 0);
setTimeout(() => console.log("t2"), 0);
Promise.resolve()
  .then(() => {
    console.log("p1");
    setTimeout(() => console.log("t3"), 0);
  })
  .then(() => console.log("p2"));
queueMicrotask(() => console.log("q"));
console.log("sync");`,
  },
  {
    id: "async-return-await",
    title: "return a() vs return await a()",
    topic: "Promises",
    code: `async function a() { throw new Error("a failed"); }
async function b() {
  try { return a(); } catch { return "caught in b"; }
}
async function c() {
  try { return await a(); } catch { return "caught in c"; }
}
b().then(console.log, (e) => console.log("b rejected:", e.message));
c().then(console.log, (e) => console.log("c rejected:", e.message));`,
  },
  {
    id: "prototype-chain",
    title: "Prototype lookup and shadowing",
    topic: "Prototypes",
    code: `function Animal() {}
Animal.prototype.sound = "generic";
const dog = new Animal();
dog.sound = "woof";
console.log(dog.sound, Object.getPrototypeOf(dog).sound);
delete dog.sound;
console.log(dog.sound);
console.log(dog.hasOwnProperty("sound"), "sound" in dog);`,
  },
  {
    id: "class-fields",
    title: "Class fields vs prototype methods",
    topic: "Classes",
    code: `class A {
  x = 1;
  inc() { return ++this.x; }
  arrow = () => this.x;
}
const a = new A();
const { inc, arrow } = a;
console.log(arrow());
console.log(Object.keys(a));
console.log(Object.getOwnPropertyNames(A.prototype));
try { inc(); } catch (e) { console.log(e.name); }`,
  },
  {
    id: "this-binding",
    title: "call, bind and a detached method",
    topic: "this",
    code: `"use strict";
function who() { return this === undefined ? "undefined" : typeof this + ":" + this.n; }
const o = { n: "o", who };
console.log(who());
console.log(o.who());
console.log(who.call({ n: "called" }));
console.log(who.bind({ n: "b1" }).bind({ n: "b2" })());
console.log((0, o.who)());`,
  },
  {
    id: "generators",
    title: "Generator next(value) plumbing",
    topic: "Generators",
    code: `function* g() {
  const a = yield 1;
  console.log("got", a);
  const b = yield a * 2;
  console.log("got", b);
  return "done";
}
const it = g();
console.log(it.next("ignored"));
console.log(it.next(10));
console.log(it.next(7));
console.log(it.next());`,
  },
  {
    id: "proxy-reflect",
    title: "Proxy get/set traps",
    topic: "Proxy",
    code: `const target = { a: 1 };
const p = new Proxy(target, {
  get(t, k, r) { return k in t ? Reflect.get(t, k, r) : "no_" + String(k); },
  set(t, k, v) { console.log("set", k, v); return Reflect.set(t, k, v); },
});
p.b = 2;
console.log(p.a, p.b, p.c);
console.log(Object.keys(target));`,
  },
  {
    id: "nullish-optional",
    title: "|| vs ?? and logical assignment",
    topic: "Operators",
    code: `const cfg = { retries: 0, name: "", nested: null };
console.log(cfg.retries || 3, cfg.retries ?? 3);
console.log(JSON.stringify(cfg.name || "anon"), JSON.stringify(cfg.name ?? "anon"));
console.log(cfg.nested?.deep, cfg.missing?.[0], cfg.fn?.());
let x = null;
x ??= "set";
let y = 0;
y ||= 5;
let z = 1;
z &&= 9;
console.log(x, y, z);`,
  },
  {
    id: "array-mutators",
    title: "What array methods return",
    topic: "Arrays",
    code: `const a = [3, 1, 2];
const b = a.sort();
console.log(a === b, b);
const c = a.toSorted((x, y) => y - x);
console.log(c, a);
console.log([1, 2, 3].splice(1, 1), [1, 2, 3].slice(1, 2));
console.log([10, 9, 1].sort());
console.log([1, 2, 3].push(4), [1, 2, 3].pop(), [1, 2, 3].shift());`,
  },
  {
    id: "json-stringify",
    title: "What JSON.stringify drops",
    topic: "JSON",
    code: `const o = { a: undefined, b: () => 1, c: Symbol("s"), d: NaN, e: new Date(0), f: [undefined, () => 1], g: true };
console.log(JSON.stringify(o));
console.log(JSON.stringify([undefined]));
console.log(JSON.stringify({ toJSON() { return "custom"; } }));
console.log(JSON.stringify("x"), JSON.stringify(undefined));`,
  },
  {
    id: "map-vs-object",
    title: "Object keys vs Map keys vs Set equality",
    topic: "Collections",
    code: `const o = {};
o[1] = "num";
o["1"] = "str";
o[{}] = "obj1";
o[{ a: 1 }] = "obj2";
console.log(Object.keys(o));
const m = new Map();
m.set(1, "num");
m.set("1", "str");
m.set(NaN, "nan");
console.log(m.size, m.get(NaN), m.get(1), m.get("1"));
console.log(new Set([1, "1", 1, NaN, NaN, {}, {}]).size);`,
  },
  {
    id: "destructuring-defaults",
    title: "Destructuring defaults: undefined vs null",
    topic: "Destructuring",
    code: `function f({ a = 1, b = 2 } = {}, [c = 3, d = 4] = []) {
  return [a, b, c, d];
}
console.log(f());
console.log(f({ a: undefined, b: null }, [0]));
console.log(f({ a: 10 }, [undefined, 5]));`,
  },
  {
    id: "accessors-freeze",
    title: "Accessors, freeze depth and non-enumerable keys",
    topic: "Objects",
    code: `const o = { _v: 1, get v() { return this._v * 2; }, set v(x) { this._v = x; } };
o.v = 5;
console.log(o.v, Object.keys(o));
const f = Object.freeze({ a: 1, inner: { b: 2 } });
f.a = 99;
f.inner.b = 99;
console.log(f.a, f.inner.b, Object.isFrozen(f.inner));
Object.defineProperty(o, "hidden", { value: 1, enumerable: false });
console.log(JSON.stringify(o), o.hidden);`,
  },
  {
    id: "parseint-sort",
    title: "map(parseInt), default sort and string comparison",
    topic: "Types",
    code: `console.log(["10", "9", "1"].map(parseInt));
console.log(parseInt("08"), parseInt("0x1f"), parseInt("12px"), Number("12px"));
console.log([10, 1, 5].sort(), [10, 1, 5].sort((a, b) => a - b));
console.log("b" > "a", "B" > "a", "10" < "9", 10 < "9");
console.log(typeof NaN, typeof null, typeof [], Array.isArray([]));`,
  },
  {
    id: "dsa-two-pointers",
    title: "Two pointers: which pairs survive?",
    topic: "DSA · Two pointers",
    track: "dsa",
    difficulty: "easy",
    code: `const a = [1, 2, 2, 3, 4, 6];
let l = 0, r = a.length - 1, steps = 0;
while (l < r) {
  const sum = a[l] + a[r];
  if (sum === 7) console.log(a[l], a[r]);
  if (sum < 7) l++;
  else r--;
  steps++;
}
console.log("steps", steps);`,
    explanation: "The array is sorted. A sum below the target can only increase by moving the left pointer; a sum above it can only decrease by moving the right pointer.",
    hints: ["Write the first sum and decide which pointer can move safely.", "Track the pointer pair after every iteration.", "The first log happens before the pointer moves for that iteration."],
    followUp: "How would the algorithm change if the array were not sorted?",
  },
  {
    id: "dsa-sliding-window",
    title: "Sliding window: longest unique substring",
    topic: "DSA · Sliding window",
    track: "dsa",
    difficulty: "medium",
    code: `const s = "abca";
const seen = new Set(), out = [];
let left = 0;
for (const ch of s) {
  while (seen.has(ch)) seen.delete(s[left++]);
  seen.add(ch);
  out.push(seen.size);
}
console.log(out);`,
    explanation: "The window always contains unique characters. When a duplicate arrives, remove from the left until the incoming character is unique.",
    hints: ["The set is the current window, not the entire string.", "The duplicate 'a' removes the first 'a' before it is added again.", "Record the size after each character is processed."],
    followUp: "What is the time complexity and why does each character move left at most once?",
  },
  {
    id: "dbms-isolation",
    title: "DBMS: read phenomena under isolation",
    topic: "DBMS · Transactions",
    track: "dbms",
    difficulty: "medium",
    runnable: false,
    code: `-- T1                         -- T2
BEGIN;                       BEGIN;
UPDATE accounts SET balance = balance - 10 WHERE id = 1;
                             SELECT balance FROM accounts WHERE id = 1;
COMMIT;`,
    expected: "T2 may block or read the previous committed balance, depending on the database and isolation level; it must not read T1's uncommitted value under READ COMMITTED.",
    explanation: "Isolation controls visibility of concurrent writes. READ COMMITTED prevents dirty reads but does not by itself prevent non-repeatable reads or phantoms.",
    hints: ["Ask whether T1 has committed when T2 reads.", "Separate dirty reads from stale-but-committed reads.", "The exact behavior depends on the engine's locking/MVCC implementation."],
    followUp: "Compare READ COMMITTED with REPEATABLE READ for this sequence.",
  },
  {
    id: "sql-left-join-count",
    title: "SQL: COUNT with a LEFT JOIN",
    topic: "SQL · Joins",
    track: "sql",
    difficulty: "medium",
    runnable: false,
    code: `customers
id | name
1  | Ada
2  | Lin

orders
id | customer_id
10 | 1

SELECT c.name, COUNT(o.id)
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.name
ORDER BY c.id;`,
    expected: "Ada | 1\nLin | 0",
    explanation: "A LEFT JOIN keeps Lin's customer row. COUNT(o.id) counts only non-null order ids, so the unmatched row produces zero.",
    hints: ["The joined columns for Lin are NULL.", "COUNT(*) would count the preserved customer row.", "Use COUNT(o.id) when counting matched children."],
    followUp: "What result changes if COUNT(*) replaces COUNT(o.id)?",
  },
];
