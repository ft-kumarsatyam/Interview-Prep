import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight } from "lucide-react";
import { BackLink } from "@/components/shared/back-link";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Progress } from "@/components/ui/progress";
import { problemBySlug } from "@/core/content";
import { roadmapById, roadmapLesson } from "@/core/roadmaps";
import { ChecklistItem, JoinButton, LinkRow, ManualTick } from "@/modules/roadmap/components/roadmap-controls";
import { nextNode, PRIORITY_LABEL, type Priority } from "@/modules/roadmap/domain/roadmap";
import { getRoadmapState } from "@/modules/roadmap/services/roadmap";

const TONE: Record<Priority, "primary" | "info" | "neutral"> = { must: "primary", can: "info", skip: "neutral" };

export async function generateMetadata({ params }: PageProps<"/roadmaps/[roadmapId]">): Promise<Metadata> {
  const { roadmapId } = await params;
  return { title: roadmapById.get(decodeURIComponent(roadmapId))?.title ?? "Roadmap" };
}

function Part({ label, state }: { label: string; state: boolean | null }) {
  if (state === null) return null;
  return <ToneBadge tone={state ? "success" : "neutral"}>{state ? `${label} done` : `${label} to do`}</ToneBadge>;
}

export default async function RoadmapPage({ params }: PageProps<"/roadmaps/[roadmapId]">) {
  const { roadmapId: raw } = await params;
  const roadmapId = decodeURIComponent(raw);
  const roadmap = roadmapById.get(roadmapId);
  if (!roadmap) notFound();
  const state = await getRoadmapState(roadmap);
  const next = nextNode(roadmap, state.statuses);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <BackLink href="/roadmaps">Roadmaps</BackLink>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{roadmap.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{roadmap.blurb}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Progress value={state.progress.pct} aria-label="Must-do progress" className="h-2 max-w-xs" />
          <span className="tabular font-mono text-xs text-muted-foreground">
            {state.progress.must.done}/{state.progress.must.total} must do · {state.progress.can.done}/{state.progress.can.total} can do
          </span>
          <JoinButton roadmapId={roadmap.id} joined={!!state.joinedOn} />
        </div>
        <ul className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground" aria-label="Legend">
          <li><ToneBadge tone="primary">Must do</ToneBadge> learn these first</li>
          <li><ToneBadge tone="info">Can do</ToneBadge> useful, after the must-dos</li>
          <li><ToneBadge>Can skip</ToneBadge> rarely needed</li>
        </ul>
        {next && (
          <p className="mt-3 text-sm">
            Next: <a href={`#node-${next.id}`} className="font-medium text-primary underline-offset-2 hover:underline">{next.title}</a>
          </p>
        )}
      </div>

      {roadmap.sections.map((section, si) => (
        <section key={section.id} aria-label={section.title} className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs text-primary">{si + 1}</span>
            {section.title}
            <span className="tabular ml-auto font-mono text-xs font-normal text-muted-foreground">
              {section.nodes.filter((n) => state.statuses.get(n.id)?.done).length}/{section.nodes.length}
            </span>
          </h2>
          <ul className="space-y-3 border-l pl-4">
            {section.nodes.map((node) => {
              const st = state.statuses.get(node.id)!;
              const read = state.readLinks.get(node.id) ?? [];
              const checked = state.checked.get(node.id) ?? [];
              const lesson = node.lesson ? roadmapLesson(node.lesson) : undefined;
              return (
                <li key={node.id} id={`node-${node.id}`} className="scroll-mt-20">
                  <details className="group rounded-xl border bg-card ring-1 ring-foreground/5 open:shadow-sm" open={next?.id === node.id}>
                    <summary className="flex min-h-12 cursor-pointer list-none items-start gap-3 rounded-xl p-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
                      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${st.done ? "border-success bg-success text-white" : ""}`}>{st.done && <Check className="size-3" aria-label="Done" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{node.title}</span>
                          <ToneBadge tone={TONE[node.priority]}>{PRIORITY_LABEL[node.priority]}</ToneBadge>
                          {st.manual && <ToneBadge tone="success">Ticked by you</ToneBadge>}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{node.summary}</span>
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          <Part label="Reading" state={st.reading} />
                          <Part label="Practice" state={st.practice} />
                          <Part label="Quiz" state={st.quiz} />
                          {st.topics.total > 0 && (
                            <ToneBadge tone={st.checklist ? "success" : "neutral"}>
                              Topics {st.topics.done}/{st.topics.total}
                            </ToneBadge>
                          )}
                        </span>
                      </span>
                      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
                    </summary>
                    <div className="space-y-4 border-t p-3">
                      {node.checklist.length > 0 && (
                        <div className="space-y-1">
                          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Topics to know</h3>
                          <ul>
                            {node.checklist.map((item, i) => (
                              <ChecklistItem key={item} roadmapId={roadmap.id} nodeId={node.id} index={i} label={item} checked={checked.includes(i)} />
                            ))}
                          </ul>
                        </div>
                      )}
                      {(lesson || node.links.length > 0) && (
                        <div className="space-y-1">
                          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Read</h3>
                          <ul className="space-y-0.5">
                            {lesson && (
                              <li className="flex items-center gap-2">
                                <span className={`grid size-6 shrink-0 place-items-center rounded-md border ${state.doneLessons.has(node.lesson!) ? "border-success bg-success text-white" : ""}`}>
                                  {state.doneLessons.has(node.lesson!) && <Check className="size-3.5" aria-label="Lesson done" />}
                                </span>
                                <Link href={lesson.href} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-primary underline-offset-2 hover:underline">
                                  {lesson.title} <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">in-app lesson</span>
                                </Link>
                              </li>
                            )}
                            {node.links.map((l) => (
                              <LinkRow key={l.url} roadmapId={roadmap.id} nodeId={node.id} link={l} read={read.includes(l.url)} />
                            ))}
                          </ul>
                        </div>
                      )}
                      {node.problems.length > 0 && (
                        <div className="space-y-1">
                          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Practice</h3>
                          <ul className="space-y-0.5">
                            {node.problems.map((slug) => {
                              const p = problemBySlug.get(slug);
                              const solved = state.solved.has(slug);
                              return (
                                <li key={slug} className="flex items-center gap-2">
                                  <span className={`grid size-6 shrink-0 place-items-center rounded-md border ${solved ? "border-success bg-success text-white" : ""}`}>{solved && <Check className="size-3.5" aria-label="Solved" />}</span>
                                  <Link href={`/dsa/${slug}`} className="inline-flex min-h-9 items-center text-sm hover:text-primary">
                                    {p?.title ?? slug}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      {node.quiz && (
                        <div className="space-y-1">
                          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Quiz</h3>
                          <div className="flex items-center gap-2">
                            <span className={`grid size-6 shrink-0 place-items-center rounded-md border ${st.quiz ? "border-success bg-success text-white" : ""}`}>{st.quiz && <Check className="size-3.5" aria-label="Passed" />}</span>
                            <Link href={`/learn/practice?ref=${encodeURIComponent(node.quiz)}`} className="inline-flex min-h-9 items-center text-sm text-primary underline-offset-2 hover:underline">
                              {st.quiz ? "Passed. Take it again" : "Take the quiz"}
                            </Link>
                          </div>
                        </div>
                      )}
                      <ManualTick roadmapId={roadmap.id} nodeId={node.id} manual={st.manual} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
