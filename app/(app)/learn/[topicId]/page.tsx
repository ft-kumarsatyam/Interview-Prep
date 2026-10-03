import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, CalendarClock, Check, ChevronLeft, ChevronRight, ExternalLink, Lock, Network, Sparkles } from "lucide-react";
import { LinkCard } from "@/components/shared/link-card";
import { ToneBadge } from "@/components/shared/tone-badge";
import { LEVELS, StatusRing } from "@/components/learn/topic-meta";
import { TopicStudy } from "@/components/learn/topic-study";
import { BackLink } from "@/components/shared/back-link";
import { TrackChip } from "@/components/shared/badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { practiceCases, subtopicNotes, systemDesign, topicById, topics, trackById } from "@/lib/content";
import { casePath } from "@/lib/domain/case-quiz";
import { neighbours, topicProgress } from "@/lib/domain/learn";
import { planClock } from "@/lib/plan-clock";
import { getSubtopicProgressMap } from "@/lib/services/learn";
import { getMasteryMap } from "@/lib/services/mastery";
import { getSettings } from "@/lib/services/settings";

export async function generateMetadata({ params }: PageProps<"/learn/[topicId]">): Promise<Metadata> {
  const { topicId } = await params;
  return { title: topicById.get(decodeURIComponent(topicId))?.title ?? "Topic" };
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function TopicPage({ params }: PageProps<"/learn/[topicId]">) {
  const { topicId } = await params;
  const topic = topicById.get(decodeURIComponent(topicId));
  if (!topic) notFound();

  const [settings, progress, mastery] = await Promise.all([getSettings(), getSubtopicProgressMap(), getMasteryMap()]);
  const track = trackById.get(topic.track);
  const currentWeek = Math.max(planClock(settings).week, 1);
  const topicMastery = mastery[topic.id];
  const p = topicProgress(topic, (id) => !!progress[id], !!topicMastery?.masteredOn);
  const allTicked = p.done === p.total;
  const { prev, next } = neighbours(topics, topic.id);
  const nextId = p.next === null ? null : `${topic.id}:${p.next}`;

  const items = topic.subtopics.map((title, i) => {
    const id = `${topic.id}:${i}`;
    const m = mastery[id];
    return { id, title, done: !!progress[id], meta: m?.attempts ? `practice ${m.score}% · ${m.attempts} run${m.attempts === 1 ? "" : "s"}` : undefined };
  });
  const notes = Object.fromEntries(items.flatMap((it) => (progress[it.id]?.notes ? [[it.id, progress[it.id]!.notes]] : [])));
  const lessons = Object.fromEntries(items.flatMap((it) => (subtopicNotes.has(it.id) ? [[it.id, subtopicNotes.get(it.id)!]] : [])));
  const cases = [
    ...systemDesign.cases.filter((c) => c.topicId === topic.id).map((c) => ({ key: `hld:${c.slug}`, title: c.title, summary: c.summary, href: casePath("hld", c.slug) })),
    ...practiceCases.filter((c) => c.topicId === topic.id).map((c) => ({ key: `${c.kind}:${c.slug}`, title: c.title, summary: c.summary, href: casePath(c.kind, c.slug) })),
  ];

  return (
    <div className="pb-16 lg:pb-0">
      <BackLink href={`/learn?track=${encodeURIComponent(topic.track)}`}>{track?.name ?? "Learn"}</BackLink>

      <header className="mb-5 space-y-3 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {track && <TrackChip color={track.color}>{track.name}</TrackChip>}
          <span>Week {topic.week}</span>
          <span aria-hidden>·</span>
          <span>{LEVELS[topic.level]}</span>
          {topic.week === currentWeek && (
            <ToneBadge tone="primary" icon={CalendarClock}>This week</ToneBadge>
          )}
          {p.mastered ? (
            <ToneBadge tone="success" icon={Award}>Mastered</ToneBadge>
          ) : allTicked ? (
            <ToneBadge tone="success" icon={Check}>Studied</ToneBadge>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <StatusRing done={p.done} total={p.total} status={p.status} mastered={p.mastered} size={40} />
          <h1 className="min-w-0 text-xl font-semibold tracking-tight text-balance sm:text-2xl">{topic.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Progress value={p.total ? (p.done / p.total) * 100 : 0} aria-label={`${topic.title} progress`} className="h-2" />
          <span className="tabular shrink-0 font-mono text-sm text-muted-foreground">
            {p.done}/{p.total}
          </span>
        </div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Subtopics</CardTitle>
            <CardDescription>Tick each one once you can explain it. Practice runs a short quiz on just that subtopic.</CardDescription>
          </CardHeader>
          <CardContent>
            <TopicStudy items={items} notes={notes} lessons={lessons} nextId={nextId} designTemplate={topic.track === "hld"} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="size-4 text-primary" aria-hidden /> Topic quiz
              </CardTitle>
              <CardDescription>
                {p.mastered
                  ? `Mastered${topicMastery?.bestPct ? ` with a best of ${topicMastery.bestPct}%` : ""}. Retake it any time.`
                  : allTicked
                    ? `Score ${settings.topicMasteryPct}% or more to earn Mastered.`
                    : `Unlocks after ${p.total - p.done} more subtopic${p.total - p.done === 1 ? "" : "s"}.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {allTicked || p.mastered ? (
                <Button asChild className="h-10 w-full" variant={p.mastered ? "secondary" : "default"}>
                  <Link href={`/learn/practice?ref=${encodeURIComponent(topic.id)}`}>
                    <Award /> {p.mastered ? "Retake topic quiz" : "Take topic quiz"}
                  </Link>
                </Button>
              ) : (
                <>
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="size-3.5 shrink-0" aria-hidden /> Locked until every subtopic is ticked
                  </p>
                  {nextId && (
                    <Button asChild variant="outline" className="h-10 w-full">
                      <Link href={`/learn/practice?ref=${encodeURIComponent(nextId)}`}>
                        <Sparkles /> Practise the next subtopic
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {cases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="size-4 text-primary" aria-hidden /> Practice cases
                </CardTitle>
                <CardDescription>Interview-style walkthroughs for this topic.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="-mx-2 space-y-0.5">
                  {cases.map((c) => (
                    <li key={c.key}>
                      <Link
                        href={c.href}
                        className="group flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{c.title}</span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">{c.summary}</span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {topic.resources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Resources</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {topic.resources.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-9 max-w-full items-center gap-1 rounded-md border px-2.5 text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="truncate">{hostname(url)}</span>
                    <ExternalLink className="size-3 shrink-0" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <nav
        aria-label="Topics in this track"
        className="fixed inset-x-0 bottom-[calc(3.6rem+env(safe-area-inset-bottom))] z-30 grid grid-cols-2 gap-2 border-t bg-background/95 px-4 py-2 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none"
      >
        {prev ? (
          <LinkCard href={`/learn/${encodeURIComponent(prev.id)}`} className="min-h-11 min-w-0 gap-1.5 rounded-lg px-3 py-0 text-sm">
            <ChevronLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0">
              <span className="block text-2xs text-muted-foreground">Previous</span>
              <span className="block truncate font-medium">{prev.title}</span>
            </span>
          </LinkCard>
        ) : (
          <span />
        )}
        {next ? (
          <LinkCard href={`/learn/${encodeURIComponent(next.id)}`} className="min-h-11 min-w-0 justify-end gap-1.5 rounded-lg px-3 py-0 text-right text-sm">
            <span className="min-w-0">
              <span className="block text-2xs text-muted-foreground">Next</span>
              <span className="block truncate font-medium">{next.title}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </LinkCard>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
