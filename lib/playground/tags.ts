/**
 * Snippet tags live in one string column (the original `tag` field), comma or space
 * separated, so existing single-tag snippets keep working with no migration.
 */
export const MAX_TAGS = 8;

export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(/[,\s]+/)) {
    const tag = part.replace(/^#+/, "").trim();
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    tags.push(tag);
    if (tags.length === MAX_TAGS) break;
  }
  return tags;
}

export function formatTags(tags: readonly string[]): string {
  return tags.join(", ");
}

export interface Taggable {
  title: string;
  tag: string;
  code: string;
}

/** Tags across all snippets, most used first. */
export function tagCounts(snippets: readonly Taggable[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const s of snippets) {
    for (const tag of parseTags(s.tag)) {
      const key = tag.toLowerCase();
      const entry = counts.get(key);
      if (entry) entry.count++;
      else counts.set(key, { tag, count: 1 });
    }
  }
  return [...counts.values()].toSorted((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Case-insensitive search over title, tags and code, optionally narrowed to one tag. */
export function filterSnippets<T extends Taggable>(snippets: readonly T[], query: string, tag: string | null): T[] {
  const q = query.trim().toLowerCase();
  return snippets.filter((s) => {
    if (tag && !parseTags(s.tag).some((t) => t.toLowerCase() === tag.toLowerCase())) return false;
    if (!q) return true;
    return s.title.toLowerCase().includes(q) || s.tag.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
  });
}
