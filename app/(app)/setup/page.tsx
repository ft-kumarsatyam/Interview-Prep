import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { SetupChecklistView } from "@/components/setup/setup-checklist";
import { Progress } from "@/components/ui/progress";
import { currentSession } from "@/lib/auth/dal";
import { getSetupChecklist } from "@/lib/services/setup";

export const metadata: Metadata = { title: "Setup" };

export default async function SetupPage() {
  const session = await currentSession();
  const checklist = await getSetupChecklist({ live: true, remember: session.remember });
  const pct = Math.round((checklist.done / checklist.total) * 100);

  return (
    <>
      <PageHeader
        title="Setup"
        description="Everything PrepOS needs to run on its own: content, LeetCode, daily jobs, reminders, backups and your phone."
      />
      <div className="mb-6 space-y-2 rounded-xl border bg-card p-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">
            {checklist.done}/{checklist.total} done
          </span>
          <span className="text-muted-foreground">
            {checklist.requiredLeft === 0 ? "All essentials are set up" : `${checklist.requiredLeft} essential item${checklist.requiredLeft === 1 ? "" : "s"} left`}
          </span>
        </div>
        <Progress value={pct} aria-label={`Setup ${pct}% done`} />
        <p className="text-xs text-muted-foreground">
          Plan dates, pass marks and keywords live in <Link href="/settings" className="underline underline-offset-2">Settings</Link>.
        </p>
      </div>
      <SetupChecklistView items={checklist.items} />
    </>
  );
}
