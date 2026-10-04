import { workerLib } from "@/core/sandbox/worker-lib-node";

/**
 * Structural equality, exactly as the sandbox Worker does it. Node-side only (tests, scripts): it
 * evaluates the Worker library's source, so the tested function is the shipped one.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  return workerLib().deepEqual(a, b);
}
