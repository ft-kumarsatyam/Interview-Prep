import Link from "next/link";
import { chipClass } from "@/components/shared/chip";

const TABS = [
  { id: "discover", href: "/jobs", label: "Discover" },
  { id: "tracker", href: "/jobs/tracker", label: "Tracker" },
  { id: "sources", href: "/jobs/sources", label: "Sources" },
  { id: "links", href: "/jobs/links", label: "Search links" },
] as const;

export type JobsTab = (typeof TABS)[number]["id"];

/** The four views of the job hunt: what is new, what you are tracking, where it comes from, and where to search yourself. */
export function JobsTabs({ active, trackerCount }: { active: JobsTab; trackerCount?: number }) {
  return (
    <nav aria-label="Jobs sections" className="-mt-1 mb-5 flex flex-wrap gap-1.5">
      {TABS.map((t) => (
        <Link key={t.id} href={t.href} aria-current={t.id === active ? "page" : undefined} className={chipClass(t.id === active)}>
          {t.label}
          {t.id === "tracker" && trackerCount ? <span className="tabular font-mono text-xs opacity-70">{trackerCount}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
