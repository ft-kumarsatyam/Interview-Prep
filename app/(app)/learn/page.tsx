import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Network } from "lucide-react";
import { LearnIndex, type TopicRow } from "@/components/learn/learn-index";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { orderedTopics, topics, tracks } from "@/lib/content";
import { continueTarget, topicProgress } from "@/lib/domain/learn";
import { planClock } from "@/lib/plan-clock";
import { getSubtopicProgressMap } from "@/lib/services/learn";
import { getMasteryMap } from "@/lib/services/mastery";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Learn" };

export default async function LearnPage({ searchParams }: PageProps<"/learn">) {
  const { track } = await searchParams;
  const settings = await getSettings();
  const [progress, mastery] = await Promise.all([getSubtopicProgressMap(), getMasteryMap()]);
  const currentWeek = Math.max(planClock(settings).week, 1);

  const isDone = (id: string) => !!progress[id];
  const isMastered = (topicId: string) => !!mastery[topicId]?.masteredOn;
  const rows: TopicRow[] = topics.map((t) => {
    const p = topicProgress(t, isDone, isMastered(t.id));
    return {
      id: t.id,
      track: t.track,
      week: t.week,
      level: t.level,
      title: t.title,
      subtopics: t.subtopics,
      done: p.done,
      total: p.total,
      status: p.status,
      mastered: p.mastered,
      nextTitle: p.next === null ? null : (t.subtopics[p.next] ?? null),
    };
  });

  const lastTouched = new Map<string, string>();
  for (const [id, row] of Object.entries(progress)) {
    const topicId = id.slice(0, id.lastIndexOf(":"));
    if (row.doneOn > (lastTouched.get(topicId) ?? "")) lastTouched.set(topicId, row.doneOn);
  }
  const next = continueTarget({ topics: orderedTopics(), isDone, isMastered, lastTouched: (id) => lastTouched.get(id) ?? null, currentWeek });

  const thisWeek = topics.find((t) => t.week === currentWeek);
  const initial =
    typeof track === "string" && tracks.some((t) => t.id === track) ? track : (next?.topic.track ?? thisWeek?.track ?? tracks[0].id);

  return (
    <>
      <PageHeader title="Learn" icon={GraduationCap} description="Pick a topic, tick subtopics as you study, then pass the topic quiz to earn Mastered.">
        <Button asChild variant="outline" size="sm">
          <Link href="/design">
            <Network /> System Design studio
          </Link>
        </Button>
      </PageHeader>
      <LearnIndex
        tracks={tracks}
        rows={rows}
        continueCard={next ? { topicId: next.topic.id, reason: next.reason } : null}
        currentWeek={currentWeek}
        initialTrack={initial}
      />
    </>
  );
}
