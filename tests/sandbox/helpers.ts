import vm from "node:vm";
import { WORKER_SOURCE } from "@/core/sandbox/worker-source";

export type Message = { type: string; level?: string; text?: string; index?: number; pass?: boolean; actual?: string; hidden?: boolean };

/**
 * Runs the real Worker script in a Node vm with a fake `self`. A browser Worker is
 * a separate realm with its own console, which is what the separate fake console and
 * the vm context reproduce; this is not a security boundary, just a way to test the script.
 */
export async function runWorker(data: unknown, settleMs = 30): Promise<Message[]> {
  const messages: Message[] = [];
  const noop = () => {};
  const sandbox: Record<string, unknown> = {
    postMessage: (m: Message) => messages.push(m),
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
  await (sandbox.self as { onmessage: (e: { data: unknown }) => Promise<void> }).onmessage({ data });
  await new Promise((r) => setTimeout(r, settleMs));
  return messages;
}

