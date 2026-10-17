/**
 * Which roadmap links to check next and what a check result means. A link is only called dead after two failed
 * checks in a row, and a site that refuses automated requests (403, 429, 999) is "blocked", never "dead". Pure.
 */
export type LinkState = "ok" | "dead" | "blocked";

export interface LinkHealthEntry {
  url: string;
  status: LinkState;
  failures: number;
  checkedAt: Date;
}

/** Hosts that answer 200 for any path, so the real address to test is their oEmbed endpoint. */
export function checkUrlFor(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if ((host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") && (u.searchParams.get("v") || u.searchParams.get("list") || host === "youtu.be")) {
      return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
    }
  } catch {
    /* not a URL: checked as given and fails there */
  }
  return url;
}

/** Turns one HTTP outcome into a state. `httpStatus` is null when the request itself failed (timeout, DNS, refused). */
export function classify(httpStatus: number | null): LinkState {
  if (httpStatus === null) return "dead";
  if (httpStatus >= 200 && httpStatus < 400) return "ok";
  if (httpStatus === 401 || httpStatus === 403 || httpStatus === 429 || httpStatus === 999) return "blocked";
  return "dead";
}

/** Folds a new result into the stored one: a first failure is kept as "ok" until it repeats. */
export function nextEntry(prev: Pick<LinkHealthEntry, "status" | "failures"> | undefined, result: LinkState): { status: LinkState; failures: number } {
  if (result === "ok" || result === "blocked") return { status: result, failures: 0 };
  const failures = (prev?.failures ?? 0) + 1;
  return { status: failures >= 2 ? "dead" : (prev?.status ?? "ok"), failures };
}

/** The urls to check now: never-checked ones first, then the stalest, at most `size`. */
export function pickBatch(urls: readonly string[], known: ReadonlyMap<string, Pick<LinkHealthEntry, "checkedAt">>, size: number): string[] {
  const unique = [...new Set(urls)];
  const fresh = unique.filter((u) => !known.has(u));
  const stale = unique.filter((u) => known.has(u)).sort((a, b) => known.get(a)!.checkedAt.getTime() - known.get(b)!.checkedAt.getTime());
  return [...fresh, ...stale].slice(0, Math.max(0, size));
}
