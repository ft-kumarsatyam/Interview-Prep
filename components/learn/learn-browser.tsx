"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, ExternalLink, NotebookPen, Sparkles } from "lucide-react";
import { updateSubtopicNotes } from "@/app/(app)/dashboard/actions";
import { SubtopicChecklist } from "@/components/progress/subtopic-checklist";
import { TrackChip } from "@/components/shared/badges";
import { MarkdownNotes } from "@/components/shared/markdown-notes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ContentTopic, ContentTrack } from "@/lib/content";
import type { SubtopicProgressSummary } from "@/lib/services/learn";
import { cn } from "@/lib/utils";

const LEVELS = ["", "Basics", "Intermediate", "Advanced", "Interview / Big-tech"];

const DESIGN_TEMPLATE = `## Requirements
- Functional:
- Non-functional (scale, latency, availability):

## Estimates
- QPS / storage / bandwidth:

## API

## Data model

## High-level design

## Deep dives

## Trade-offs`;

export interface MasteryView {
  score: number;
  bestPct: number;
  attempts: number;
  masteredOn: string | null;
}

export function LearnBrowser({
  tracks,
  topics,
  progress,
  mastery,
  currentWeek,
  initialTrack,
}: {
  tracks: ContentTrack[];
  topics: ContentTopic[];
  progress: Record<string, SubtopicProgressSummary>;
  mastery: Record<string, MasteryView>;
  currentWeek: number;
  initialTrack: string;
}) {
  return (
    <Tabs defaultValue={initialTrack}>
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
              <TopicCard key={topic.id} topic={topic} track={t} progress={progress} mastery={mastery} current={topic.week === currentWeek} />
            ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function TopicCard({
  topic,
  track,
  progress,
  mastery,
  current,
}: {
  topic: ContentTopic;
  track: ContentTrack;
  progress: Record<string, SubtopicProgressSummary>;
  mastery: Record<string, MasteryView>;
  current: boolean;
}) {
  const [openNotes, setOpenNotes] = useState<string | null>(null);
  const items = topic.subtopics.map((title, i) => {
    const id = `${topic.id}:${i}`;
    const sub = mastery[id];
    return {
      id,
      title,
      done: !!progress[id],
      meta: sub?.attempts ? `practice ${sub.score}% · ${sub.attempts} run${sub.attempts === 1 ? "" : "s"}` : undefined,
    };
  });
  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;
  const topicMastery = mastery[topic.id];
  const mastered = !!topicMastery?.masteredOn;

  return (
    <Card className={cn(current && "border-primary ring-1 ring-primary/30")}>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <TrackChip color={track.color}>Week {topic.week}</TrackChip>
          <span className="text-xs text-muted-foreground">{LEVELS[topic.level]}</span>
          {current && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">This week</span>}
          {mastered && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
              <Award className="size-3" /> Mastered
            </span>
          )}
        </div>
        <CardTitle>{topic.title}</CardTitle>
        <div className="flex items-center gap-3">
          <Progress value={(doneCount / items.length) * 100} aria-label={`${topic.title} progress`} />
          <span className="tabular shrink-0 font-mono text-xs text-muted-foreground">
            {doneCount}/{items.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <SubtopicChecklist
          items={items}
          renderExtra={(item) => (
            <div className="mt-1 ml-7 flex flex-wrap items-center gap-2">
              <Link href={`/learn/practice?ref=${encodeURIComponent(item.id)}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Sparkles className="size-3" /> Practice
              </Link>
              {item.done && (
                <button
                  type="button"
                  onClick={() => setOpenNotes(openNotes === item.id ? null : item.id)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  aria-expanded={openNotes === item.id}
                >
                  <NotebookPen className="size-3" /> {progress[item.id]?.notes ? "Notes" : "Add notes"}
                </button>
              )}
              {item.done && openNotes === item.id && (
                <div className="w-full pt-1">
                  <MarkdownNotes
                    compact
                    initial={progress[item.id]?.notes ?? ""}
                    onSave={(notes) => updateSubtopicNotes({ id: item.id, notes })}
                    template={track.id === "hld" ? { label: "Design template", text: DESIGN_TEMPLATE } : undefined}
                  />
                </div>
              )}
            </div>
          )}
        />
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          {allDone || mastered ? (
            <Button size="sm" variant={mastered ? "secondary" : "default"} asChild>
              <Link href={`/learn/practice?ref=${encodeURIComponent(topic.id)}`}>
                <Award /> {mastered ? `Retake topic quiz (best ${topicMastery.bestPct}%)` : "Take topic quiz"}
              </Link>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Tick every subtopic to unlock the topic quiz.</span>
          )}
        </div>
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
  );
}
