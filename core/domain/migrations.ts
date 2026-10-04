/** Migration ordering rules, kept pure so they can be tested without a database. */

export interface MigrationMeta {
  id: string;
}

const ID = /^\d{3}-[a-z0-9-]+$/;

/** Ids look like `001-owner-id`: three digits, then a kebab-case name. They run in id order. */
export function validateMigrationIds(ids: string[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!ID.test(id)) problems.push(`${id}: expected NNN-kebab-name`);
    if (seen.has(id)) problems.push(`${id}: duplicate id`);
    seen.add(id);
  }
  const sorted = [...ids].sort();
  if (ids.some((id, i) => id !== sorted[i])) problems.push("migrations are not listed in id order");
  return problems;
}

/** The migrations that have not run yet, in order. An applied id that no longer exists is an error (someone deleted history). */
export function pendingMigrations<T extends MigrationMeta>(all: T[], applied: Iterable<string>): T[] {
  const done = new Set(applied);
  const known = new Set(all.map((m) => m.id));
  const orphan = [...done].filter((id) => !known.has(id));
  if (orphan.length) throw new Error(`Applied migrations missing from the code: ${orphan.join(", ")}`);
  return all.filter((m) => !done.has(m.id));
}
