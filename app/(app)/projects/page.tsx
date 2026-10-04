import type { Metadata } from "next";
import Link from "next/link";
import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Progress } from "@/components/ui/progress";
import { webProjects } from "@/lib/content";
import { projectProgress } from "@/lib/domain/webdev";
import { getProjectStates } from "@/lib/services/webdev";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const states = await getProjectStates();
  return (
    <>
      <PageHeader icon={Hammer} title="Guided projects" description="Portfolio-grade builds, each with milestones you can check off, the lessons behind it, interview talking points, and resume bullets you can drop straight into your resume." />
      <ul className="grid gap-4 md:grid-cols-2">
        {webProjects.map((p) => {
          const st = states.get(p.slug);
          const prog = projectProgress(p, st?.milestones ?? []);
          return (
            <li key={p.slug}>
              <Link href={`/projects/${p.slug}`} className="flex h-full flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/5 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold">{p.title}</h2>
                  <ToneBadge tone={p.level === "advanced" ? "warning" : "info"}>{p.level}</ToneBadge>
                  {st?.doneOn && <ToneBadge tone="success">Done</ToneBadge>}
                </div>
                <p className="text-sm text-muted-foreground">{p.summary}</p>
                <ul className="flex flex-wrap gap-1.5" aria-label="Stack">
                  {p.stack.map((s) => (
                    <li key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {s}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex items-center gap-3">
                  <Progress value={prog.pct} aria-label={`${p.title} progress`} className="h-1.5" />
                  <span className="tabular font-mono text-xs text-muted-foreground">
                    {prog.done}/{prog.total} · ~{p.hours} h
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
