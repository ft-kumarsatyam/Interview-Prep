/**
 * How many steps back in this tab's history the most recent visit to `targetHref`'s page is, or null when that page
 * is not behind the current entry. Only the pathname is compared, so going back restores the exact filters, tab and
 * scroll the page had when you left it.
 */
export function stepsBackTo(entryUrls: readonly (string | null)[], currentIndex: number, targetHref: string, origin: string): number | null {
  const target = new URL(targetHref, origin);
  if (target.origin !== origin) return null;
  for (let i = Math.min(currentIndex, entryUrls.length) - 1; i >= 0; i--) {
    const raw = entryUrls[i];
    if (!raw) continue;
    const url = new URL(raw, origin);
    if (url.origin === origin && url.pathname === target.pathname) return currentIndex - i;
  }
  return null;
}

/** A copy of `search` with `patch` applied: a null or empty value removes the key, an array writes it repeated. */
export function patchQuery(search: string, patch: Record<string, string | readonly string[] | null | undefined>): string {
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(patch)) {
    params.delete(key);
    if (Array.isArray(value)) for (const item of value) params.append(key, item);
    else if (typeof value === "string" && value) params.set(key, value);
  }
  return params.toString();
}
