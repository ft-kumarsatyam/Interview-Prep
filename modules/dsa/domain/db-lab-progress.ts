/** Merges DB Lab solved progress from the database and from this device. Pure. */
import type { SavedMode } from "@/modules/dsa/domain/db-dialect";

export interface SolvedRef {
  challengeId: string;
  mode: SavedMode;
}

/** The union of the server's solved ids and the device's cache. */
export function mergeSolved(server: readonly { challengeId: string }[], local: readonly string[]): Set<string> {
  return new Set([...server.map((s) => s.challengeId), ...local]);
}

/** Ids that only this device knows about, with their mode, ready for `importSolvedAction`. */
export function localOnlySolved(server: readonly { challengeId: string }[], local: readonly string[], modeOf: (id: string) => SavedMode | null): SolvedRef[] {
  const known = new Set(server.map((s) => s.challengeId));
  const out: SolvedRef[] = [];
  for (const id of new Set(local)) {
    if (known.has(id)) continue;
    const mode = modeOf(id);
    if (mode) out.push({ challengeId: id, mode });
  }
  return out;
}
