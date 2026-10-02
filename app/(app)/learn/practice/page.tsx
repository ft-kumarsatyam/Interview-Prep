import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, Briefcase, Lock, Sparkles } from "lucide-react";
import { PracticeRunner, type NextStep } from "@/components/learn/practice-runner";
import { TrackChip } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { topicById, topics, trackById } from "@/lib/content";
import { CASE_QUIZ_SIZE } from "@/lib/domain/case-quiz";
import { SUBTOPIC_PRACTICE_SIZE, TOPIC_QUIZ_SIZE } from "@/lib/domain/mastery";
import { getMasteryMap } from "@/lib/services/mastery";
import { resolvePracticeTarget, topicQuizEligibility, type PracticeTarget } from "@/lib/services/practice";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Practice" };

const topicHref = (track: string, topicId: string) => `/learn?track=${encodeURIComponent(track)}#topic-${topicId}`;

/** Where to go after this run: the next subtopic, then the topic quiz, then the next topic in the track. */
function nextStepFor(target: PracticeTarget): NextStep | null {
  if (target.scope === "case") return null;
  const topic = topicById.get(target.topicId);
  if (!topic) return null;
  if (target.scope === "subtopic") {
    const index = Number(target.ref.split(":")[1]);
    const next = topic.subtopics[index + 1];
    if (next !== undefined) return { href: `/learn/practice?ref=${encodeURIComponent(`${topic.id}:${index + 1}`)}`, label: `Next: ${next}` };
    return { href: topicHref(topic.track, topic.id), label: "Tick all and take the topic quiz" };
  }
  const nextTopic = topics.filter((t) => t.track === topic.track && t.week > topic.week).sort((a, b) => a.week - b.week)[0];
  return nextTopic ? { href: topicHref(nextTopic.track, nextTopic.id), label: `Next topic: ${nextTopic.title}` } : null;
}

export default async function PracticePage({ searchParams }: PageProps<"/learn/practice">) {
  const { ref } = await searchParams;
  const target = typeof ref === "string" ? resolvePracticeTarget(ref) : null;
  if (!target) notFound();

  const [settings, mastery, eligibility] = await Promise.all([
    getSettings(),
    getMasteryMap(),
    target.scope === "topic" ? topicQuizEligibility(target) : Promise.resolve(null),
  ]);
  const m = mastery[target.ref];
  const trackInfo = trackById.get(target.track);
  const track = trackInfo?.name ?? target.track;
  const passPct = target.scope === "topic" ? settings.topicMasteryPct : settings.quizPassPct;
  const size = target.scope === "topic" ? TOPIC_QUIZ_SIZE : target.scope === "case" ? CASE_QUIZ_SIZE : SUBTOPIC_PRACTICE_SIZE;
  const back =
    target.scope === "case"
      ? { href: target.href ?? `/learn?track=${target.track}`, label: target.title }
      : { href: topicHref(target.track, target.topicId), label: target.scope === "subtopic" ? target.topicTitle : `${track} track` };

  return (
    <>
      <Link
        href={back.href}
        className="-ml-2 mb-3 inline-flex min-h-9 max-w-full items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ArrowLeft className="size-4 shrink-0" /> <span className="truncate">Back to {back.label}</span>
      </Link>
      <PageHeader
        icon={target.scope === "topic" ? Award : target.scope === "case" ? Briefcase : Sparkles}
        title={target.scope === "topic" ? `Topic quiz: ${target.title}` : target.scope === "case" ? `Case quiz: ${target.title}` : target.title}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {target.scope !== "case" && trackInfo && <TrackChip color={trackInfo.color}>{track}</TrackChip>}
            <span>
              {target.scope === "topic"
                ? m?.masteredOn
                  ? `Mastered on ${m.masteredOn} · best ${m.bestPct}%`
                  : `Pass ≥ ${settings.topicMasteryPct}% to earn the Mastered badge.`
                : target.scope === "case"
                  ? m?.attempts
                    ? `Best ${m.bestPct}% · ${m.attempts} run${m.attempts === 1 ? "" : "s"}`
                    : "Not attempted yet"
                  : `${target.topicTitle} · ${m?.attempts ? `mastery ${m.score}% after ${m.attempts} run${m.attempts === 1 ? "" : "s"}` : "not practised yet"}`}
            </span>
          </span>
        }
      />
      {eligibility && !eligibility.eligible ? (
        <EmptyState
          icon={Lock}
          title="Topic quiz locked"
          action={
            <Button asChild>
              <Link href={back.href}>Go to the checklist</Link>
            </Button>
          }
        >
          Tick every subtopic first ({eligibility.done}/{eligibility.total} done). Ticking never depends on this quiz, so your daily theory target stays reachable.
        </EmptyState>
      ) : (
        <PracticeRunner
          target={target.ref}
          scope={target.scope}
          passPct={passPct}
          size={size}
          bestPct={m?.attempts ? m.bestPct : null}
          back={back}
          next={nextStepFor(target)}
        />
      )}
    </>
  );
}
