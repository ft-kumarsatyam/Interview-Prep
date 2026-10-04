import { AsyncLocalStorage } from "node:async_hooks";
import { DEFAULT_OWNER_ID } from "@/core/domain/owner-scope";

const store = new AsyncLocalStorage<string>();

/**
 * Whose data this request or job is working on. PrepOS has one owner today (OWNER_ID, default "owner"), but every
 * query is already scoped, so a second owner only needs a sign-up flow and `runAsOwner` around the request.
 */
export function currentOwnerId(): string {
  return store.getStore() ?? (process.env.OWNER_ID?.trim() || DEFAULT_OWNER_ID);
}

/**
 * Runs `fn` with every owner-scoped query and insert bound to `ownerId`. Mongoose queries are lazy, so `fn` must
 * `await` them inside the callback (`async () => await Model.find()`); returning an un-awaited query runs it as the default owner.
 */
export function runAsOwner<T>(ownerId: string, fn: () => T): T {
  return store.run(ownerId, fn);
}
