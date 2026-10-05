"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Chip } from "@/components/shared/chip";
import { Input } from "@/components/ui/input";
import { LEVELS, type BankFacets } from "@/modules/interview-bank/domain/bank";

const MAX_COMPANIES = 14;

/** Filters live in the URL, so a view can be refreshed, bookmarked and shared. Counts come from the page. */
export function BankFilters({ facets }: { facets: BankFacets }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const get = (k: string) => params.get(k) ?? "";
  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    next.delete("n");
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
  };
  const toggle = (k: string, v: string) => set({ [k]: get(k) === v ? null : v });

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => set({ q: e.target.value.trim() || null }), 350);
          }}
          placeholder="Search questions, companies and tags"
          className="pl-8"
          aria-label="Search the interview bank"
          maxLength={80}
        />
      </div>
      <div role="group" aria-label="Category" className="flex flex-wrap gap-1.5">
        <Chip pressed={!get("category")} onClick={() => set({ category: null })}>
          All topics
        </Chip>
        {facets.byCategory.map((c) => (
          <Chip key={c.id} pressed={get("category") === c.id} onClick={() => toggle("category", c.id)} count={c.count}>
            {c.label}
          </Chip>
        ))}
      </div>
      {facets.byCompany.length > 0 && (
        <div role="group" aria-label="Company" className="flex flex-wrap gap-1.5">
          <Chip pressed={!get("company")} onClick={() => set({ company: null })}>
            All companies
          </Chip>
          {facets.byCompany.slice(0, MAX_COMPANIES).map((c) => (
            <Chip key={c.name} pressed={get("company") === c.name} onClick={() => toggle("company", c.name)} count={c.count}>
              {c.name}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <div role="group" aria-label="Level" className="flex flex-wrap gap-1.5">
          {LEVELS.map((l) => (
            <Chip key={l} pressed={get("level") === l} onClick={() => toggle("level", l)}>
              {l[0]!.toUpperCase() + l.slice(1)}
            </Chip>
          ))}
        </div>
        <div role="group" aria-label="Source" className="flex flex-wrap gap-1.5">
          {facets.bySource.map((s) => (
            <Chip key={s.id} pressed={get("source") === s.id} onClick={() => toggle("source", s.id)} count={s.count}>
              {s.label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
}
