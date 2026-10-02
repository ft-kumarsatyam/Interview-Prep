export interface Drill {
  id: string;
  title: string;
  topic: string;
  code: string;
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
];
