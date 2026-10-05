import Link from "next/link";
import type { DiscoverItem } from "@/modules/jobs/services/job-discovery";

/** The best jobs already read from public company boards and feeds for the chosen profile. Presentational: the page passes the items. */
export function ProfileMatches({ profileId, profileName, items, matching }: { profileId: string; profileName: string; items: DiscoverItem[]; matching: number }) {
  return (
    <section aria-label={`Matches for ${profileName}`} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Matches for {profileName}</h2>
        <Link href={`/jobs?profile=${profileId}`} className="text-sm text-primary underline-offset-2 hover:underline">
          See all {matching.toLocaleString()} in Discover
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">Read straight from company career boards (Greenhouse, Lever, Ashby and others) and remote feeds, filtered by this profile. LinkedIn, Naukri and the like can only be searched with the links below.</p>
      {items.length === 0 ? (
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">Nothing matches yet. Refresh jobs on the Discover tab, or loosen the profile.</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {items.map((i) => (
            <li key={i.id} className="rounded-lg border bg-card px-3 py-2.5">
              <Link href={`/jobs/discover/${i.id}`} className="block min-w-0 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <span className="block truncate text-sm font-medium">{i.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {i.company} · {i.location || "Location not listed"}
                  {i.remote ? " · remote" : ""} · {i.score}% match
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
