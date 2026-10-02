import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, Network } from "lucide-react";
import { LearnBrowser } from "@/components/learn/learn-browser";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
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
        icon={GraduationCap}
        description="Tick subtopics as you study, practise each one, then pass the topic quiz to earn Mastered."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/design">
            <Network /> System Design studio
          </Link>
        </Button>
      </PageHeader>
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
