import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { TrackChip } from "@/components/shared/badges";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { topics, tracks } from "@/lib/content";

export const metadata: Metadata = { title: "Learn" };

const LEVELS = ["", "Basics", "Intermediate", "Advanced", "Interview / Big-tech"];

export default async function LearnPage({ searchParams }: PageProps<"/learn">) {
  const { track } = await searchParams;
  const initial = typeof track === "string" && tracks.some((t) => t.id === track) ? track : tracks[0].id;

  return (
    <>
      <PageHeader title="Learn" description="Zero → interview-ready, track by track. Checklists and notes arrive in Phase 4." />
      <Tabs defaultValue={initial}>
        <TabsList className="h-auto flex-wrap justify-start">
          {tracks.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {tracks.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-4 grid gap-4 md:grid-cols-2">
            {topics
              .filter((topic) => topic.track === t.id)
              .sort((a, b) => a.week - b.week)
              .map((topic) => (
                <Card key={topic.id}>
                  <CardHeader className="gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <TrackChip color={t.color}>Week {topic.week}</TrackChip>
                      <span className="text-xs text-muted-foreground">{LEVELS[topic.level]}</span>
                    </div>
                    <CardTitle>{topic.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {topic.subtopics.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                    {topic.resources.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {topic.resources.map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                          >
                            {new URL(url).hostname.replace(/^www\./, "")}
                            <ExternalLink className="size-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
