import type { Metadata } from "next";
import Link from "next/link";
import { Hammer } from "lucide-react";
import { chipClass } from "@/components/shared/chip";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Progress } from "@/components/ui/progress";
import { webLessonById, webProjects, webTracks } from "@/core/content";
import { WEB_AREA_INFO, WEB_AREAS, projectArea, projectProgress, type WebArea } from "@/modules/learn/domain/webdev";
import { getProjectStates } from "@/modules/learn/services/webdev";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const sp = await searchParams;
  const area = (WEB_AREAS as readonly string[]).includes(String(sp.area)) ? (sp.area as WebArea) : null;
  const states = await getProjectStates();
  const byArea = Map.groupBy(webProjects, (p) => projectArea(p, webLessonById, webTracks));
  const areas = WEB_AREAS.filter((a) => byArea.has(a));

  return (
    <>
      <PageHeader icon={Hammer} title="Guided projects" description="Portfolio-grade builds that read well on a resume: each has milestones you can check off, deep dives into the hard decisions, the lessons behind it, interview talking points, and resume bullets you can drop straight into your resume." />
      <nav aria-label="Area" className="-mx-1 mb-6 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <Link href="/projects" className={chipClass(!area)} aria-current={!area ? "true" : undefined}>
          All <span className="tabular font-mono text-2xs opacity-80">{webProjects.length}</span>
        </Link>
        {areas.map((a) => (
          <Link key={a} href={`/projects?area=${a}`} className={chipClass(area === a)} aria-current={area === a ? "true" : undefined}>
            {WEB_AREA_INFO[a].name} <span className="tabular font-mono text-2xs opacity-80">{byArea.get(a)!.length}</span>
          </Link>
        ))}
      </nav>
      <div className="space-y-8">
        {areas
          .filter((a) => !area || a === area)
          .map((a) => (
            <section key={a} aria-label={WEB_AREA_INFO[a].name}>
              <SectionHeading title={WEB_AREA_INFO[a].name} hint={`${byArea.get(a)!.length} projects`} />
              <ul className="grid gap-4 md:grid-cols-2">
                {byArea.get(a)!.map((p) => {
                  const st = states.get(p.slug);
                  const prog = projectProgress(p, st?.milestones ?? []);
                  return (
                    <li key={p.slug}>
                      <Link href={`/projects/${p.slug}`} className="flex h-full flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/5 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">{p.title}</h3>
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
                            {prog.done}/{prog.total} · ~{p.hours} h{p.deepDives?.length ? ` · ${p.deepDives.length} deep dives` : ""}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
      </div>
    </>
  );
}
