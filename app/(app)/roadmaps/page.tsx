import type { Metadata } from "next";
import Link from "next/link";
import { Route } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ToneBadge } from "@/components/shared/tone-badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { allNodes } from "@/modules/roadmap/domain/roadmap";
import { JoinButton } from "@/modules/roadmap/components/roadmap-controls";
import { listRoadmaps } from "@/modules/roadmap/services/roadmap";

export const metadata: Metadata = { title: "Roadmaps" };

export default async function RoadmapsPage() {
  const items = await listRoadmaps();
  return (
    <>
      <PageHeader icon={Route} title="Roadmaps" description="Pick a path, join it, and follow the must-do nodes. A node ticks itself when you have ticked its topics, read its links, solved its problems and passed its quiz. This never affects your daily plan or streak." />
      <ul className="grid gap-4 md:grid-cols-2">
        {items.map(({ roadmap, joinedOn, progress }) => {
          const nodes = allNodes(roadmap);
          return (
            <li key={roadmap.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold">{roadmap.title}</h2>
                  {joinedOn && <ToneBadge tone="primary">Joined</ToneBadge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{roadmap.blurb}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {nodes.length} nodes · {nodes.reduce((s, n) => s + n.checklist.length, 0)} topics · {progress.must.total} must do · {progress.can.total} can do · {progress.skip.total} can skip
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={progress.pct} aria-label={`${roadmap.title} must-do progress`} className="h-2 max-w-xs" />
                <span className="tabular font-mono text-xs text-muted-foreground">
                  {progress.must.done}/{progress.must.total} must do
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant={joinedOn ? "default" : "outline"}>
                  <Link href={`/roadmaps/${roadmap.id}`}>{joinedOn ? "Continue" : "View roadmap"}</Link>
                </Button>
                <JoinButton roadmapId={roadmap.id} joined={!!joinedOn} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
