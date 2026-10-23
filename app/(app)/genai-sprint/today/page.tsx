import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { problemBySlug } from "@/core/content/problems";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { TaskDetail } from "@/modules/genai-sprint/components/task-detail";
import { isTaskDone } from "@/modules/genai-sprint/domain/sprint";
import { getSprintState } from "@/modules/genai-sprint/services/progress";
import { linksForTask } from "@/modules/genai-sprint/services/task-links";

export const metadata: Metadata = { title: "GenAI sprint · Today" };

export default async function GenaiSprintTodayPage() {
  const state = await getSprintState();
  const task = state.next;

  return (
    <div className="space-y-6">
      <PageHeader icon={CalendarCheck} title="Today" description="The next unfinished sprint task in order (or your pinned week)." />
      {state.progress.pinnedBlockId && (
        <p className="text-sm text-muted-foreground">
          Pinned week: <span className="font-medium text-foreground">{state.progress.pinnedBlockId}</span>.{" "}
          <Link href="/genai-sprint/plan" className="text-primary underline-offset-4 hover:underline">
            Change in plan
          </Link>
        </p>
      )}
      {task ? (
        <TaskDetail
          task={task}
          done={isTaskDone(task.id, state.progress)}
          links={linksForTask(task.id)}
          problems={task.problems.map((p) => ({
            slug: p.slug,
            title: problemBySlug.get(p.slug)?.title ?? p.title,
            pattern: p.pattern,
            href: problemBySlug.has(p.slug) ? `/dsa/${p.slug}` : p.url,
            external: !problemBySlug.has(p.slug),
          }))}
        />
      ) : (
        <p className="text-sm text-muted-foreground">You finished every task in the pack.</p>
      )}
      <Button asChild variant="outline" size="sm">
        <Link href="/genai-sprint/plan">Full plan</Link>
      </Button>
    </div>
  );
}
