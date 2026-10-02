import type { Metadata } from "next";
import { LearnBrowser } from "@/components/learn/learn-browser";
import { PageHeader } from "@/components/shared/page-header";
import { topics, tracks } from "@/lib/content";
import { planClock } from "@/lib/plan-clock";
import { getSubtopicProgressMap } from "@/lib/services/learn";
import { getMasteryMap } from "@/lib/services/mastery";
import { getSettings } from "@/lib/services/settings";

export const metadata: Metadata = { title: "Learn" };

export default async function LearnPage({ searchParams }: PageProps<"/learn">) {
  const { track } = await searchParams;
  const settings = await getSettings();
  const [progress, mastery] = await Promise.all([getSubtopicProgressMap(), getMasteryMap()]);
  const clock = planClock(settings);
  const currentTopic = topics.find((t) => t.week === Math.max(clock.week, 1));
  const initial =
    typeof track === "string" && tracks.some((t) => t.id === track) ? track : (currentTopic?.track ?? tracks[0].id);

  return (
    <>
      <PageHeader
        title="Learn"
        description="Zero → interview-ready, track by track. Tick subtopics as you study, practice each one, and pass the topic quiz to earn Mastered."
      />
      <LearnBrowser
        tracks={tracks}
        topics={topics}
        progress={progress}
        mastery={mastery}
        currentWeek={Math.max(clock.week, 1)}
        initialTrack={initial}
      />
    </>
  );
}
