import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Settings, Wrench } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SetupChecklistView } from "@/components/setup/setup-checklist";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { currentSession } from "@/lib/auth/dal";
import { getSetupChecklist } from "@/lib/services/setup";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Setup" };

export default async function SetupPage() {
  const session = await currentSession();
  const checklist = await getSetupChecklist({ live: true, remember: session.remember });
  const pct = Math.round((checklist.done / checklist.total) * 100);
  const complete = checklist.requiredLeft === 0;
  const open = checklist.items.filter((i) => i.status !== "ok");
  const next = open.find((i) => i.required) ?? open[0];

  return (
    <>
      <PageHeader
        title="Setup"
        icon={Wrench}
        description="Everything PrepOS needs to run on its own: content, LeetCode, daily jobs, reminders, backups and your phone."
      >
        <Button asChild variant="outline" className="h-9">
          <Link href="/settings">
            <Settings aria-hidden /> Settings
          </Link>
        </Button>
      </PageHeader>

      <div className="mb-6 rounded-xl border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "grid size-14 shrink-0 place-items-center rounded-xl font-mono text-lg font-semibold tabular-nums",
              complete ? "bg-success/12 text-success" : "bg-primary/10 text-primary",
            )}
          >
            {pct}%
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="font-medium">
                {checklist.done} of {checklist.total} done
              </p>
              <p className={cn("inline-flex items-center gap-1 text-sm", complete ? "text-success" : "text-muted-foreground")}>
                {complete && <CheckCircle2 className="size-4" aria-hidden />}
                {complete ? "All essentials set up" : `${checklist.requiredLeft} essential item${checklist.requiredLeft === 1 ? "" : "s"} left`}
              </p>
            </div>
            <Progress value={pct} aria-label={`Setup ${pct}% done`} className={cn("h-1.5", complete && "[&>[data-slot=progress-indicator]]:bg-success")} />
          </div>
        </div>
        {next && (
          <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-sm">
              <span className="text-muted-foreground">Next up: </span>
              <span className="font-medium">{next.title}</span>
            </p>
            <Button asChild size="sm" className="h-9 self-start sm:self-auto">
              <a href={`#setup-${next.id}`}>
                Go to it <ArrowRight aria-hidden />
              </a>
            </Button>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Plan dates, pass marks and keywords live in{" "}
          <Link href="/settings" className="underline underline-offset-2 hover:text-foreground">
            Settings
          </Link>
          .
        </p>
      </div>

      <SetupChecklistView items={checklist.items} />
    </>
  );
}
