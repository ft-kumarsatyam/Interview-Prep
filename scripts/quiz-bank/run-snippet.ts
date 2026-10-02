/**
 * Runs a trusted, hand-written snippet in node:vm and returns what it printed.
 * node:vm is NOT a security boundary: never pass model-written or user code here.
 */
import { format } from "node:util";
import vm from "node:vm";

export async function runSnippet(code: string, settleMs = 120): Promise<string> {
  const lines: string[] = [];
  const log = (...args: unknown[]) => void lines.push(format(...args));
  const timeouts = new Set<NodeJS.Timeout>();
  const immediates = new Set<NodeJS.Immediate>();

  const sandbox = {
    console: { log, info: log, warn: log, error: log },
    setTimeout: (fn: () => void, ms?: number) => {
      const t = setTimeout(fn, ms);
      timeouts.add(t);
      return t;
    },
    clearTimeout: (t: NodeJS.Timeout) => clearTimeout(t),
    setImmediate: (fn: () => void) => {
      const i = setImmediate(fn);
      immediates.add(i);
      return i;
    },
    queueMicrotask,
    process: { nextTick: (fn: () => void) => process.nextTick(fn) },
    Buffer,
    AbortController,
  };
  const context = vm.createContext(sandbox);

  let thrown: unknown;
  // Run from inside a macrotask so nextTick/microtask ordering matches a real `node file.js`.
  await new Promise<void>((resolve) =>
    setImmediate(() => {
      try {
        vm.runInContext(code, context, { timeout: 1000 });
      } catch (err) {
        thrown = err;
      }
      resolve();
    }),
  );
  await new Promise((r) => setTimeout(r, settleMs));
  timeouts.forEach(clearTimeout);
  immediates.forEach(clearImmediate);

  if (thrown) throw new Error(`snippet threw: ${String(thrown)}\n${code}`);
  return lines.join("\n");
}
