import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Check, ChevronRight, Globe, GraduationCap, Hammer, MessageCircleQuestion, Monitor, Network, Route, Server, Sparkles, type LucideIcon } from "lucide-react";
import { chipClass } from "@/components/shared/chip";
import { LinkCard } from "@/components/shared/link-card";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { StatTile } from "@/components/shared/stat-tile";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { interviewQuestions, webLessonById, webLessons, webProjects, webTracks } from "@/core/content";
import { WEB_AREA_INFO, WEB_AREAS, nextLesson, projectArea, trackProgress, type WebArea } from "@/modules/learn/domain/webdev";
import { getDoneLessons } from "@/modules/learn/services/webdev";

export const metadata: Metadata = { title: "Web & AI" };

const AREA_ICON: Record<WebArea, LucideIcon> = { frontend: Monitor, backend: Server, architecture: Network, ai: Sparkles };

export default async function WebPage({ searchParams }: PageProps<"/web">) {
  const sp = await searchParams;
  const area = (WEB_AREAS as readonly string[]).includes(String(sp.area)) ? (sp.area as WebArea) : null;
  const done = new Set((await getDoneLessons()).keys());
  const progress = new Map(trackProgress(webLessons, done).map((p) => [p.track, p]));
  const next = nextLesson(webLessons.filter((l) => !area || webTracks.find((t) => t.id === l.track)?.area === area), done);
  const questionsByTrack = Map.groupBy(interviewQuestions, (q) => q.track);
  const projectsByArea = Map.groupBy(webProjects, (p) => projectArea(p, webLessonById, webTracks));
  const areas = WEB_AREAS.filter((a) => (!area || a === area) && webTracks.some((t) => t.area === a));

  return (
    <>
      <PageHeader icon={Globe} title="Web, frontend and AI engineering" description="Frontend from the browser up to frontend at scale and frontend system design, the backend and data stack, architecture, and GenAI: how LLMs work, RAG, agents and evals. Optional: this never changes your study plan.">
        {next && (
          <Button asChild>
            <Link href={`/web/${next.id}`}>Continue: {next.title}</Link>
          </Button>
        )}
      </PageHeader>

      <div className="space-y-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile icon={BookOpen} label="Lessons done" value={`${done.size}/${webLessons.length}`} hint={`${webTracks.length} tracks`} tone="primary" />
          <StatTile icon={MessageCircleQuestion} label="Interview questions" value={interviewQuestions.length} hint="With model answers" tone="info" />
          <StatTile icon={Hammer} label="Resume projects" value={webProjects.length} hint="Milestones and bullets" tone="success" />
          <StatTile icon={Route} label="Go deeper" hint="Courses and roadmaps">
            <span className="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-sm">
              <Link href="/courses" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
                <GraduationCap className="size-3.5" aria-hidden /> Courses
              </Link>
              <Link href="/roadmaps" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
                <Route className="size-3.5" aria-hidden /> Roadmaps
              </Link>
            </span>
          </StatTile>
        </div>

        <LinkCard href="/web/interview" className="border-primary/30 bg-primary/5 p-4 hover:bg-primary/10">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <MessageCircleQuestion className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Interview bank: {interviewQuestions.length} questions with model answers</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Frontend, frontend system design, backend, data, architecture and GenAI. Type your answer, reveal the model answer, and the ones you miss come back first.</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </LinkCard>

        <nav aria-label="Area" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <Link href="/web" className={chipClass(!area)} aria-current={!area ? "true" : undefined}>
            Everything
          </Link>
          {WEB_AREAS.filter((a) => webTracks.some((t) => t.area === a)).map((a) => {
            const Icon = AREA_ICON[a];
            return (
              <Link key={a} href={`/web?area=${a}`} className={chipClass(area === a)} aria-current={area === a ? "true" : undefined}>
                <Icon className="size-3.5" aria-hidden /> {WEB_AREA_INFO[a].name}
              </Link>
            );
          })}
        </nav>

        {areas.map((a) => {
          const Icon = AREA_ICON[a];
          const tracks = webTracks.filter((t) => t.area === a);
          const projects = projectsByArea.get(a) ?? [];
          return (
            <section key={a} aria-labelledby={`area-${a}`} className="space-y-5">
              <div className="flex items-start gap-3 border-b pb-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 id={`area-${a}`} className="text-lg font-semibold tracking-tight">
                    {WEB_AREA_INFO[a].name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{WEB_AREA_INFO[a].blurb}</p>
                </div>
              </div>

              {tracks.map((t) => {
                const p = progress.get(t.id) ?? { done: 0, total: 0, pct: 0 };
                const lessons = webLessons.filter((l) => l.track === t.id);
                const upNext = nextLesson(lessons, done);
                const qCount = questionsByTrack.get(t.id)?.length ?? 0;
                return (
                  <div key={t.id} className="space-y-3 rounded-xl border bg-card/50 p-3 sm:p-4">
                    <SectionHeading
                      level={3}
                      title={t.name}
                      className="mb-0"
                      action={
                        <span className="flex flex-wrap gap-2">
                          {qCount > 0 && (
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/web/interview/${t.id}`}>
                                <MessageCircleQuestion className="size-4" aria-hidden /> {qCount} questions
                              </Link>
                            </Button>
                          )}
                          {upNext && (
                            <Button asChild size="sm" variant={p.done > 0 ? "default" : "outline"}>
                              <Link href={`/web/${upNext.id}`}>{p.done > 0 ? "Continue" : "Start"}</Link>
                            </Button>
                          )}
                        </span>
                      }
                    />
                    <p className="text-sm text-muted-foreground">{t.blurb}</p>
                    <div className="flex items-center gap-3">
                      <Progress value={p.pct} aria-label={`${t.name} progress`} className="h-2 max-w-xs" />
                      <span className="tabular font-mono text-xs text-muted-foreground">
                        {p.done}/{p.total}
                      </span>
                    </div>
                    <ol className="grid gap-2 md:grid-cols-2">
                      {lessons.map((l, i) => (
                        <li key={l.id}>
                          <Link href={`/web/${l.id}`} className="flex h-full gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                            <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px] ${done.has(l.id) ? "border-success bg-success text-white" : "text-muted-foreground"}`}>
                              {done.has(l.id) ? <Check className="size-3" aria-label="Done" /> : i + 1}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">{l.title}</span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">{l.summary}</span>
                              <span className="mt-1 block text-xs text-muted-foreground">{l.minutes} min</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}

              {projects.length > 0 && (
                <div className="space-y-2">
                  <SectionHeading level={3} title="Build it: resume projects" hint="Milestones, deep dives and ready resume bullets" />
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {projects.map((pr) => (
                      <li key={pr.slug}>
                        <LinkCard href={`/projects/${pr.slug}`} className="h-full items-start">
                          <Hammer className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-semibold">{pr.title}</span>
                              <ToneBadge tone={pr.level === "advanced" ? "warning" : "info"}>{pr.level}</ToneBadge>
                            </span>
                            <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{pr.summary}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {pr.stack.slice(0, 4).join(" · ")} · ~{pr.hours} h
                            </span>
                          </span>
                        </LinkCard>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
