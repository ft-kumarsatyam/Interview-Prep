"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Chip } from "@/components/shared/chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { boardSearchLinks, companySearchUrl } from "@/modules/jobs/domain/job-links";

export interface DeepLinkView {
  id: string;
  name: string;
  tierName: string;
  careersUrl: string;
  searchTemplate?: string;
}

/** Searches on the sites that have no public API, prefilled from your preferences and opened in your own signed-in browser. */
export function SearchLinks({ initialRole, initialLocation, initialRemote, roleOptions = [], locationOptions = [], companies }: { initialRole: string; initialLocation: string; initialRemote: boolean; roleOptions?: string[]; locationOptions?: string[]; companies: DeepLinkView[] }) {
  const [role, setRole] = useState(initialRole);
  const [location, setLocation] = useState(initialLocation);
  const [remote, setRemote] = useState(initialRemote);
  const [days, setDays] = useState<1 | 7 | 30>(7);
  const links = useMemo(() => boardSearchLinks({ role, location, remote, days }), [role, location, remote, days]);
  const open = "inline-flex min-h-9 items-center gap-1 rounded-md border px-2.5 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:min-h-11";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sl-role">Role</Label>
          <Input id="sl-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Backend engineer" maxLength={80} />
          {roleOptions.length > 1 && (
            <div role="group" aria-label="Roles in this profile" className="flex flex-wrap gap-1.5 pt-1">
              {roleOptions.map((r) => (
                <Chip key={r} pressed={role === r} onClick={() => setRole(r)}>
                  {r}
                </Chip>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sl-loc">Place</Label>
          <Input id="sl-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bengaluru" maxLength={80} />
          {locationOptions.length > 1 && (
            <div role="group" aria-label="Places in this profile" className="flex flex-wrap gap-1.5 pt-1">
              {locationOptions.map((l) => (
                <Chip key={l} pressed={location === l} onClick={() => setLocation(l)}>
                  {l}
                </Chip>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <Chip pressed={remote} onClick={() => setRemote((v) => !v)}>
            Remote only
          </Chip>
          <span role="group" aria-label="Posted within" className="flex gap-1.5">
            {([1, 7, 30] as const).map((d) => (
              <Chip key={d} pressed={days === d} onClick={() => setDays(d)}>
                {d === 1 ? "24 hours" : `${d} days`}
              </Chip>
            ))}
          </span>
        </div>
      </div>

      <section aria-label="Job sites" className="space-y-3">
        <h2 className="text-base font-semibold">Job sites</h2>
        <p className="text-sm text-muted-foreground">These sites have no public data feed, so PrepOS can&apos;t read them for you. Each link opens a search in your own browser where you are signed in. Found a job you like? Click the PrepOS extension icon on the page to send it here.</p>
        <ul className="grid gap-3 md:grid-cols-2">
          {links.map((l) => (
            <li key={l.id} className="rounded-xl border bg-card p-4">
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                {l.name} <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <p className="mt-1 text-xs text-muted-foreground">{l.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Company career pages" className="space-y-3">
        <h2 className="text-base font-semibold">Company career pages</h2>
        <p className="text-sm text-muted-foreground">Big companies run their own career sites with no public feed. Open their search with your role filled in where the site supports it.</p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => {
            const search = companySearchUrl(c.searchTemplate, { role, location });
            return (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{c.tierName}</span>
                </span>
                <span className="flex shrink-0 gap-1.5">
                  {search && (
                    <a href={search} target="_blank" rel="noopener noreferrer" className={open}>
                      Search<span className="sr-only"> {c.name} jobs (opens in a new tab)</span>
                    </a>
                  )}
                  <a href={c.careersUrl} target="_blank" rel="noopener noreferrer" className={open}>
                    Careers<span className="sr-only"> page of {c.name} (opens in a new tab)</span>
                  </a>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
