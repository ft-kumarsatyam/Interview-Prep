import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { PracticeRunner } from "@/components/learn/practice-runner";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { trackById } from "@/lib/content";
import { SUBTOPIC_PRACTICE_SIZE, TOPIC_QUIZ_SIZE } from "@/lib/domain/mastery";
import { getMasteryMap } from "@/lib/services/mastery";
import { resolvePracticeTarget, topicQuizEligibility } from "@/lib/services/practice";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Practice" };

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
  const track = trackById.get(target.track)?.name ?? target.track;
  const passPct = target.scope === "topic" ? settings.topicMasteryPct : settings.quizPassPct;

  return (
    <>
      <Link href={`/learn?track=${target.track}`} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {track}
      </Link>
      <PageHeader
        title={target.scope === "topic" ? `Topic quiz: ${target.title}` : target.title}
        description={
          target.scope === "topic"
            ? m?.masteredOn
              ? `Mastered on ${m.masteredOn} · best ${m.bestPct}%`
              : `Pass ≥ ${settings.topicMasteryPct}% to earn the Mastered badge.`
            : `${target.topicTitle} · ${m?.attempts ? `mastery ${m.score}% after ${m.attempts} run${m.attempts === 1 ? "" : "s"}` : "not practised yet"}`
        }
      />
      {eligibility && !eligibility.eligible ? (
        <EmptyState icon={Lock} title="Topic quiz locked">
          Tick every subtopic first ({eligibility.done}/{eligibility.total} done). Ticking never depends on this quiz, so your daily theory target stays reachable.
        </EmptyState>
      ) : (
        <PracticeRunner
          target={target.ref}
          scope={target.scope}
          passPct={passPct}
          size={target.scope === "topic" ? TOPIC_QUIZ_SIZE : SUBTOPIC_PRACTICE_SIZE}
        />
      )}
    </>
  );
}
