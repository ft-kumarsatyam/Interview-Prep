"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, Target as TargetIcon } from "lucide-react";
import { Chip } from "@/components/shared/chip";
import { ToneBadge } from "@/components/shared/tone-badge";
import type { Tone } from "@/components/shared/stat-tile";
import { JOB_STATUSES, SOURCE_LABEL, STATUS_LABEL, type JobSource, type JobStatus } from "@/lib/domain/jobs";

export interface BoardJob {
  id: string;
  title: string;
  company: string;
  source: JobSource;
  status: JobStatus;
  location: string;
  appliedOn: string | null;
  followUpOn: string | null;
  atsScore: number | null;
  targetName: string | null;
  due: boolean;
}

const STATUS_TONE: Record<JobStatus, Tone> = { saved: "neutral", applied: "info", screening: "primary", interview: "warning", offer: "success", rejected: "danger", withdrawn: "neutral" };

/** The tracked jobs, filterable by pipeline stage. */
export function JobsBoard({ jobs }: { jobs: BoardJob[] }) {
  const [status, setStatus] = useState<JobStatus | "all" | "due">("all");
  const counts = useMemo(() => Object.fromEntries(JOB_STATUSES.map((s) => [s, jobs.filter((j) => j.status === s).length])) as Record<JobStatus, number>, [jobs]);
  const dueCount = jobs.filter((j) => j.due).length;
  const shown = jobs.filter((j) => (status === "all" ? true : status === "due" ? j.due : j.status === status));

  return (
    <section aria-label="Tracked jobs" className="space-y-3">
      <div role="group" aria-label="Filter by stage" className="flex flex-wrap gap-1.5">
        <Chip pressed={status === "all"} onClick={() => setStatus("all")} count={jobs.length}>
          All
        </Chip>
        {dueCount > 0 && (
          <Chip pressed={status === "due"} onClick={() => setStatus("due")} count={dueCount}>
            Follow up
          </Chip>
        )}
        {JOB_STATUSES.map((s) => (
          <Chip key={s} pressed={status === s} onClick={() => setStatus(s)} count={counts[s]}>
            {STATUS_LABEL[s]}
          </Chip>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((j) => (
            <li key={j.id}>
              <Link href={`/jobs/${j.id}`} className="block rounded-xl border bg-card p-4 ring-1 ring-foreground/5 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="min-w-0 truncate text-base font-semibold">{j.title}</h2>
                  <ToneBadge tone={STATUS_TONE[j.status]}>{STATUS_LABEL[j.status]}</ToneBadge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {j.company}
                  {j.location ? ` · ${j.location}` : ""} · {SOURCE_LABEL[j.source]}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {j.targetName && (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <TargetIcon className="size-3.5" aria-hidden /> Target: {j.targetName}
                    </span>
                  )}
                  {j.atsScore !== null && <span>ATS {j.atsScore}</span>}
                  {j.appliedOn && <span>Applied {j.appliedOn}</span>}
                  {j.followUpOn && (
                    <span className={`inline-flex items-center gap-1 ${j.due ? "font-medium text-warning" : ""}`}>
                      <CalendarClock className="size-3.5" aria-hidden /> {j.due ? "Follow up now" : `Follow up ${j.followUpOn}`}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
