/** Pure helpers behind the owner-scope plugin (core/db/owner-scope.ts). No I/O, so the rules are testable. */

export const DEFAULT_OWNER_ID = "owner";

type Filter = Record<string, unknown>;

/** Adds `ownerId` to a filter unless the caller already set one (cross-owner jobs such as migrations do). */
export function withOwner<T extends Filter>(filter: T | null | undefined, ownerId: string): T & { ownerId: unknown } {
  const f = (filter ?? {}) as Filter;
  return (f.ownerId === undefined ? { ...f, ownerId } : f) as T & { ownerId: unknown };
}

/** Stages that must stay first in an aggregation pipeline, so the owner `$match` goes right after them. */
const FIRST_STAGES = new Set(["$search", "$searchMeta", "$vectorSearch", "$geoNear", "$collStats", "$indexStats", "$listSessions"]);

/** Returns a new pipeline that starts with an owner `$match`, after any stage that has to come first. */
export function ownerPipeline(pipeline: ReadonlyArray<Record<string, unknown>>, ownerId: string): Array<Record<string, unknown>> {
  const out = [...pipeline];
  const head = out[0];
  const at = head && FIRST_STAGES.has(Object.keys(head)[0] ?? "") ? 1 : 0;
  const first = out[at];
  const already = first && "$match" in first && (first.$match as Filter | undefined)?.ownerId !== undefined;
  if (!already) out.splice(at, 0, { $match: { ownerId } });
  return out;
}

/** An owner-scoped unique index: the same natural key may exist once per owner. */
export function ownerUniqueIndex(fields: Record<string, 1 | -1>): Record<string, 1 | -1> {
  return { ownerId: 1, ...fields };
}
