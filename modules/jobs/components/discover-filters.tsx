"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Chip } from "@/components/shared/chip";
import { Input } from "@/components/ui/input";

const DAYS = [
  { v: "", label: "Any time" },
  { v: "1", label: "Today" },
  { v: "7", label: "This week" },
  { v: "30", label: "This month" },
];
const MIN = [
  { v: "", label: "Any match" },
  { v: "50", label: "50%+" },
  { v: "70", label: "70%+" },
];

/** Filters live in the URL, so a view can be refreshed, bookmarked and shared. */
export function DiscoverFilters({ tiers, profiles = [] }: { tiers: Array<{ id: string; name: string }>; profiles?: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const get = (k: string) => params.get(k) ?? "";
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
          placeholder="Search titles and companies"
          className="pl-8"
          aria-label="Search jobs"
          maxLength={60}
        />
      </div>
      {profiles.length > 0 && (
        <div role="group" aria-label="Search profile" className="flex flex-wrap gap-1.5">
          <Chip pressed={!get("profile")} onClick={() => set({ profile: null })}>
            General preferences
          </Chip>
          {profiles.map((p) => (
            <Chip key={p.id} pressed={get("profile") === p.id} onClick={() => toggle("profile", p.id)}>
              {p.name}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <div role="group" aria-label="Where from" className="flex flex-wrap gap-1.5">
          <Chip pressed={!get("kind")} onClick={() => set({ kind: null })}>
            All sources
          </Chip>
          <Chip pressed={get("kind") === "boards"} onClick={() => toggle("kind", "boards")}>
            Company pages
          </Chip>
          <Chip pressed={get("kind") === "remote"} onClick={() => toggle("kind", "remote")}>
            Remote feeds
          </Chip>
        </div>
        <div role="group" aria-label="Posted" className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => (
            <Chip key={d.v} pressed={get("days") === d.v} onClick={() => set({ days: d.v || null })}>
              {d.label}
            </Chip>
          ))}
        </div>
        <div role="group" aria-label="Match" className="flex flex-wrap gap-1.5">
          {MIN.map((d) => (
            <Chip key={d.v} pressed={get("min") === d.v} onClick={() => set({ min: d.v || null })}>
              {d.label}
            </Chip>
          ))}
          <Chip pressed={get("remote") === "1"} onClick={() => toggle("remote", "1")}>
            Remote only
          </Chip>
        </div>
      </div>
      <div role="group" aria-label="Kind of company" className="flex flex-wrap gap-1.5">
        {tiers.map((t) => (
          <Chip key={t.id} pressed={get("tier") === t.id} onClick={() => toggle("tier", t.id)}>
            {t.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}
