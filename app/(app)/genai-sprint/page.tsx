import type { Metadata } from "next";
import Link from "next/link";
import { Bot, GraduationCap, Route } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { genaiPrepPlan } from "@/core/genai-prep-pack";
import { blockProgress } from "@/modules/genai-sprint/domain/sprint";
import { getSprintState } from "@/modules/genai-sprint/services/progress";

export const metadata: Metadata = { title: "GenAI sprint" };

export default async function GenaiSprintOverviewPage() {
  const state = await getSprintState();
  const { overall, next, progress } = state;

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Bot}
        title="GenAI sprint"
        description="45-day interview prep pack: DSA, learn, build, drill and review. Progress here never changes your daily plan or streak."
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Overall</span>
          <span className="font-mono tabular">
            {overall.done}/{overall.total} tasks · {overall.hoursDone.toFixed(1)}/{overall.hoursTotal}h
          </span>
        </div>
        <Progress value={overall.pct} aria-label="Sprint progress" className="h-2" />
      </div>
      {next ? (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Up next</p>
          <p className="mt-1 text-sm font-medium">{next.text}</p>
          <Button asChild className="mt-3" size="sm">
            <Link href="/genai-sprint/today">Open today&apos;s task</Link>
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">All sprint tasks complete.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/courses/genai">
            <GraduationCap className="size-4" aria-hidden />
            GenAI course
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/roadmaps/ai-engineer">
            <Route className="size-4" aria-hidden />
            AI Engineer roadmap
          </Link>
        </Button>
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Blocks</h2>
        <ul className="space-y-2">
          {genaiPrepPlan.blocks.map((block) => {
            const bp = blockProgress(block, progress);
            const pct = bp.total ? Math.round((bp.done / bp.total) * 100) : 0;
            return (
              <li key={block.id} className="rounded-md border px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/genai-sprint/plan#${block.id}`} className="font-medium hover:text-primary">
                    {block.title}
                  </Link>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground tabular">
                    {bp.done}/{bp.total}
                  </span>
                </div>
                <Progress value={pct} className="mt-2 h-1" aria-label={`${block.title} progress`} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
