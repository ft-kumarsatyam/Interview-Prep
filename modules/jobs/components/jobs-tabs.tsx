import Link from "next/link";
import { chipClass } from "@/components/shared/chip";

const TOP = [
  { id: "find", href: "/jobs", label: "Find" },
  { id: "tracker", href: "/jobs/tracker", label: "Tracker" },
  { id: "setup", href: "/jobs/profiles", label: "Setup" },
] as const;

const SETUP = [
  { id: "profiles", href: "/jobs/profiles", label: "Search profiles" },
  { id: "sources", href: "/jobs/sources", label: "Sources" },
  { id: "links", href: "/jobs/links", label: "Search elsewhere" },
] as const;

export type JobsTab = "discover" | "tracker" | (typeof SETUP)[number]["id"];

const topOf = (tab: JobsTab) => (tab === "discover" ? "find" : tab === "tracker" ? "tracker" : "setup");

/** Three places for the job hunt: find new roles, track the ones you are chasing, and set up searches, sources and outside links. */
export function JobsTabs({ active, trackerCount }: { active: JobsTab; trackerCount?: number }) {
  const top = topOf(active);
  return (
    <div className="-mt-1 mb-5 space-y-2">
      <nav aria-label="Jobs sections" className="flex flex-wrap gap-1.5">
        {TOP.map((t) => (
          <Link key={t.id} href={t.href} aria-current={t.id === top ? "page" : undefined} className={chipClass(t.id === top)}>
            {t.label}
            {t.id === "tracker" && trackerCount ? <span className="tabular font-mono text-xs opacity-70">{trackerCount}</span> : null}
          </Link>
        ))}
      </nav>
      {top === "setup" && (
        <nav aria-label="Setup" className="flex flex-wrap gap-x-4 gap-y-1 border-b pb-2 text-sm">
          {SETUP.map((t) => (
            <Link key={t.id} href={t.href} aria-current={t.id === active ? "page" : undefined} className={t.id === active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}>
              {t.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
