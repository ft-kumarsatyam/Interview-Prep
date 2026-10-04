/** Searching and ordering the tracked jobs on the board. Pure. */
export type JobSort = "recent" | "follow-up" | "company" | "ats";

export const SORT_LABEL: Record<JobSort, string> = { recent: "Recently updated", "follow-up": "Follow-up soonest", company: "Company A to Z", ats: "Best ATS score" };

interface Listed {
  title: string;
  company: string;
  location: string;
  followUpOn: string | null;
  atsScore: number | null;
}

/** Jobs whose title, company or location contain every word you typed, ignoring case. An empty search keeps everything. */
export function searchJobs<T extends Listed>(jobs: readonly T[], query: string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...jobs];
  return jobs.filter((j) => {
    const hay = `${j.title} ${j.company} ${j.location}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** A new array in the chosen order. "recent" keeps the incoming order (the service sends newest first). Ties keep their order. */
export function sortJobs<T extends Listed>(jobs: readonly T[], by: JobSort): T[] {
  const list = [...jobs];
  if (by === "recent") return list;
  if (by === "company") return list.toSorted((a, b) => a.company.localeCompare(b.company, undefined, { sensitivity: "base" }));
  if (by === "ats") return list.toSorted((a, b) => (b.atsScore ?? -1) - (a.atsScore ?? -1));
  // Jobs with a follow-up date come first, soonest first; the rest keep their order after them.
  return list.toSorted((a, b) => (a.followUpOn ?? "9999-12-31").localeCompare(b.followUpOn ?? "9999-12-31"));
}
