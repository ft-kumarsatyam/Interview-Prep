import Link from "next/link";
import { ToneBadge } from "@/components/shared/tone-badge";

export interface DemandRow {
  nodeId: string;
  title: string;
  jobs: number;
  skills: string[];
  done: boolean;
}

/** The nodes your saved jobs ask for most. Data arrives as props. */
export function JobDemandCard({ rows, jobCount }: { rows: DemandRow[]; jobCount: number }) {
  return (
    <section aria-label="Most asked in your jobs" className="space-y-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Most asked in your jobs</h2>
        <span className="text-xs text-muted-foreground">from {jobCount} saved {jobCount === 1 ? "job" : "jobs"}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {jobCount === 0 ? "Save or capture a few jobs and the skills they ask for will rank these topics for you." : "None of your saved jobs mention skills from this roadmap yet."}{" "}
          <Link href="/jobs" className="font-medium text-primary underline-offset-2 hover:underline">
            Find jobs
          </Link>
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.nodeId}>
              <a href={`#node-${r.nodeId}`} className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <span className="tabular w-14 shrink-0 font-mono text-xs text-muted-foreground">{r.jobs}/{jobCount} jobs</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.skills.join(", ")}</span>
                </span>
                <ToneBadge tone={r.done ? "success" : "warning"}>{r.done ? "Done" : "To learn"}</ToneBadge>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
