import type { NewsFilter } from "@/modules/news/services/news";

export type NewsParams = { cat?: string; src?: string; tag?: string; f?: NewsFilter };

export function newsHref(current: NewsParams, patch: NewsParams): string {
  const next = { ...current, ...patch };
  const qs = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => !!e[1] && e[1] !== "all"));
  const s = qs.toString();
  return s ? `/news?${s}` : "/news";
}
