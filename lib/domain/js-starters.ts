/**
 * Starters for the JavaScript track (LeetCode's 30 Days of JS). These problems return functions,
 * classes, promises and generators, which a value-in/value-out test harness can't judge, so each
 * starter is LeetCode's template plus its examples written as `test(...)` blocks that the free-form
 * runner executes. Async examples use short timers to stay well inside the 3 s sandbox limit.
 */

export interface JsStarter {
  slug: string;
  /** LeetCode's function template, body left for the learner. */
  stub: string;
  /** The problem's examples as runnable tests. */
  examples: string;
}

const STUBS: Array<[slug: string, stub: string, examples: string]> = [
  [
    "create-hello-world-function",
    `/**
 * @return {Function}
 */
var createHelloWorld = function () {
  return function (...args) {
    // your code
  };
};`,
    `test("always returns Hello World", () => {
  const f = createHelloWorld();
  assertEqual(f(), "Hello World");
  assertEqual(f({}, null, 42), "Hello World");
});`,
  ],
  [
    "counter",
    `/**
 * @param {number} n
 * @return {Function} counter
 */
var createCounter = function (n) {
  return function () {
    // your code
  };
};`,
    `test("n = 10", () => {
  const counter = createCounter(10);
  assertEqual([counter(), counter(), counter()], [10, 11, 12]);
});
test("n = -2", () => {
  const counter = createCounter(-2);
  assertEqual([counter(), counter(), counter(), counter(), counter()], [-2, -1, 0, 1, 2]);
});`,
  ],
  [
    "to-be-or-not-to-be",
    `/**
 * @param {any} val
 * @return {Object}
 */
var expect = function (val) {
  // return { toBe, notToBe }
};`,
    `const thrown = (fn) => { try { fn(); } catch (e) { return e instanceof Error ? e.message : e; } };
test("toBe", () => {
  assertEqual(expect(5).toBe(5), true);
  assertEqual(thrown(() => expect(5).toBe(null)), "Not Equal");
});
test("notToBe", () => {
  assertEqual(expect(5).notToBe(null), true);
  assertEqual(thrown(() => expect(5).notToBe(5)), "Equal");
});`,
  ],
  [
    "counter-ii",
    `/**
 * @param {integer} init
 * @return { increment: Function, decrement: Function, reset: Function }
 */
var createCounter = function (init) {
  // your code
};`,
    `test("init = 5", () => {
  const counter = createCounter(5);
  assertEqual([counter.increment(), counter.reset(), counter.decrement()], [6, 5, 4]);
});
test("init = 0", () => {
  const counter = createCounter(0);
  assertEqual([counter.increment(), counter.increment(), counter.decrement(), counter.reset(), counter.reset()], [1, 2, 1, 0, 0]);
});`,
  ],
  [
    "apply-transform-over-each-element-in-array",
    `/**
 * Don't use Array.prototype.map.
 * @param {number[]} arr
 * @param {Function} fn
 * @return {number[]}
 */
var map = function (arr, fn) {
  // your code
};`,
    `test("plus one", () => assertEqual(map([1, 2, 3], (n) => n + 1), [2, 3, 4]));
test("uses the index", () => assertEqual(map([1, 2, 3], (n, i) => n + i), [1, 3, 5]));
test("constant", () => assertEqual(map([10, 20, 30], () => 42), [42, 42, 42]));`,
  ],
  [
    "filter-elements-from-array",
    `/**
 * Don't use Array.prototype.filter.
 * @param {number[]} arr
 * @param {Function} fn
 * @return {number[]}
 */
var filter = function (arr, fn) {
  // your code
};`,
    `test("greater than 10", () => assertEqual(filter([0, 10, 20, 30], (n) => n > 10), [20, 30]));
test("first index", () => assertEqual(filter([1, 2, 3], (n, i) => i === 0), [1]));
test("truthy result", () => assertEqual(filter([-2, -1, 0, 1, 2], (n) => n + 1), [-2, 0, 1, 2]));`,
  ],
  [
    "array-reduce-transformation",
    `/**
 * Don't use Array.prototype.reduce.
 * @param {number[]} nums
 * @param {Function} fn
 * @param {number} init
 * @return {number}
 */
var reduce = function (nums, fn, init) {
  // your code
};`,
    `test("sum", () => assertEqual(reduce([1, 2, 3, 4], (acc, n) => acc + n, 0), 10));
test("sum of squares from 100", () => assertEqual(reduce([1, 2, 3, 4], (acc, n) => acc + n * n, 100), 130));
test("empty array returns init", () => assertEqual(reduce([], () => 0, 25), 25));`,
  ],
  [
    "function-composition",
    `/**
 * @param {Function[]} functions
 * @return {Function}
 */
var compose = function (functions) {
  return function (x) {
    // your code
  };
};`,
    `test("right to left", () => assertEqual(compose([(x) => x + 1, (x) => x * x, (x) => 2 * x])(4), 65));
test("times ten, three times", () => assertEqual(compose([(x) => 10 * x, (x) => 10 * x, (x) => 10 * x])(1), 1000));
test("no functions is identity", () => assertEqual(compose([])(42), 42));`,
  ],
  [
    "return-length-of-arguments-passed",
    `/**
 * @param {...(null|boolean|number|string|Array|Object)} args
 * @return {number}
 */
var argumentsLength = function (...args) {
  // your code
};`,
    `test("one argument", () => assertEqual(argumentsLength(5), 1));
test("three arguments", () => assertEqual(argumentsLength({}, null, "3"), 3));
test("none", () => assertEqual(argumentsLength(), 0));`,
  ],
  [
    "allow-one-function-call",
    `/**
 * @param {Function} fn
 * @return {Function}
 */
var once = function (fn) {
  return function (...args) {
    // your code
  };
};`,
    `test("only the first call runs", () => {
  let calls = 0;
  const onceFn = once((a, b, c) => { calls++; return a + b + c; });
  assertEqual(onceFn(1, 2, 3), 6);
  assertEqual(onceFn(2, 3, 6), undefined);
  assertEqual(calls, 1);
});`,
  ],
  [
    "memoize",
    `/**
 * @param {Function} fn
 * @return {Function}
 */
function memoize(fn) {
  return function (...args) {
    // your code
  };
}`,
    `test("caches by arguments", () => {
  let calls = 0;
  const sum = memoize((a, b) => { calls++; return a + b; });
  assertEqual(sum(2, 2), 4);
  assertEqual(sum(2, 2), 4);
  assertEqual(calls, 1);
  assertEqual(sum(1, 2), 3);
  assertEqual(calls, 2);
});
test("(2, 3) and (3, 2) are different calls", () => {
  let calls = 0;
  const sum = memoize((a, b) => { calls++; return a + b; });
  sum(2, 3); sum(3, 2);
  assertEqual(calls, 2);
});`,
  ],
  [
    "add-two-promises",
    `/**
 * @param {Promise} promise1
 * @param {Promise} promise2
 * @return {Promise}
 */
var addTwoPromises = async function (promise1, promise2) {
  // your code
};`,
    `const later = (value, ms) => new Promise((resolve) => setTimeout(() => resolve(value), ms));
test("resolved values", async () => assertEqual(await addTwoPromises(Promise.resolve(2), Promise.resolve(2)), 4));
test("waits for both", async () => assertEqual(await addTwoPromises(later(10, 50), later(-12, 30)), -2));`,
  ],
  [
    "sleep",
    `/**
 * @param {number} millis
 * @return {Promise}
 */
async function sleep(millis) {
  // your code
}`,
    `test("waits about 100 ms", async () => {
  const start = Date.now();
  await sleep(100);
  assertEqual(Date.now() - start >= 90, true, "elapsed >= 100 ms");
});`,
  ],
  [
    "timeout-cancellation",
    `/**
 * @param {Function} fn
 * @param {Array} args
 * @param {number} t
 * @return {Function}
 */
var cancellable = function (fn, args, t) {
  // your code
};`,
    `const run = (fn, args, t, cancelAt) => new Promise((resolve) => {
  const out = [];
  const cancel = cancellable((...a) => out.push(fn(...a)), args, t);
  setTimeout(() => { try { cancel(); } finally { resolve(out); } }, cancelAt);
});
test("runs when not cancelled in time", async () => assertEqual(await run((x) => x * 5, [2], 20, 80), [10]));
test("cancelled before it fires", async () => assertEqual(await run((x) => x ** 2, [2], 100, 30), []));`,
  ],
  [
    "interval-cancellation",
    `/**
 * @param {Function} fn
 * @param {Array} args
 * @param {number} t
 * @return {Function}
 */
var cancellable = function (fn, args, t) {
  // your code
};`,
    `test("calls now, then every t ms until cancelled", async () => {
  const out = [];
  const cancel = cancellable((x) => out.push(x * 2), [4], 50);
  await new Promise((resolve) => setTimeout(resolve, 175));
  cancel();
  assertEqual(out, [8, 8, 8, 8], "calls at 0, 50, 100, 150 ms");
});`,
  ],
  [
    "promise-time-limit",
    `/**
 * @param {Function} fn
 * @param {number} t
 * @return {Function}
 */
var timeLimit = function (fn, t) {
  return async function (...args) {
    // your code
  };
};`,
    `const slowSquare = async (n) => { await new Promise((r) => setTimeout(r, 100)); return n * n; };
test("too slow rejects", async () => assertEqual(await timeLimit(slowSquare, 50)(5).catch((e) => e), "Time Limit Exceeded"));
test("fast enough resolves", async () => assertEqual(await timeLimit(slowSquare, 150)(5), 25));`,
  ],
  [
    "cache-with-time-limit",
    `var TimeLimitedCache = function () {
  // your code
};

/**
 * @param {number} key
 * @param {number} value
 * @param {number} duration time until expiration in ms
 * @return {boolean} if an un-expired key already existed
 */
TimeLimitedCache.prototype.set = function (key, value, duration) {};

/**
 * @param {number} key
 * @return {number} value associated with key, or -1
 */
TimeLimitedCache.prototype.get = function (key) {};

/**
 * @return {number} count of non-expired keys
 */
TimeLimitedCache.prototype.count = function () {};`,
    `test("keys expire", async () => {
  const cache = new TimeLimitedCache();
  assertEqual(cache.set(1, 42, 100), false);
  assertEqual(cache.get(1), 42);
  assertEqual(cache.count(), 1);
  assertEqual(cache.set(1, 50, 100), true, "overwriting a live key");
  await new Promise((r) => setTimeout(r, 150));
  assertEqual(cache.get(1), -1);
  assertEqual(cache.count(), 0);
});`,
  ],
  [
    "debounce",
    `/**
 * @param {Function} fn
 * @param {number} t milliseconds
 * @return {Function}
 */
var debounce = function (fn, t) {
  return function (...args) {
    // your code
  };
};`,
    `const wait = (ms) => new Promise((r) => setTimeout(r, ms));
test("a quick second call cancels the first", async () => {
  const calls = [];
  const log = debounce((x) => calls.push(x), 50);
  log(1);
  setTimeout(() => log(2), 30);
  await wait(150);
  assertEqual(calls, [2]);
});
test("calls far apart both run", async () => {
  const calls = [];
  const log = debounce((x) => calls.push(x), 30);
  log(1);
  await wait(80);
  log(2);
  await wait(80);
  assertEqual(calls, [1, 2]);
});`,
  ],
  [
    "execute-asynchronous-functions-in-parallel",
    `/**
 * Don't use Promise.all.
 * @param {Array<Function>} functions
 * @return {Promise<any>}
 */
var promiseAll = function (functions) {
  // your code
};`,
    `const later = (value, ms) => () => new Promise((resolve) => setTimeout(() => resolve(value), ms));
test("keeps input order", async () => assertEqual(await promiseAll([later(1, 60), later(2, 10), later(3, 30)]), [1, 2, 3]));
test("rejects with the first error", async () => assertEqual(await promiseAll([later(1, 20), () => Promise.reject("Error")]).catch((e) => e), "Error"));`,
  ],
  [
    "is-object-empty",
    `/**
 * @param {Object|Array} obj
 * @return {boolean}
 */
var isEmpty = function (obj) {
  // your code
};`,
    `test("objects", () => { assertEqual(isEmpty({}), true); assertEqual(isEmpty({ x: 5, y: 42 }), false); });
test("arrays", () => { assertEqual(isEmpty([]), true); assertEqual(isEmpty([null, false, 0]), false); });`,
  ],
  [
    "chunk-array",
    `/**
 * Don't use lodash's _.chunk.
 * @param {Array} arr
 * @param {number} size
 * @return {Array}
 */
var chunk = function (arr, size) {
  // your code
};`,
    `test("size 1", () => assertEqual(chunk([1, 2, 3, 4, 5], 1), [[1], [2], [3], [4], [5]]));
test("last chunk is shorter", () => assertEqual(chunk([1, 9, 6, 3, 2], 3), [[1, 9, 6], [3, 2]]));
test("size larger than the array", () => assertEqual(chunk([8, 5, 3, 2, 6], 6), [[8, 5, 3, 2, 6]]));
test("empty", () => assertEqual(chunk([], 1), []));`,
  ],
  [
    "array-prototype-last",
    `/**
 * @return {null|boolean|number|string|Array|Object}
 */
Array.prototype.last = function () {
  // your code
};`,
    `test("last element", () => assertEqual([null, {}, 3].last(), 3));
test("empty array gives -1", () => assertEqual([].last(), -1));`,
  ],
  [
    "group-by",
    `/**
 * @param {Function} fn
 * @return {Object}
 */
Array.prototype.groupBy = function (fn) {
  // your code
};`,
    `test("by id", () => assertEqual([{ id: "1" }, { id: "1" }, { id: "2" }].groupBy((item) => item.id), { 1: [{ id: "1" }, { id: "1" }], 2: [{ id: "2" }] }));
test("by first element", () => assertEqual([[1, 2, 3], [1, 3, 5], [1, 5, 9]].groupBy((list) => String(list[0])), { 1: [[1, 2, 3], [1, 3, 5], [1, 5, 9]] }));
test("by threshold", () => assertEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].groupBy((n) => String(n > 5)), { true: [6, 7, 8, 9, 10], false: [1, 2, 3, 4, 5] }));`,
  ],
  [
    "sort-by",
    `/**
 * @param {Array} arr
 * @param {Function} fn
 * @return {Array}
 */
var sortBy = function (arr, fn) {
  // your code
};`,
    `test("numbers", () => assertEqual(sortBy([5, 4, 1, 2, 3], (x) => x), [1, 2, 3, 4, 5]));
test("objects", () => assertEqual(sortBy([{ x: 1 }, { x: 0 }, { x: -1 }], (d) => d.x), [{ x: -1 }, { x: 0 }, { x: 1 }]));
test("by second element", () => assertEqual(sortBy([[3, 4], [5, 2], [10, 1]], (x) => x[1]), [[10, 1], [5, 2], [3, 4]]));`,
  ],
  [
    "join-two-arrays-by-id",
    `/**
 * @param {Array} arr1
 * @param {Array} arr2
 * @return {Array}
 */
var join = function (arr1, arr2) {
  // your code
};`,
    `test("no overlap", () => assertEqual(join([{ id: 1, x: 1 }, { id: 2, x: 9 }], [{ id: 3, x: 5 }]), [{ id: 1, x: 1 }, { id: 2, x: 9 }, { id: 3, x: 5 }]));
test("arr2 wins on overlap", () => assertEqual(join([{ id: 1, x: 2, y: 3 }, { id: 2, x: 3, y: 6 }], [{ id: 2, x: 10, y: 20 }, { id: 3, x: 0, y: 0 }]), [{ id: 1, x: 2, y: 3 }, { id: 2, x: 10, y: 20 }, { id: 3, x: 0, y: 0 }]));
test("shallow merge keeps other keys", () => assertEqual(join([{ id: 1, b: { b: 94 }, v: [4, 3], y: 48 }], [{ id: 1, b: { c: 84 }, v: [1, 3] }]), [{ id: 1, b: { c: 84 }, v: [1, 3], y: 48 }]));`,
  ],
  [
    "flatten-deeply-nested-array",
    `/**
 * Don't use Array.prototype.flat.
 * @param {Array} arr
 * @param {number} n depth
 * @return {Array}
 */
var flat = function (arr, n) {
  // your code
};`,
    `const input = [1, 2, 3, [4, 5, 6], [7, 8, [9, 10, 11], 12], [13, 14, 15]];
test("n = 0", () => assertEqual(flat(input, 0), input));
test("n = 1", () => assertEqual(flat(input, 1), [1, 2, 3, 4, 5, 6, 7, 8, [9, 10, 11], 12, 13, 14, 15]));
test("n = 2", () => assertEqual(flat([[1, 2, 3], [4, 5, 6], [7, 8, [9, 10, 11], 12], [13, 14, 15]], 2), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]));`,
  ],
  [
    "compact-object",
    `/**
 * @param {Object|Array} obj
 * @return {Object|Array}
 */
var compactObject = function (obj) {
  // your code
};`,
    `test("array", () => assertEqual(compactObject([null, 0, false, 1]), [1]));
test("object", () => assertEqual(compactObject({ a: null, b: [false, 1] }), { b: [1] }));
test("nested", () => assertEqual(compactObject([null, 0, 5, [0], [false, 16]]), [5, [], [16]]));`,
  ],
  [
    "event-emitter",
    `class EventEmitter {
  /**
   * @param {string} eventName
   * @param {Function} callback
   * @return {Object}
   */
  subscribe(eventName, callback) {
    return {
      unsubscribe: () => {},
    };
  }

  /**
   * @param {string} eventName
   * @param {Array} args
   * @return {Array}
   */
  emit(eventName, args = []) {}
}`,
    `test("emits in subscription order", () => {
  const emitter = new EventEmitter();
  assertEqual(emitter.emit("firstEvent"), []);
  emitter.subscribe("firstEvent", () => 5);
  emitter.subscribe("firstEvent", () => 6);
  assertEqual(emitter.emit("firstEvent"), [5, 6]);
});
test("passes args and unsubscribes", () => {
  const emitter = new EventEmitter();
  const sub = emitter.subscribe("firstEvent", (...args) => args.join(","));
  assertEqual(emitter.emit("firstEvent", [1, 2, 3]), ["1,2,3"]);
  assertEqual(sub.unsubscribe(), undefined);
  assertEqual(emitter.emit("firstEvent", [4, 5, 6]), []);
});`,
  ],
  [
    "array-wrapper",
    `/**
 * @param {number[]} nums
 * @return {void}
 */
var ArrayWrapper = function (nums) {
  // your code
};

/**
 * @return {number}
 */
ArrayWrapper.prototype.valueOf = function () {};

/**
 * @return {string}
 */
ArrayWrapper.prototype.toString = function () {};`,
    `test("+ adds the sums", () => {
  assertEqual(new ArrayWrapper([1, 2]) + new ArrayWrapper([3, 4]), 10);
  assertEqual(new ArrayWrapper([]) + new ArrayWrapper([]), 0);
});
test("String() prints the array", () => assertEqual(String(new ArrayWrapper([23, 98, 42, 70])), "[23,98,42,70]"));`,
  ],
  [
    "calculator-with-method-chaining",
    `class Calculator {
  /** @param {number} value */
  constructor(value) {}

  /** @param {number} value @return {Calculator} */
  add(value) {}

  /** @param {number} value @return {Calculator} */
  subtract(value) {}

  /** @param {number} value @return {Calculator} */
  multiply(value) {}

  /** @param {number} value @return {Calculator} */
  divide(value) {}

  /** @param {number} value @return {Calculator} */
  power(value) {}

  /** @return {number} */
  getResult() {}
}`,
    `const thrown = (fn) => { try { fn(); } catch (e) { return e instanceof Error ? e.message : e; } };
test("chains", () => {
  assertEqual(new Calculator(10).add(5).subtract(7).getResult(), 8);
  assertEqual(new Calculator(2).multiply(5).power(2).getResult(), 100);
});
test("divide by zero throws", () => assertEqual(thrown(() => new Calculator(20).divide(0).getResult()), "Division by zero is not allowed"));`,
  ],
  [
    "memoize-ii",
    `/**
 * Inputs are equal only when they are the same value (===), objects included.
 * @param {Function} fn
 * @return {Function}
 */
function memoize(fn) {
  return function (...args) {
    // your code
  };
}`,
    `test("primitives", () => {
  let calls = 0;
  const add = memoize((a, b) => { calls++; return a + b; });
  assertEqual(add(2, 2), 4);
  assertEqual(add(2, 2), 4);
  assertEqual(calls, 1);
  assertEqual(add(1, 2), 3);
  assertEqual(calls, 2);
});
test("objects by reference", () => {
  let calls = 0;
  const merge = memoize((a, b) => { calls++; return { ...a, ...b }; });
  const o = {};
  merge(o, o);
  merge(o, o);
  assertEqual(calls, 1);
  merge({}, {});
  assertEqual(calls, 2);
});`,
  ],
  [
    "check-if-object-instance-of-class",
    `/**
 * @param {*} obj
 * @param {*} classFunction
 * @return {boolean}
 */
var checkIfInstanceOf = function (obj, classFunction) {
  // your code
};`,
    `class Animal {}
class Dog extends Animal {}
test("classes and inheritance", () => {
  assertEqual(checkIfInstanceOf(new Date(), Date), true);
  assertEqual(checkIfInstanceOf(new Dog(), Animal), true);
  assertEqual(checkIfInstanceOf(Date, Date), false);
});
test("primitives count through their wrappers", () => {
  assertEqual(checkIfInstanceOf(5, Number), true);
  assertEqual(checkIfInstanceOf(undefined, Object), false);
  assertEqual(checkIfInstanceOf(null, Object), false);
});`,
  ],
  [
    "generate-fibonacci-sequence",
    `/**
 * @return {Generator<number>}
 */
var fibGenerator = function* () {
  // your code
};`,
    `test("first five", () => {
  const gen = fibGenerator();
  assertEqual(Array.from({ length: 5 }, () => gen.next().value), [0, 1, 1, 2, 3]);
});`,
  ],
  [
    "nested-array-generator",
    `/**
 * @param {Array} arr
 * @return {Generator}
 */
var inorderTraversal = function* (arr) {
  // your code
};`,
    `test("nested", () => assertEqual([...inorderTraversal([[[6]], [1, 3], []])], [6, 1, 3]));
test("empty", () => assertEqual([...inorderTraversal([])], []));`,
  ],
  [
    "design-cancellable-function",
    `/**
 * @param {Generator} generator
 * @return {[Function, Promise]}
 */
var cancellable = function (generator) {
  // return [cancel, promise]
};`,
    `// LeetCode passes the generator object: cancellable(generatorFunction()).
test("resolves with the return value", async () => {
  const [, promise] = cancellable((function* () { return 42; })());
  assertEqual(await promise, 42);
});
test("feeds resolved values back in", async () => {
  const [, promise] = cancellable((function* () {
    const msg = yield new Promise((resolve) => resolve("Hello"));
    throw \`Error: \${msg}\`;
  })());
  assertEqual(await promise.catch((e) => e), "Error: Hello");
});
test("cancel rejects with Cancelled", async () => {
  const [cancel, promise] = cancellable((function* () {
    yield new Promise((resolve) => setTimeout(resolve, 200));
    return "Success";
  })());
  setTimeout(cancel, 50);
  assertEqual(await promise.catch((e) => e), "Cancelled");
});`,
  ],
];

const RULE = "// ───────── Examples: ⌘/Ctrl + Enter runs them ─────────";

export const JS_STARTERS: readonly JsStarter[] = STUBS.map(([slug, stub, examples]) => ({ slug, stub, examples }));
export const jsStarterBySlug: ReadonlyMap<string, JsStarter> = new Map(JS_STARTERS.map((s) => [s.slug, s]));

export const jsStarterCode = (s: JsStarter) => `${s.stub}\n\n${RULE}\n${s.examples}\n`;

/** The solution part of a starter-based editor, without the example tests (what LeetCode wants pasted). */
export const stripExamples = (code: string) => code.split(RULE)[0]!.trimEnd();

/** Scratch starter for a sheet problem that has no test cases yet. */
export function scratchStarter(title: string, language: "javascript" | "typescript" | "python"): string {
  if (language === "python") return `# ${title}\n# Write your solution, then call it below. print() output appears in the console.\n\ndef solve():\n    pass\n\nprint(solve())\n`;
  return `// ${title}\n// Write your solution, then call it below. Helpers: assertEqual(actual, expected), test(name, fn).\n\nfunction solve() {\n  \n}\n\nconsole.log(solve());\n`;
}
